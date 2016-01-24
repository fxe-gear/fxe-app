'use strict';

angular.module('experience.services.user', [
  'ngCordova',
  'experience.services.store',
])

.service('userService', function($rootScope, $http, $log, $cordovaFacebook, storeService, $q) {

  var model = storeService.getUser();

  var getAge = function(ISOdate) {
    return ((Date.now() - Date.parse(ISOdate)) / (1000 * 60 * 60 * 24 * 365)).toFixed(0);
  };

  var loginFacebook = function() {
    return $cordovaFacebook.login(['email', 'public_profile', 'user_birthday', 'user_friends'])
      .then(function(response) {
        model.provider = 'facebook';
        model.accessToken = response.authResponse.accessToken;
        model.expiresIn = response.authResponse.expiresIn;
        $log.info('logged in using Facebook');
      });
  };

  var loginGoogle = function() {
    var q = $q.defer();
    window.plugins.googleplus.login({
      offline: true,
    }, function(response) {
      model.provider = 'google';
      model.accessToken = response.oauthToken;
      model.expiresIn = 0;

      model.email = response.email;
      model.name = response.displayName;

      if (response.gender) model.gender = response.gender; // Android only
      if (response.birthday) model.age = getAge(response.birthday); // Android only

      $log.info('logged in using Google');
      q.resolve(response);
    }, q.reject);
    return q.promise;
  };

  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers

  var loadFromFacebook = function() {
    return $http.get('https://graph.facebook.com/v2.5/me', {
      params: {
        // TODO handle token expiration
        access_token: model.accessToken,
        fields: 'email,name,birthday,gender,locale',
      },
    }).then(function(response) {
      model.email = response.data.email;
      model.name = response.data.name;
      model.gender = response.data.gender;
      model.age = getAge(response.data.birthday);
      model.units = response.data.locale == 'en' ? 'imperial' : 'metric';
      $log.info('user data loaded from Facebook');
    }).catch(function(error) {
      $log.error('Facebook graph API error: ' + error);
      throw error;
    });
  };

  // jscs:enable requireCamelCaseOrUpperCaseIdentifiers

  var loadFromGoogle = function() {
    return $http.get('https://www.googleapis.com/plus/v1/people/me', {
      params: {
        fields: 'emails,displayName,birthday,gender,language',
      },
      headers: {
        Authorization: 'Bearer ' + model.accessToken,
      },
    }).then(function(response) {
      model.units = response.language == 'en' ? 'imperial' : 'metric';
      $log.info('user data loaded from Google');
    }).catch(function(error) {
      $log.error('Google API error: ' + error);
      throw error;
    });
  };

  // service public API
  this.loginFacebook = loginFacebook;
  this.loginGoogle = loginGoogle;
  this.loadFromFacebook = loadFromFacebook;
  this.loadFromGoogle = loadFromGoogle;
});
