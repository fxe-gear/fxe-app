'use strict';

// because of facebook "access_token":
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

angular.module('experience.services.user', [])

.constant('friendsUpdateInterval', 1e3 * 60 * 60 * 24 * 7) // = one week in miliseconds

.service('userService', function ($rootScope, $http, $log, $cordovaFacebook, storeService, apiService, $q, friendsUpdateInterval) {

  var user = storeService.getUser();

  var getAge = function (ISOdate) {
    return Math.floor((Date.now() - Date.parse(ISOdate)) / (1000 * 60 * 60 * 24 * 365));
  };

  var getFacebookToken = function () {
    $log.debug('getting facebook token');
    var fields = ['email', 'public_profile', 'user_birthday', 'user_friends'];
    return $cordovaFacebook.login(fields).then(function (response) {
      user.provider = 'facebook';
      user.accessToken = response.authResponse.accessToken;
      user.expiresIn = response.authResponse.expiresIn;
      $log.info('got facebook token');
    });
  };

  var getGoogleToken = function () {
    $log.debug('getting google token');
    var q = $q.defer();

    var callback = function (response) {
      user.provider = 'google';
      user.accessToken = response.oauthToken;
      user.expiresIn = 0;

      user.email = response.email;
      user.name = response.displayName;

      if (response.gender) user.gender = response.gender; // Android only
      if (response.birthday) user.age = getAge(response.birthday); // Android only

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
    user.provider = 'jumping';
    user.accessToken = response.data.token;
    user.expiresIn = response.data.expiresAt; // FIXME expiresIn != expiresAt
    $log.info('logged in (got jumping token)');
  };

  var loginFacebook = function () {
    $log.debug('logging in using facebook provider');
    return apiService.loginFacebook(user.accessToken, user.expiresIn).then(loginCallback);
  };

  var loginGoogle = function () {
    $log.debug('logging in using google provider');
    return apiService.loginGoogle(user.accessToken, user.expiresIn).then(loginCallback);
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

  var updateAccount = function (diff) {
    $log.debug('updating user account');
    return apiService.updateUser(diff).then(function (response) {
      $log.info('user account updated');
    });
  };

  var makeFriendObject = function (provider, id, name, picture) {
    return {
      provider: provider,
      id: id,
      name: name,
      picture: picture,
    };
  };

  var loadFriendsFacebook = function (force) {
    if (!force && user.friends.loaded.facebook != null && (new Date() - user.friends.loaded.facebook) < friendsUpdateInterval) {
      return;
    }

    $log.debug('loading friends from Facebook');

    return $http.get('https://graph.facebook.com/v2.5/me/friends', {
      params: {
        access_token: user.accessToken,
        fields: 'name,id,picture',
      },
    }).then(function (response) {
      user.friends.facebook = [];
      angular.forEach(response.data.data, function (person) {
        user.friends.facebook.push(makeFriendObject('facebook', person.id, person.name, person.picture.data.url));
      });

      user.friends.loaded.facebook = Date.now();
      $log.info('friends loaded from Facebook');
    }).catch(function (error) {
      $log.error('Facebook graph API error: ' + error);
      throw error;
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
  this.updateAccount = updateAccount;
  this.loadFriendsFacebook = loadFriendsFacebook;
});
