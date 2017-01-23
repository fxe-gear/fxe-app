'use strict';

var module = angular.module('fxe.services.api', []);

module.constant('baseURL', 'http://dev17.nexgen.cz/api/v1');
// module.constant('baseURL', 'http://private-855a4-fxe.apiary-mock.com');

module.service('apiService', function ($http, storeService, baseURL) {

  var user = storeService.getUser();

  var request = function (config) {
    // add auth token if not explicitly requested to be anonymous
    config.headers = config.headers || {};
    if (config.anonymous !== true) {
      config.headers.Authorization = 'Bearer ' + user.provider.jumping.token;
    }

    // prefix with baseURL
    config.url = baseURL + config.url;

    return $http(config);
  };

  var get = function (path, config) {
    config = config || {};
    config.method = 'GET';
    config.url = path;
    return request(config);
  };

  var post = function (path, data, config) {
    config = config || {};
    config.method = 'POST';
    config.url = path;
    config = data;
    return request(config);
  };

  var patch = function (path, data, config) {
    config = config || {};
    config.method = 'PATCH';
    config.url = path;
    config = data;
    return request(config);
  };

  var del = function (path, config) {
    config = config || {};
    config.method = 'DELETE';
    config.url = path;
    return request(config);
  };

  var filterParams = function (params, possibleParams) {
    params = params || {};

    angular.forEach(params, function (key) {
      if (possibleParams.indexOf(key) == -1) delete params[key];
    });

    return params;
  };

  // users =============================================

  var loginJumping = function (email, password) {
    return post('/login/jumping', {
      email: email,
      password: password
    }, {
      anonymous: true
    });
  };

  var loginFacebook = function (accessToken, expiresAt) {
    return post('/login/facebook', {
      accessToken: accessToken,
      expiresAt: expiresAt
    }, {
      anonymous: true
    });
  };

  var loginGoogle = function (idToken, serverAuthCode) {
    return post('/login/google', {
      idToken: idToken,
      serverAuthCode: serverAuthCode
    }, {
      anonymous: true
    });
  };

  var logout = function () {
    return post('/logout');
  };

  var createUser = function (user) {
    user = filterParams(user, ['email', 'password', 'name', 'weight', 'age', 'gender', 'units', 'language']);
    return post('/user', user, {
      anonymous: true
    });
  };

  var getUser = function () {
    return get('/user');
  };

  var updateUser = function (partialUserObj) {
    return patch('/user', partialUserObj);
  };

  var resetPassword = function (email) {
    return post('/user/resetPassword', {
      email: email
    }, {
      anonymous: true
    });
  };

  // lessons =============================================

  var getLessons = function (params) {
    return get('/lessons', {
      params: filterParams(params, ['maxResults', 'syncToken', 'pageToken', 'fields'])
    });
  };

  var uploadLesson = function (lesson) {
    return post('/lesson', lesson);
  };

  var getLesson = function (start) {
    return get('/lesson/' + start);
  };

  var deleteLesson = function (start) {
    return del('/lesson/' + start);
  };

  // events =============================================

  var getEvents = function (sport, params) {
    var possible = ['maxResults', 'name', 'locationName', 'latitude', 'longitude', 'accuracy', 'pageToken'];
    params = filterParams(params, possible);
    params.sport = sport;

    return get('/events', {
      params: params
    });
  };

  var getEvent = function (id) {
    return get('/event/' + id);
  };

  // friends =============================================

  var getFriends = function (sport, params) {
    params = filterParams(params, ['fields', 'pageToken']);
    params.sport = sport;

    return get('/friends', {
      params: params
    });
  };

  // firmwares =============================================

  var getLatestFirmware = function (device) {
    device = device.toLowerCase().replace(':', '-');

    return get('/firmware/latest', {
      params: {
        device: device
      }
    });
  };

  // logging =============================================

  var log = function (data) {
    return post('/log', data);
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

