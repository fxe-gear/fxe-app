'use strict';

angular.module('experience.services.api', [])

.constant('baseURL', 'https://private-855a4-experience4.apiary-mock.com')

.service('apiService', function ($http, $log, baseURL) {

  var request = function (config)  {
    config.headers = config.headers || {};
    if (config.anonymous !== true) {
      config.headers.Authorization = 'Token bpnjxsrb1ivyd9xf2m1k';
    }

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

  var loginJumping = function (email, password) {
    $log.debug('logging in using jumping account');
    return post('/login/jumping', {
      email: email,
      password: password,
    }).then(function (response) {
      $log.info('logged in using jumping account');
      return response.data;
    }).catch(function (error) {
      $log.error('jumping login error: ' + error);
      throw error;
    });
  };

  this.loginJumping = loginJumping;

});
