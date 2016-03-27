'use strict';

// because of facebook "access_token":
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

angular.module('experience.services.user', [])

.service('userService', function ($rootScope, $http, $log, $cordovaFacebook, storeService, apiService, $q) {

  var user = storeService.getUser();

  var getAge = function (ISOdate) {
    return Math.floor((Date.now() - Date.parse(ISOdate)) / (1000 * 60 * 60 * 24 * 365));
  };

  var getFacebookToken = function () {
    $log.debug('getting facebook token');
    var fields = ['email', 'public_profile', 'user_birthday', 'user_friends'];
    return $cordovaFacebook.login(fields).then(function (response) {
      // convert expiresIn (relative seconds) to expiresAt (milliseconds timestamp)
      expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + response.authResponse.expiresIn);
      expiresAt = expiresAt.getTime();

      // store token
      storeService.setToken('facebook', response.authResponse.accessToken, expiresAt);
      $log.info('got facebook token');
    });
  };

  var getGoogleToken = function () {
    $log.debug('getting google token');
    var q = $q.defer();

    var callback = function (response) {
      storeService.setToken('google', response.oauthToken, 0);
      $log.info('got google token');
      q.resolve(response);
    };

    // do the request
    window.plugins.googleplus.login({
      offline: true,
    }, callback, q.reject);

    return q.promise;
  };

  var loginCallback = function (response) {
    storeService.setToken('jumping', response.data.token, response.data.expiresAt);
    $log.info('logged in (got jumping token)');
  };

  var loginFacebook = function () {
    $log.debug('logging in using facebook provider');
    var provider = user.provider.facebook;
    return apiService.loginFacebook(provider.token, provider.expiresAt).then(loginCallback);
  };

  var loginGoogle = function () {
    $log.debug('logging in using google provider');
    var provider = user.provider.google;
    return apiService.loginGoogle(provider.token, provider.expiresAt).then(loginCallback);
  };

  var loginJumping = function () {
    $log.debug('logging in using jumping provider');
    return apiService.loginJumping(user.email, user.password).then(loginCallback);
  };

  var createAccount = function () {
    $log.debug('creating user account');
    return apiService.createUser(user).then(function (response) {
      $log.info('user account created');
      loginCallback(response);
    });
  };

  var loadDetails = function () {
    $log.debug('loading user details');
    return apiService.getUser().then(function (response) {
      angular.merge(user, response.data);
      $log.info('user details loaded');
    });
  };

  var resetPassword = function () {
    $log.debug('requesting user password reset');
    return apiService.resetPassword(user.email).then(function (response) {
      $log.info('user password reset requested');
    });
  };

  // service public API
  this.getFacebookToken = getFacebookToken;
  this.getGoogleToken = getGoogleToken;
  this.loginFacebook = loginFacebook;
  this.loginGoogle = loginGoogle;
  this.loginJumping = loginJumping;
  this.loadDetails = loadDetails;
  this.resetPassword = resetPassword;
  this.createAccount = createAccount;
});
