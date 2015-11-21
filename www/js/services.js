angular.module('experience.services', [])

.constant('OAuthKeyFacebook', '702447366556323')

.constant('OAuthKeyGoogle', '457117701129-ljnme8uprvbe19fs14gbt9u3n037rspu.apps.googleusercontent.com')

.factory('userService', function($rootScope, $cordovaOauth, $http, $log, OAuthKeyFacebook, OAuthKeyGoogle) {

  var service = {};

  service.model = {
    provider: 'none',
    accessToken: '',
    expiresIn: '',

    email: '',
    password: '',
    name: '',
    weight: 0,
    birthday: '',
    gender: 'male',
    units: 'metric',
  };

  service.saveState = function() {
    $log.info('saving state of userService');
    window.localStorage.userService = angular.toJson(service.model);
  };

  service.restoreState = function() {
    $log.info('restoring state of userService');
    if (window.localStorage.userService) {
      prevState = angular.fromJson(window.localStorage.userService);
      for (var attrname in prevState) service.model[attrname] = prevState[attrname]; // mustn't replace whole service.model object
      $rootScope.$apply();
    }
  };

  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers

  service.oauthFacebook = function() {
    return $cordovaOauth.facebook(
      OAuthKeyFacebook, ['email', 'public_profile', 'user_birthday', 'user_friends']
    ).then(function(result) {
      service.model.provider = 'facebook';
      service.model.accessToken = result.access_token;
      service.model.expiresIn = result.expires_in;
      $log.info('logged in using Facebook');
    }).catch(function(error) {
      $log.error('Facebook oauth error: ' + error);
      throw error;
    });
  };

  service.oauthGoogle = function() {
    return $cordovaOauth.google(
      OAuthKeyGoogle, ['email', 'profile']
    ).then(function(result) {
      service.model.provider = 'google';
      console.log(result);
      $log.info('logged in using Google');
    }).catch(function(error) {
      $log.error('Google oauth error: ' + error);
      throw error;
    });
  };

  service.loadFromFacebook = function() {
    return $http.get('https://graph.facebook.com/v2.5/me', {
      params: {
        // TODO handle token expiration
        access_token: service.model.accessToken,
        fields: 'email,name,birthday,gender',
      },
    }).then(function(result) {
      service.model.email = result.data.email;
      service.model.name = result.data.name;
      service.model.gender = result.data.gender;
      service.model.birthday = result.data.birthday;
      $log.info('user data loaded from Facebook');
    }).catch(function(error) {
      $log.error('Facebook graph API error: ' + error);
      throw error;
    });
  };

  // jscs:enable requireCamelCaseOrUpperCaseIdentifiers

  $rootScope.$on('savestate', service.saveState);
  $rootScope.$on('restorestate', service.restoreState);

  return service;
});
