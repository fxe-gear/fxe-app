angular.module('experience.services', [])

.factory('userService', function($rootScope, $http, $log, $cordovaFacebook, $q) {

  var service = {};

  service.model = {
    provider: '',
    accessToken: '',
    expiresIn: '',

    email: '',
    password: '',
    name: '',
    weight: 0,
    birthday: '',
    gender: '',
    units: '',
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

  service.loginFacebook = function() {
    return $cordovaFacebook.login(['email', 'public_profile', 'user_birthday', 'user_friends'])
    .then(function(response) {
      service.model.provider = 'facebook';
      service.model.accessToken = response.authResponse.accessToken;
      service.model.expiresIn = response.authResponse.expiresIn;
      $log.info('logged in using Facebook');
    });
  };

  service.loginGoogle = function() {
    return $q(function(resolve, reject) {
      window.plugins.googleplus.login({offline: true}, function(response) {
        service.model.provider = 'google';
        service.model.accessToken = response.oauthToken;
        service.model.expiresIn = 0;

        service.model.email = response.email;
        service.model.name = response.displayName;
        service.model.gender = response.gender; // Android only
        service.model.birthday = response.birthday; // Android only

        $log.info('logged in using Google');
        resolve(response);
      }, reject);
    });
  };

  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers

  service.loadFromFacebook = function() {
    return $http.get('https://graph.facebook.com/v2.5/me', {
      params: {
        // TODO handle token expiration
        access_token: service.model.accessToken,
        fields: 'email,name,birthday,gender,locale',
      },
    }).then(function(response) {
      service.model.email = response.data.email;
      service.model.name = response.data.name;
      service.model.gender = response.data.gender;
      service.model.birthday = response.data.birthday;
      service.model.units = response.data.locale == 'en' ? 'imperial' : 'metric';
      $log.info('user data loaded from Facebook');
    }).catch(function(error) {
      $log.error('Facebook graph API error: ' + error);
      throw error;
    });
  };

  // jscs:enable requireCamelCaseOrUpperCaseIdentifiers

  service.loadFromGoogle = function() {
    return $http.get('https://www.googleapis.com/plus/v1/people/me', {
      params: {
        fields: 'emails,displayName,birthday,gender,language',
      },
      headers: {
        Authorization: 'Bearer ' + service.model.accessToken,
      },
    }).then(function(response) {
      service.model.units = response.language == 'en' ? 'imperial' : 'metric';
      $log.info('user data loaded from Google');
    }).catch(function(error) {
      $log.error('Google API error: ' + error);
      throw error;
    });
  };

  $rootScope.$on('savestate', service.saveState);
  $rootScope.$on('restorestate', service.restoreState);

  return service;
});
