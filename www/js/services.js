angular.module('experience.services', [])

.service('util', function() {
  // Fisher–Yates shuffle
  this.shuffle = function(array) {
    var counter = array.length;
    var temp;
    var index;

    while (counter > 0) {
      index = Math.floor(Math.random() * counter);
      counter--;
      temp = array[counter];
      array[counter] = array[index];
      array[index] = temp;
    }

    return array;
  };
})

.service('userService', function($rootScope, $http, $log, $cordovaFacebook, $q) {

  var model = {
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

  this.model = model;

  this.saveState = function() {
    $log.info('saving state of userService');
    window.localStorage.userService = angular.toJson(model);
  };

  this.restoreState = function() {
    $log.info('restoring state of userService');
    if (window.localStorage.userService) {
      prevState = angular.fromJson(window.localStorage.userService);
      for (var attrname in prevState) model[attrname] = prevState[attrname]; // mustn't replace whole model object
      $rootScope.$apply();
    }
  };

  this.loginFacebook = function() {
    return $cordovaFacebook.login(['email', 'public_profile', 'user_birthday', 'user_friends'])
    .then(function(response) {
      model.provider = 'facebook';
      model.accessToken = response.authResponse.accessToken;
      model.expiresIn = response.authResponse.expiresIn;
      $log.info('logged in using Facebook');
    });
  };

  this.loginGoogle = function() {
    return $q(function(resolve, reject) {
      window.plugins.googleplus.login({offline: true}, function(response) {
        model.provider = 'google';
        model.accessToken = response.oauthToken;
        model.expiresIn = 0;

        model.email = response.email;
        model.name = response.displayName;

        if (response.gender) model.gender = response.gender; // Android only
        if (response.birthday) model.birthday = response.birthday; // Android only

        $log.info('logged in using Google');
        resolve(response);
      }, reject);
    });
  };

  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers

  this.loadFromFacebook = function() {
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
      model.birthday = response.data.birthday;
      model.units = response.data.locale == 'en' ? 'imperial' : 'metric';
      $log.info('user data loaded from Facebook');
    }).catch(function(error) {
      $log.error('Facebook graph API error: ' + error);
      throw error;
    });
  };

  // jscs:enable requireCamelCaseOrUpperCaseIdentifiers

  this.loadFromGoogle = function() {
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

  $rootScope.$on('savestate', this.saveState);
  $rootScope.$on('restorestate', this.restoreState);
})

// ------------------------------------------------------------------------------------------------

.constant('experienceServiceUUID', '0000a5b6-0000-1000-8000-00805f9b34fb')

.service('experienceService', function($q, $log, experienceServiceUUID) {

  this.enable = function() {
    return $q(function(resolve, reject) {
      ble.isEnabled(resolve, function() {
        if (typeof ble.enable === 'undefined') {
          // iOS doesn't have ble.enable
          $log.warning('cannot enable bluetooth, probably on iOS');
          reject();
        } else {
          // Android
          $log.info('enabling bluetooth');
          ble.enable(resolve, reject);
        }
      });
    });
  };

  this.scan = function() {
    return $q(function(resolve, reject) {
      $log.info('starting ble scan');
      ble.startScan([experienceServiceUUID], function(device) {
        $log.info('stopping ble scan, found device: ' + angular.toJson(device));
        ble.stopScan();
        resolve(device);
      }, reject);
    });
  };

  this.stopScan = function() {
    return $q(function(resolve, reject) {
      $log.info('stopping ble scan');
      ble.stopScan(resolve, reject);
    });
  };

  this.connect = function(deviceID) {
    return $q(function(resolve, reject) {
      $log.info('connecting to ' + deviceID);
      ble.connect(deviceID, resolve, reject);
    });
  },

  this.disconnect = function(deviceID) {
    return $q(function(resolve, reject) {
      $log.info('disconnecting from ' + deviceID);
      ble.disconnect(deviceID, resolve, reject);
    });
  };
})

// ------------------------------------------------------------------------------------------------

.service('experienceServiceMock', function($rootScope, $q, $log, $timeout) {

  var deviceFull = {
    name: 'Battery Demo',
    id: '20:FF:D0:FF:D1:C0',
    advertising: [2, 1, 6, 3, 3, 15, 24, 8, 9, 66, 97, 116, 116, 101, 114, 121],
    rssi: -55,
    services: ['1800', '1801', '180f'],
    characteristics: [
      {
        service: '1800',
        characteristic: '2a00',
        properties: ['Read'],
      },
      {
        service: '1800',
        characteristic: '2a01',
        properties: ['Read'],
      },
      {
        service: '1801',
        characteristic: '2a05',
        properties: ['Read'],
      },
      {
        service: '180f',
        characteristic: '2a19',
        properties: ['Read'],
        descriptors: [
          {uuid: '2901'},
          {uuid: '2904'},
        ],
      },
    ],
  };

  var deviceShort = {
    name: deviceFull.name,
    id: deviceFull.id,
    advertising: deviceFull.advertising,
    rssi: deviceFull.rssi,
  };

  var model = {
    experienceID: '',
    connected: false,
    paired: false,
  };
  this.model = model;

  this.saveState = function() {
    $log.info('saving state of experienceService');
    window.localStorage.experienceService = angular.toJson(model);
  };

  this.restoreState = function() {
    $log.info('restoring state of experienceService');
    if (window.localStorage.experienceService) {
      prevState = angular.fromJson(window.localStorage.experienceService);
      for (var attrname in prevState) model[attrname] = prevState[attrname]; // mustn't replace whole model object
      $rootScope.$apply();
    }
  };

  this.enable = function() {
    return $q(function(resolve, reject) {
      $log.info('enabling bluetooth');
      $timeout(resolve, 1000);
    });
  };

  this.scan = function() {
    return $q(function(resolve, reject) {
      $log.info('starting ble scan');
      $timeout(function() {
        $log.info('stopping ble scan, found device: ' + angular.toJson(deviceShort));
        resolve(deviceShort);
      }, 1000);
    });
  };

  this.stopScan = function() {
    return $q(function(resolve, reject) {
      $log.info('stopping ble scan');
      $timeout(resolve, 100);
    });
  };

  this.setColor = function(color) {
    return $q(function(resolve, reject) {
      $log.info('setting color to ' + color);
      $timeout(resolve, 100);
    });
  };

  this.connect = function(deviceID) {
    return $q(function(resolve, reject) {
      // use stored experienceID, if not passed
      if (typeof deviceID === 'undefined') deviceID = model.experienceID;
      if (!deviceID) reject('device id to connect not provided');
      $log.info('connecting to ' + deviceID);
      $timeout(function() {
        $log.info('connected to ' + deviceID);
        model.connected = true;
        model.experienceID = deviceID;
        resolve(deviceFull);
      }, 1000);
    });
  },

  this.disconnect = function(deviceID) {
    return $q(function(resolve, reject) {
      if (typeof deviceID === 'undefined') deviceID = model.experienceID;
      if (!deviceID) reject('device id to connect not provided');
      $log.info('disconnecting from ' + deviceID);
      ble.disconnect(deviceID, resolve, reject);
    });
  };

  $rootScope.$on('savestate', this.saveState);
  $rootScope.$on('restorestate', this.restoreState);
})

;
