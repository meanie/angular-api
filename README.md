# meanie-angular-api

[![npm version](https://img.shields.io/npm/v/meanie-angular-api.svg)](https://www.npmjs.com/package/meanie-angular-api)
[![node dependencies](https://david-dm.org/meanie/angular-api.svg)](https://david-dm.org/meanie/angular-api)
[![github issues](https://img.shields.io/github/issues/meanie/angular-api.svg)](https://github.com/meanie/angular-api/issues)
[![codacy](https://img.shields.io/codacy/b747cecb5c144b9ba982c5f63d5798a5.svg)](https://www.codacy.com/app/meanie/angular-api)
[![Join the chat at https://gitter.im/meanie/meanie](https://img.shields.io/badge/gitter-join%20chat%20%E2%86%92-brightgreen.svg)](https://gitter.im/meanie/meanie?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

An Angular service for interaction with API's

## Installation

You can install this package using `npm` or `bower`.

### npm

```shell
npm install meanie-angular-api --save
```

Include the script `node_modules/meanie-angular-api/release/meanie-angular-api.js` in your build process, or add it via a `<script>` tag to your `index.html`:

```html
<script src="node_modules/meanie-angular-api/release/meanie-angular-api.js"></script>
```

Add `Api.Service` as a dependency for your app.

### bower

```shell
bower install meanie-angular-api
```

Include the script `bower_components/meanie-angular-api/release/meanie-angular-api.js` in your build process, or add it via a `<script>` tag to your `index.html`:

```html
<script src="bower_components/meanie-angular-api/release/meanie-angular-api.js"></script>
```

Add `Api.Service` as a dependency for your app.

## Configuration

```js
angular.module('App', [
  'Api.Service'
]).config(function($apiProvider, App) {

  //Set API wide base URL
  //Defaults to /
  $apiProvider.setBaseUrl(App.api.baseUrl);

  //Set the default actions for each endpoint, or empty for none
  //Defaults as given here:
  $apiProvider.setDefaultActions({
    query: {
      method: 'GET',
      isArray: true,
      isModel: true
    },
    get: {
      method: 'GET',
      isModel: true
    },
    create: {
      method: 'POST'
    },
    update: {
      method: 'PUT'
    },
    delete: {
      method: 'DELETE'
    }
  });

  //Set the default params for each endpoint, or empty for none
  //Defaults as given here:
  $apiProvider.setDefaultParams({
    id: '@id'
  });

  //Set the default model to use for each endpoint
  //Defaults to none
  $apiProvider.setDefaultModel('BaseModel');

  //Strip trailing slashes behavior
  //Defaults to true
  $apiProvider.stripTrailingSlashes(false);
});
```

## Registering endpoints

Register new endpoints in the config function of your modules, for example:

```js
angular.module('App.Users').config(function($apiProvider) {
  $apiProvider.registerEndpoint('users', {
    model: 'User',
    actions: {
      me: {
        url: 'me/',
        isModel: true
      },
      create: {
        method: 'POST'
      },
      update: {
        method: 'PUT'
      },
      exists: {
        method: 'POST',
        url: 'exists/'
      }
    }
  });
});
```

### Endpoint configuration

Available options for endpoint configuration are:

#### baseUrl [string]
The base URL defaults to the API base URL, but you can specify a different base URL for a specific endpoint, for example if connecting to a 3rd party URL.

#### url [string]
The url part of an endpoint defaults to its name, but you can override it by specifying a custom url.

#### model [string]
Name of the service to use for JSON to model conversion.

#### actions [object]
A hash of actions with the action name/accessor as keys and the action config as values.

### Action configuration
Action specific configuration will override global endpoint configuration. Available action configuration options are listed below. Any additional/unknown configuration options that you supply will be passed on to the `$http` service when doing the actual request.

#### url [string]
The url part of an action defaults to `/`, but you can specify a different URL. It will be concatenated to the endpoint URL.

#### method [string]
Specify the action HTTP request method, defaults to `GET`.

#### model [string]
Name of the service to use for JSON to model conversion.

#### isArray [bool]
Specify whether the action expects an array as a response, defaults to `false`.

#### isModel [bool]
Specify whether the received JSON data should be converted to a model, defaults to `false`. When `isArray` is `true`, it will convert each object in the array to a model.

#### successInterceptor [function]
Specify a custom success response interceptor for the action.

#### errorInterceptor [function]
Specify a custom error response interceptor for the action.

## Define custom models

You can create custom models and expose API actions from within them. It is recommended to use the supplied `$baseModel` service as a base for your own models, as it comes with handy to/from JSON converters.

```javascript
/**
 * Module definition and dependencies
 */
angular.module('App.User.Model', [
  'Api.Service',
  'BaseModel.Service'
])

/**
 * Model definition
 */
.factory('User', function($api, $baseModel) {

  //Default data
  let defaultData = {
    name: 'Guest'
  };

  /**
   * Constructor
   */
  function User(data) {
    $baseModel.call(this, data);
  }

  /**
   * Extend prototype
   */
  angular.extend(User.prototype, $baseModel.prototype);

  /**
   * Save user
   */
  User.prototype.save = function(data) {

    //Extend instance data with optionally given extra data
    data = this.toJSON(data);

    //Determine method and call API
    let self = this;
    let method = this.id ? 'update' : 'create';
    return $api.user[method](data).then(data => self.fromJSON(data));
  };

  //Return
  return User;
});
```

## Usage

```js
//The endpoints return promises which resolve into models
let users = $api.users.query(); //An array of UserModel instances

//You can also interact with the model and modify it before resolving
let user = $api.users.create({name: 'Meanie'}).then(user => {
  user.doSomething();
});

//Interact with exposed API actions through the model methods
let myUser = new User({
  name: 'Meanie'
});
myUser.save().then(user => {
  myUser === user; //User and myUser are the same class instance
});

```

## Issues & feature requests

Please report any bugs, issues, suggestions and feature requests in the [meanie-angular-api issue tracker](https://github.com/meanie/angular-api/issues).

## Contributing

Pull requests are welcome! Please create them against the [dev branch](https://github.com/meanie/angular-api/tree/dev) of the repository.

If you would like to contribute to Meanie, please check out the [Meanie contributing guidelines](https://github.com/meanie/meanie/blob/master/CONTRIBUTING.md).

## License
(MIT License)

Copyright 2015-2016, [Adam Buczynski](http://adambuczynski.com)
