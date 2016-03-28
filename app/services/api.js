'use strict';

angular.module('experience.services.api', [])

.constant('baseURL', 'https://private-855a4-experience4.apiary-mock.com')

/**
 * Thin wrapper around the Experience API: https://app.apiary.io/experience4/editor
 */
.service('apiService', function ($http, $log, storeService, baseURL) {

  var user = storeService.getUser();

  var request = function (config) {
    // add auth token if not explicitly requested to be anonymous
    config.headers = config.headers || {};
    if (config.anonymous !== true) {
      config.headers.Authorization = 'Token ' + user.provider.jumping.token;
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
    config.data = data;
    return request(config);
  };

  var put = function (path, data, config) {
    config = config || {};
    config.method = 'PUT';
    config.url = path;
    config.data = data;
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

    angular.forEach(params, function (key, val) {
      if (!(key in possibleParams)) delete params[key];
    });

    return params;
  };

  // users =============================================

  var loginJumping = function (email, password) {
    return post('/login/jumping', {
      email: email,
      password: password,
    }, {
      anonymous: true,
    });
  };

  var loginFacebook = function (token, expiresAt) {
    return post('/login/facebook', {
      token: token,
      expiresAt: expiresAt,
    }, {
      anonymous: true,
    });
  };

  var loginGoogle = function (token, expiresAt) {
    return post('/login/google', {
      token: token,
      expiresAt: expiresAt,
    }, {
      anonymous: true,
    });
  };

  var logout = function () {
    return post('/logout');
  };

  var createUser = function (user) {
    user = filterParams(user, ['email', 'password', 'name', 'weight', 'age', 'gender', 'units']);
    return post('/user', user, {
      anonymous: true,
    });
  };

  var getUser = function () {
    return get('/user');
  };

  var updateUser = function (partialUserObj) {
    return put('/user', partialUserObj);
  };

  var resetPassword = function (email) {
    return post('/user/resetPassword', {
      email: email,
    });
  };

  // lessons =============================================

  var getLessons = function (params) {
    return get('/lessons', {
      params: filterParams(params, ['from', 'fields']),
    });
  };

  var uploadLessons = function (lessons) {
    return post('/lessons', lessons);
  };

  var deleteLesson = function (start) {
    return del('/lesson/' + start);
  };

  // events =============================================

  var getEvents = function (limit, params) {
    params = filterParams(params, ['name', 'lat', 'lon', 'from']);
    params.limit = limit;

    return get('/events', {
      params: params,
    });
  };

  var getEvent = function (id) {
    return get('/event/' + id);
  };

  // friends =============================================

  var getFriends = function (params) {
    return get('/friends', {
      params: filterParams(params, ['fields', 'scores']),
    });
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
  this.uploadLessons = uploadLessons;
  this.deleteLesson = deleteLesson;
  this.getEvents = getEvents;
  this.getEvent = getEvent;
  this.getFriends = getFriends;

});
