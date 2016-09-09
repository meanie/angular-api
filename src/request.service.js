
/**
 * Module definition and dependencies
 */
angular.module('Api.Request.Service', [
  'Url.Service',
])

/**
 * Factory definition
 */
.factory('$apiRequest', function $apiRequest($http, $url) {

  /**
   * Check if dotted path is valid
   */
  function isValidDottedPath(path) {
    return (
      path && path !== 'hasOwnProperty' &&
      /^(\.[a-zA-Z_$@][0-9a-zA-Z_$@]*)+$/.test('.' + path)
    );
  }

  /**
   * Lookup dotted path in an object
   */
  function lookupDottedPath(obj, path) {

    //Check if valid
    if (!isValidDottedPath(path)) {
      throw new Error('Invalid dotted path:' + path);
    }

    //Split path in object keys to traverse
    let keys = path.split('.');
    for (let i = 0; i < keys.length && obj !== undefined; i++) {
      let key = keys[i];
      obj = (obj !== null) ? obj[key] : undefined;
    }

    //Return reference
    return obj;
  }

  /**
   * Combine given params with extracted params from data
   */
  function combineParams(actionParams, givenParams, data) {

    //Extract data params from action params
    let extractedParams = {};
    angular.forEach(actionParams || {}, (value, key) => {

      //Function? Call now
      if (angular.isFunction(value)) {
        value = value();
      }

      //String value with @ identifier? Look up in data
      if (angular.isString(value) && value.charAt(0) === '@') {
        value = lookupDottedPath(data, value.substr(1));
      }

      //Set value
      extractedParams[key] = value;
    });

    //Extend with given params
    return angular.extend(extractedParams, givenParams || {});
  }

  /**
   * Find URL params
   */
  function findUrlParams(url) {
    let urlParams = {};
    angular.forEach(url.split(/\W/), param => {

      //Filter hasOwnProperty
      if (param === 'hasOwnProperty') {
        throw new Error('Invalid parameter name: hasOwnProperty');
      }

      //Find all valid url params (have value, non digit)
      if (param && !(/^\\d+$/.test(param))) {
        if (new RegExp('(^|[^\\\\]):' + param + '(\\W|$)').test(url)) {
          urlParams[param] = true;
        }
      }
    });
    return urlParams;
  }

  /**
   * Clean up URL
   */
  function cleanUpUrl(url, stripTrailingSlashes) {

    //Strip trailing slashes if needed
    if (stripTrailingSlashes) {
      url = url.replace(/\/+$/, '') || '/';
    }

    //Replace collapsed `/.` if found in the last URL path segment before
    //the query, e.g. `http://url.com/id./format?q=x` becomes
    //`http://url.com/id.format?q=x`
    return url
      .replace(/\/\.(?=\w+($|\?))/, '.')
      .replace(/\/\\\./, '/.');
  }

  /**
   * Parse URL
   */
  function parseUrl(url, params, urlParams, stripTrailingSlashes) {

    //Replace escaped \:
    url = url.replace(/\\:/g, ':');

    //Loop the valid URL params now
    angular.forEach(urlParams, (t, urlParam) => {

      //Extract value for this url param from given params
      let val = params.hasOwnProperty(urlParam) ? params[urlParam] : null;
      let regex;

      //If defined and not null, encode it and replace in URL
      if (angular.isDefined(val) && val !== null) {
        let encodedVal = $url.encodeUriSegment(val);
        regex = new RegExp(':' + urlParam + '(\\W|$)', 'g');
        url = url.replace(regex, (match, tail) => {
          return encodedVal + tail;
        });
      }

      //Otherwise, remove from URL
      else {
        regex = new RegExp('(\/?):' + urlParam + '(\\W|$)', 'g');
        url = url.replace(regex, (match, leadingSlashes, tail) => {
          if (tail.charAt(0) === '/') {
            return tail;
          }
          else {
            return leadingSlashes + tail;
          }
        });
      }
    });

    //Return cleaned up URL
    return cleanUpUrl(url, stripTrailingSlashes);
  }

  /**
   * Create request config
   */
  function createRequestConfig(action, params, data) {

    //Initialize
    let request = {};
    let stripConfigKeys = [
      'params', 'model', 'isArray', 'isModel',
      'successInterceptor', 'errorInterceptor',
      'stripTrailingSlashes',
    ];

    //Map action config to http request config
    angular.forEach(action, (value, key) => {
      if (stripConfigKeys.indexOf(key) === -1) {
        request[key] = angular.copy(value);
      }
    });

    //Append data if we have a body
    if (action.hasBody() && data && angular.isObject(data)) {
      if (angular.isFunction(data.toJSON)) {
        request.data = data.toJSON();
      }
      else if (angular.isArray(data)) {
        request.data = data;
      }
      else {
        request.data = angular.extend({}, data);
      }
    }

    //Ensure we don't overwrite the params objects keys in place
    params = angular.copy(params);

    //Process params
    if (params && angular.isObject(params)) {
      for (let key in params) {
        if (params.hasOwnProperty(key) && angular.isObject(params[key])) {
          if (angular.isFunction(params[key].toJSON)) {
            params[key] = params[key].toJSON();
          }
        }
      }
    }

    //Combine params out of given params and data and find URL params
    params = combineParams(action.params, params, data);
    let urlParams = findUrlParams(request.url);

    //Parse URL
    request.url = parseUrl(
      action.url, params, urlParams, action.stripTrailingSlashes);

    //Set remaining given non-url params as query params,
    //delegate param encoding to $http
    angular.forEach(params, (value, key) => {
      if (!urlParams[key]) {
        request.params = request.params || {};
        request.params[key] = value;
      }
    });

    //Return
    return request;
  }

  /**
   * Api request executer
   */
  return function ApiRequest(action, params, data) {

    //Parameter juggling
    if (action.hasBody() && params && !data) {
      data = params;
      params = null;
    }

    //Create request config and use $http to do the request
    //and intercept the response
    let request = createRequestConfig(action, params, data);
    let promise = $http(request).then(
      action.successInterceptor.bind(action),
      action.errorInterceptor.bind(action)
    );

    //Then handle the raw data
    return promise.then(raw => {
      if (action.expectsModel()) {
        return action.convertToModel(raw);
      }
      return raw;
    });
  };
});
