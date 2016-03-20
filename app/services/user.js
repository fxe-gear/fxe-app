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

  var loginFacebook = function () {
    $log.debug('logging in using facebook provider');
    return $cordovaFacebook.login(['email', 'public_profile', 'user_birthday', 'user_friends'])
      .then(function (response) {
        user.provider = 'facebook';
        user.accessToken = response.authResponse.accessToken;
        user.expiresIn = response.authResponse.expiresIn;
        $log.info('logged in using facebook provider');
      });
  };

  var loginGoogle = function () {
    $log.debug('logging in using google provider');
    var q = $q.defer();

    window.plugins.googleplus.login({
      offline: true,
    }, function (response) {
      user.provider = 'google';
      user.accessToken = response.oauthToken;
      user.expiresIn = 0;

      user.email = response.email;
      user.name = response.displayName;

      if (response.gender) user.gender = response.gender; // Android only
      if (response.birthday) user.age = getAge(response.birthday); // Android only

      $log.info('logged in using google provider');
      q.resolve(response);
    }, q.reject);

    return q.promise;
  };

  var loginJumping = function () {
    $log.debug('logging in using jumping provider');
    return apiService.loginJumping(user.email, user.password).then(function (response) {
      user.provider = 'jumping';
      user.accessToken = response.data.token;
      user.expiresIn = response.data.expiresAt; // FIXME expiresIn != expiresAt
      $log.info('logged in using jumping provier');
    });
  };

  var createAccount = function () {
    $log.debug('creating user account');
    return apiService.createUser(user).then(function (response) {
      user.provider = 'jumping';
      user.accessToken = response.data.token;
      user.expiresIn = response.data.expiresAt; // FIXME expiresIn != expiresAt
      $log.info('user account created');
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

  var loadFromFacebook = function () {
    return $http.get('https://graph.facebook.com/v2.5/me', {
      params: {
        // TODO handle token expiration
        access_token: user.accessToken,
        fields: 'email,name,birthday,gender,locale',
      },
    }).then(function (response) {
      user.email = response.data.email;
      user.name = response.data.name;
      user.gender = response.data.gender;
      user.age = getAge(response.data.birthday);
      user.units = response.data.locale == 'en' ? 'imperial' : 'metric';
      $log.info('user data loaded from Facebook');
    }).catch(function (error) {
      $log.error('Facebook graph API error: ' + error);
      throw error;
    });
  };

  var loadFromGoogle = function () {
    return $http.get('https://www.googleapis.com/plus/v1/people/me', {
      params: {
        fields: 'emails,displayName,birthday,gender,language',
      },
      headers: {
        Authorization: 'Bearer ' + user.accessToken,
      },
    }).then(function (response) {
      user.units = response.language == 'en' ? 'imperial' : 'metric';
      $log.info('user data loaded from Google');
    }).catch(function (error) {
      $log.error('Google API error: ' + error);
      throw error;
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
  this.loginFacebook = loginFacebook;
  this.loginGoogle = loginGoogle;
  this.loginJumping = loginJumping;
  this.loadDetails = loadDetails;
  this.resetPassword = resetPassword;
  this.createAccount = createAccount;
  this.updateAccount = updateAccount;
  this.loadFromFacebook = loadFromFacebook;
  this.loadFromGoogle = loadFromGoogle;
  this.loadFriendsFacebook = loadFriendsFacebook;
});
