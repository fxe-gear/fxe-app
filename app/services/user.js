'use strict';

// because of facebook "access_token":
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

var module = angular.module('fxe.services.user', []);

module.service('userService', function ($rootScope, $log, $q, $localStorage, $ionicPlatform, $cordovaFacebook, apiService, tokenService) {

  var $storage = $localStorage.$default({
    user: {
      email: null,
      password: null,
      name: null,
      weight: null,
      age: null,
      gender: null,
      units: null
    },
    userChanges: {}
  });

  var getUser = function () {
    return $storage.user;
  };

  var isLoggedIn = function () {
    return tokenService.getJumpingToken().token != null;
  };

  var getUserChanges = function () {
    return $storage.userChanges;
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
        // see https://github.com/jeduan/cordova-plugin-facebook4#login
        tokenService.setFacebookToken(response.authResponse);
        $log.info('got facebook token');
      })
      .catch(function (error) {
        $log.error('getting facebook token failed', error);
        throw error;
      });
  };

  var getGoogleToken = function () {
    var q = $q.defer();

    // see https://developers.google.com/android/reference/com/google/android/gms/common/Scopes
    var scopes = ['profile', 'email'];
    scopes.push('https://www.googleapis.com/auth/fitness.activity.write');
    scopes.push('https://www.googleapis.com/auth/fitness.body.read');
    scopes.push('https://www.googleapis.com/auth/plus.login');

    var callback = function (response) {
      // see https://github.com/EddyVerbruggen/cordova-plugin-googleplus#login
      tokenService.setGoogleToken(response);
      $log.info('got google token');
      q.resolve(response);
    };

    return $ionicPlatform.ready()
      .then(function () {
        $log.debug('getting google token');

        // do the request
        window.plugins.googleplus.login({
          scopes: scopes.join(' '),
          webClientId: '939774376004-bm94sgchalcr3ai0on6eac0u0sjhels1.apps.googleusercontent.com',
          offline: true
        }, callback, q.reject);

        return q.promise;
      })
      .catch(function (error) {
        $log.error('getting google token failed', error);
        throw error;
      });
  };

  var loginCallback = function (response) {
    tokenService.setJumpingToken(response.data);
    $log.info('logged in (got jumping token)');
  };

  var loginFacebook = function () {
    $log.debug('logging in using facebook provider');
    var provider = tokenService.getFacebookToken();
    return apiService.loginFacebook(provider.accessToken, parseInt(provider.expiresIn, 10))
      .then(loginCallback);
  };

  var loginGoogle = function () {
    $log.debug('logging in using google provider');
    var provider = tokenService.getGoogleToken();
    return apiService.loginGoogle(provider.idToken, provider.serverAuthCode)
      .then(loginCallback);
  };

  var loginJumping = function () {
    $log.debug('logging in using jumping provider');
    return apiService.loginJumping($storage.user.email, $storage.user.password)
      .then(loginCallback);
  };

  var createAccount = function () {
    $log.debug('creating user account');
    return apiService.createUser($storage.user)
      .then(function (response) {
        $log.info('user account created');
        loginCallback(response);
      });
  };

  var resetPassword = function () {
    $log.debug('requesting user password reset');
    return apiService.resetPassword($storage.user.email)
      .then(function () {
        $log.info('user password reset requested');
      });
  };

  // service public API
  this.getUser = getUser;
  this.isLoggedIn = isLoggedIn;
  this.getUserChanges = getUserChanges;
  this.getFacebookToken = getFacebookToken;
  this.getGoogleToken = getGoogleToken;
  this.loginFacebook = loginFacebook;
  this.loginGoogle = loginGoogle;
  this.loginJumping = loginJumping;
  this.resetPassword = resetPassword;
  this.createAccount = createAccount;
});
