# Meanie - Angular API

[![npm version](https://img.shields.io/npm/v/meanie-angular-api.svg)](https://www.npmjs.com/package/meanie-angular-api)
[![node dependencies](https://david-dm.org/meanie/angular-api.svg)](https://david-dm.org/meanie/angular-api)
[![github issues](https://img.shields.io/github/issues/meanie/angular-api.svg)](https://github.com/meanie/angular-api/issues)
[![codacy](https://img.shields.io/codacy/b747cecb5c144b9ba982c5f63d5798a5.svg)](https://www.codacy.com/app/meanie/angular-api)
[![Join the chat at https://gitter.im/meanie/meanie](https://img.shields.io/badge/gitter-join%20chat%20%E2%86%92-brightgreen.svg)](https://gitter.im/meanie/meanie?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

An Angular service to add easy to use and fully configurable API interaction for [Meanie](https://github.com/meanie/meanie) projects.

## Installation
Install using the [Meanie CLI](https://www.npmjs.com/package/meanie):
```shell
meanie install angular-api
```

## Configuration
Include the service as a dependency:
```js
angular.module('App.MyModule', [
  'Api.Service'
]);
```
Configure the API:
```js
angular.module('App').config(function($apiProvider, App) {

  //Set API wide base URL
  //Defaults to /
  $apiProvider.setBaseUrl(App.api.baseUrl);

  //Set the default actions for each endpoint, or empty for none
  //Defaults as given here:
  $apiProvider.setDefaultActions({
    query: {
      method: 'GET',
      isArray: true
    },
    get: {
      method: 'GET'
    },
    create: {
      method: 'POST'
    },
    update: {
      method: 'PUT'
    },
    destroy: {
      method: 'DELETE'
    }
  });

  //Set the default params for each endpoint, or empty for none
  //Defaults as given here:
  $apiProvider.setDefaultParams({
    id: '@id'
  });

  //Set the default model to use for each endpoint, or empty for none
  //Defaults to $apiModel
  $apiProvider.setDefaultModel('MyModel');

  //Strip trailing slashes behaviour
  //Defaults to true
  $apiProvider.stripTrailingSlashes(false);
});
```
## Registering endpoints
Register new endpoints in the config function of your modules, for example:
```js
angular.module('App.Users').config(function($apiProvider) {

  //Users endpoint
  $apiProvider.registerEndpoint('users', {
    model: 'UserModel',
    actions: {
      me: {
        url: 'me/'
      },
      create: {
        method: 'POST'
      },
      update: {
        method: 'PUT'
      },
      exists: {
        method: 'POST',
        url: 'exists/',
        model: false
      }
    }
  });
});
```
### Endpoint configuration
Available options for endpoint configuration are:
#### baseUrl <string>, optional
The base URL defaults to the API base URL, but you can specify a different base URL for a specific endpoint, for example if connecting to a 3rd party URL.

#### url <string>, optional
The url part of an endpoint defaults to its name, but you can override it by specifying a custom url .

#### model <string | bool>, optional
You can specify a custom default model per endpoint, or set it to `false` to not use model wrapping for the endpoint.

#### actions <object>, optional
A hash of actions with the action name/accessor as keys and the action config as values.

### Action configuration
Action specific configuration will override global endpoint configuration. Available action configuration options are listed below. Any additional/unknown configuration options that you supply will be passed on to the `$http` service when doing the actual request.

#### url <string>, optional
The url part of an action defaults to `/`, but you can specify a different URL. It will be concatenated to the endpoint URL.

#### model <string | bool>, optional
You can use a custom model or disable model wrapping for a specific action.

#### method <string>, optional
Specify the action HTTP request method, defaults to `GET`.

#### isArray <bool>, optional
Specify whether the action expects an array as a response, defaults to `false`.

#### successInterceptor <function>, optional
Specify a custom success response interceptor for the action.

#### errorInterceptor <function>, optional
Specify a custom error response interceptor for the action.

## Usage
Use it in your modules:
```js
//The endpoints return promises which resolve into models
var users = $api.users.query(); //An array of UserModel instances

//You can also interact with the model and modify it before resolving
var user = $api.users.create({name: 'Meanie'}).then(function(user) {
  user.doSomething();
});
```

## Issues & feature requests
Please report any bugs, issues, suggestions and feature requests in the appropriate issue tracker:
* [Module issue tracker](https://github.com/meanie/angular-api/issues)
* [Meanie Boilerplate issue tracker](https://github.com/meanie/boilerplate/issues)
* [Meanie CLI issue tracker](https://github.com/meanie/meanie/issues)

## Contributing
If you would like to contribute to Meanie, please check out the [Meanie contributing guidelines](https://github.com/meanie/meanie/blob/master/CONTRIBUTING.md).

## License
(MIT License)

Copyright 2015, [Adam Buczynski](http://adambuczynski.com)
