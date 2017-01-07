'use strict';

// because of facebook "access_token":
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

angular.module('fxe.services.user', [])

.service('userService', function ($rootScope, $http, $log, $ionicPlatform, $cordovaFacebook, storeService, apiService, $q) {

  var user = storeService.getUser();

  var getAge = function (ISOdate) {
    return Math.floor((Date.now() - Date.parse(ISOdate)) / (1000 * 60 * 60 * 24 * 365));
  };

  var getFacebookToken = function () {
    $log.debug('calling get fb token');
    return $ionicPlatform.ready()
      .then(function () {
        $log.debug('getting facebook token');
        var fields = ['email', 'public_profile', 'user_birthday', 'user_friends'];
        return $cordovaFacebook.login(fields);
      })
      .then(function (response) {
        return $cordovaFacebook.getAccessToken();
      })
      .then(function (token) {
        // convert expiresIn (relative seconds) to expiresAt (milliseconds timestamp)
        // var expiresAt = new Date();
        // expiresAt.setSeconds(expiresAt.getSeconds() + response.authResponse.expiresIn);
        // expiresAt = expiresAt.getTime();

        // store token
        storeService.setToken('facebook', token, 0);
        $log.info('got facebook token');
      })
      .catch(function (error) {
        $log.error('getting facebook token failed:' + error);
        throw error;
      });
  };

  var getGoogleToken = function () {
    var q = $q.defer();

    var callback = function (response) {
      storeService.setToken('google', response.oauthToken, 0);
      $log.info('got google token');
      q.resolve(response);
    };

    return $ionicPlatform.ready()
      .then(function () {
        $log.debug('getting google token');

        // see https://developers.google.com/android/reference/com/google/android/gms/common/Scopes
        var scopes = ['profile', 'email'];
        scopes.push('https://www.googleapis.com/auth/fitness.activity.write');
        scopes.push('https://www.googleapis.com/auth/fitness.body.read');
        scopes.push('https://www.googleapis.com/auth/plus.login');

        // do the request
        window.plugins.googleplus.login({
          scopes: scopes.join(' ')
        }, callback, q.reject);

        return q.promise;
      })
      .catch(function (error) {
        $log.error('getting google token failed:' + error);
        throw error;
      });
  };

  var loginCallback = function (response) {
    storeService.setToken('jumping', response.data.token, response.data.expiresAt);
    $log.info('logged in (got jumping token)');
  };

  var loginFacebook = function () {
    $log.debug('logging in using facebook provider');
    var provider = user.provider.facebook;
    return apiService.loginFacebook(provider.token, provider.expiresAt)
      .then(loginCallback);
  };

  var loginGoogle = function () {
    $log.debug('logging in using google provider');
    var provider = user.provider.google;
    return apiService.loginGoogle(provider.token, provider.expiresAt)
      .then(loginCallback);
  };

  var loginJumping = function () {
    $log.debug('logging in using jumping provider');
    return apiService.loginJumping(user.email, user.password)
      .then(loginCallback);
  };

  var createAccount = function () {
    $log.debug('creating user account');
    return apiService.createUser(user)
      .then(function (response) {
        $log.info('user account created');
        loginCallback(response);
      });
  };

  var loadDetails = function () {
    $log.debug('loading user details');
    return apiService.getUser()
      .then(function (response) {
        angular.merge(user, response.data);
        $log.info('user details loaded');
      });
  };

  var resetPassword = function () {
    $log.debug('requesting user password reset');
    return apiService.resetPassword(user.email)
      .then(function (response) {
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
