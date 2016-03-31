'use strict';

angular.module('fxe.services.api', [])

.constant('baseURL', 'http://private-855a4-fxe.apiary-mock.com')

.constant('useMockApiService', true)

/**
 * Wrap apiService in a factory to be able to mock it by changing the useMockApiService constant.
 */
.factory('apiService', function (useMockApiService, realApiService, mockApiService) {
  return useMockApiService ? mockApiService : realApiService;
})

/**
 * Thin wrapper around the FXE API: https://app.apiary.io/fxe
 */
.service('realApiService', function ($http, storeService, baseURL) {

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
    config = data;
    return request(config);
  };

  var put = function (path, data, config) {
    config = config || {};
    config.method = 'PUT';
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

})

.service('mockApiService', function ($q, $http) {

  var user = null;
  var lessons = null;
  var events = null;

  var userPromise = null;
  var lessonsPromise = null;
  var eventsPromise = null;

  var loginJumping = function () {
    return $http.get('mock_resources/token.json');
  };

  var loginFacebook = loginJumping;

  var loginGoogle = loginJumping;

  var logout = $q.resolve;

  var createUser = function (userData) {
    return getUser()
      .then(function () {
        angular.merge(user, partialUserObj);
        return loginJumping();
      });
  };

  var getUser = function () {
    if (!userPromise) {
      userPromise = $http.get('mock_resources/user.json').then(function (response) {
        user = response.data;
        return response;
      });
    }

    return userPromise.then(function () {
      // 'data' envelope is needed
      return {
        data: user,
      };
    });
  };

  var updateUser = function (partialUserObj) {
    return getUser()
      .then(function () {
        angular.merge(user, partialUserObj);
      });
  };

  var resetPassword = $q.resolve;

  var getLessons = function (params) {
    if (!lessonsPromise) {
      lessonsPromise = $http.get('mock_resources/lessons.json').then(function (response) {
        lessons = response.data;
        return response;
      });
    }

    return lessonsPromise.then(function () {
      // 'data' envelope is needed
      if (params && params.from && params.from > 0) return {
        data: lessons.filter(function (lesson) {
          return lesson.start > params.from;
        }),
      };
      else return {
        data: lessons,
      };

    });
  };

  var uploadLessons = function (data) {
    // ensure lessons are prepared
    return getLessons()
      .then(function () {
        angular.forEach(data, function (l) {
          lessons.push(l);
        });
      });
  };

  var deleteLesson = function (start) {
    // ensure lessons are prepared
    return getLessons()
      .then(function () {
        for (var i = 0; i < lessons.length; i++) {
          var l = lessons[i];
          if (l.start == start) {
            delete lessons[i];
            return $q.resolve();
          }
        }

        return $q.reject();
      });
  };

  var getEvents = function (limit, params) {
    if (!eventsPromise) {
      eventsPromise = $http.get('mock_resources/events.json').then(function (response) {
        events = response.data;
        return response;
      });
    }

    return eventsPromise.then(function () {
      // 'data' envelope is needed
      return {
        data: events,
      };
    });
  };

  var getEvent = function (id) {
    return getEvents()
      .then(function () {
        for (var i = 0; i < events.length; i++) {
          var e = events[i];
          if (e.id == id) return $q.resolve(e);
        }

        return $q.reject();
      });
  };

  var getFriends = function (params) {
    return $http.get('mock_resources/friends.json');
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
