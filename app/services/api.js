'use strict';

var module = angular.module('fxe.services.api', []);

// module.constant('baseURL', 'http://0.0.0.0:8000/api');
module.constant('baseURL', 'http://dev17.nexgen.cz/api/v2');
// module.constant('baseURL', 'http://private-855a4-fxe.apiary-mock.com');
// module.constant('baseURL', 'http://www.fxe-gear.com/api/v1');

module.config(function ($httpProvider) {

  // add auth token if not explicitly requested to be anonymous
  $httpProvider.interceptors.push(function(tokenService) {
    return {
      'request': function(config) {
        var token = tokenService.getJumpingToken();
        if (config.anonymous !== true && token.token) {
          config.headers.Authorization = 'Bearer ' + token.token;
        }
        return config;
      }
    };
  });

});

module.service('apiService', function ($http, baseURL) {

  var filterParams = function (params, possibleParams) {
    params = params || {};

    angular.forEach(params, function (key) {
      if (possibleParams.indexOf(key) == -1) delete params[key];
    });

    return params;
  };

  // users =============================================

  var loginJumping = function (email, password) {
    return $http.post(baseURL + '/login/jumping', {
      email: email,
      password: password
    }, {
      anonymous: true
    });
  };

  var loginFacebook = function (accessToken, expiresIn) {
    return $http.post(baseURL + '/login/facebook', {
      accessToken: accessToken,
      expiresIn: expiresIn
    }, {
      anonymous: true
    });
  };

  var loginGoogle = function (idToken, serverAuthCode) {
    return $http.post(baseURL + '/login/google', {
      idToken: idToken,
      serverAuthCode: serverAuthCode
    }, {
      anonymous: true
    });
  };

  var logout = function () {
    return $http.post(baseURL + '/logout');
  };

  var createUser = function (user) {
    user = filterParams(user, ['email', 'password', 'name', 'weight', 'age', 'gender', 'units', 'language']);
    return $http.post(baseURL + '/user', user, {
      anonymous: true
    });
  };

  var getUser = function () {
    return $http.get(baseURL + '/user');
  };

  var updateUser = function (partialUserObj) {
    return $http.patch(baseURL + '/user', partialUserObj);
  };

  var resetPassword = function (email) {
    return $http.post(baseURL + '/user/resetPassword', {
      email: email
    }, {
      anonymous: true
    });
  };

  // lessons =============================================

  var getLessons = function (params) {
    return $http.get(baseURL + '/lessons', {
      params: filterParams(params, ['maxResults', 'syncToken', 'pageToken', 'fields'])
    });
  };

  var uploadLesson = function (lesson) {
    return $http.post(baseURL + '/lesson', lesson);
  };

  var getLesson = function (start) {
    return $http.get(baseURL + '/lesson/' + start);
  };

  var deleteLesson = function (start) {
    return $http.delete(baseURL + '/lesson/' + start);
  };

  // events =============================================

  var getEvents = function (sport, params) {
    var possible = ['maxResults', 'name', 'locationName', 'latitude', 'longitude', 'accuracy', 'pageToken'];
    params = filterParams(params, possible);
    params.sport = sport;

    return $http.get(baseURL + '/events', {
      params: params
    });
  };

  var getEvent = function (id) {
    return $http.get(baseURL + '/event/' + id);
  };

  // friends =============================================

  var getFriends = function (sport, params) {
    params = filterParams(params, ['fields', 'pageToken']);
    params.sport = sport;

    return $http.get(baseURL + '/friends', {
      params: params
    });
  };

  // firmwares =============================================

  var getLatestFirmware = function (device, app) {
    device = device.toLowerCase().replace(/:/g, '-');

    return $http.get(baseURL + '/firmware/latest', {
      params: {
        device: device,
        app: app
      }
    });
  };

  // logging =============================================

  var log = function (data) {
    return $http.post(baseURL + '/log', data);
  };

  // service public API =============================================

  this.loginJumping = loginJumping;
  this.loginFacebook = loginFacebook;
  this.loginGoogle = loginGoogle;
  this.logout = logout;
  this.createUser = createUser;
  this.getUser = getUser;
  this.updateUser = updateUser;
  this.resetPassword = resetPassword;
  this.getLessons = getLessons;
  this.getLesson = getLesson;
  this.uploadLesson = uploadLesson;
  this.deleteLesson = deleteLesson;
  this.getEvents = getEvents;
  this.getEvent = getEvent;
  this.getFriends = getFriends;
  this.getLatestFirmware = getLatestFirmware;
  this.log = log;

});

