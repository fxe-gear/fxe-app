angular.module('experience.services', [])

.filter('secondsToDateTime', function() {
  return function(seconds) {
    return new Date(1970, 0, 1).setSeconds(seconds);
  };
})

// ------------------------------------------------------------------------------------------------

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

// ------------------------------------------------------------------------------------------------

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

  $rootScope.$on('pause', this.saveState);
  $rootScope.$on('resume', this.restoreState);
})

// ------------------------------------------------------------------------------------------------

.constant('experienceServiceUUID', '6b00')
.constant('ledCharacteristicsUUID', '6b02')
.constant('controlCharacteristicsUUID', '6bff')

// scoring characteristics
.constant('amplitudeCharacteristicsUUID', '6b04')
.constant('rhythmCharacteristicsUUID', '6b05')
.constant('frequencyCharacteristicsUUID', '6b06')

.service('experienceService', function($rootScope, $cordovaBLE, $q, $log, experienceServiceUUID,
  ledCharacteristicsUUID, controlCharacteristicsUUID, amplitudeCharacteristicsUUID,
  rhythmCharacteristicsUUID, frequencyCharacteristicsUUID) {

  var model = {
    deviceID: '',
    connected: false,
    paired: false,
    score: {
      amplitude: 0,
      rhythm: 0,
      frequency: 0,
    },
  };
  this.model = model;
  this.paired = model.paired;

  this.enable = function() {
    return $q(function(resolve, reject) {

      if (typeof ble === 'undefined') {
        // check for ble plugin
        $log.error('ble module not avalible');
        reject();
      }

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
        $log.info('stopping ble scan, found ' + device.id);
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
    // use stored deviceID, if not passed
    $log.debug('connecting to ' + deviceID);
    return $cordovaBLE.connect(deviceID).then(function(device) {
      $log.info('connected to ' + deviceID);
      model.connected = true;
      model.deviceID = deviceID;
      return device;
    }).catch(function(error) {
      $log.error('connecting to ' + deviceID + ' failed');
      throw error;
    });
  };

  this.reconnect = function() {
    if (!model.paired) throw 'unable to reconnect, no device is paired';
    return connect(model.deviceID);
  };

  this.disconnect = function() {
    if (!model.connected) return;
    $log.debug('disconnecting from ' + model.deviceID);
    return $cordovaBLE.disconnect(model.deviceID).then(function(result) {
      $log.info('disconnected from ' + model.deviceID);
      model.connected = false;
      return result;
    }).catch(function(error) {
      $log.error('disconnecting from ' + deviceID + ' failed');
      throw error;
    });
  };

  this.setColor = function(color) {
    if (typeof color === 'undefined') color = '#000000';
    $log.debug('setting color to ' + color);

    var data = new Uint8Array(3);
    data[0] = parseInt(color.substring(1, 3), 16); // red
    data[1] = parseInt(color.substring(3, 5), 16); // green
    data[2] = parseInt(color.substring(5, 7), 16); // blue
    return $cordovaBLE.write(model.deviceID, experienceServiceUUID, ledCharacteristicsUUID, data.buffer).catch(function(error) {
      $log.error(error);
      throw error;
    });
  };

  this.startMeasurement = function(notificationCallback) {
    return $q(function(resolve, reject) {
      $log.debug('starting measurement');

      var errorHandler = function(error) {
        $log.error(error);
        reject(error);
      };

      // delete previous scores
      var data = new Uint8Array([0]);
      $cordovaBLE.write(model.deviceID, experienceServiceUUID, amplitudeCharacteristicsUUID, data.buffer)
      .then($cordovaBLE.write(model.deviceID, experienceServiceUUID, rhythmCharacteristicsUUID, data.buffer))
      .then($cordovaBLE.write(model.deviceID, experienceServiceUUID, frequencyCharacteristicsUUID, data.buffer));

      // register callbacks
      ble.startNotification(model.deviceID, experienceServiceUUID, amplitudeCharacteristicsUUID, function(data) {
        model.score.amplitude = new Float32Buffer(data)[0];
      }, errorHandler);

      ble.startNotification(model.deviceID, experienceServiceUUID, rhythmCharacteristicsUUID, function(data) {
        model.score.rhythm = new Float32Buffer(data)[0];
      }, errorHandler);

      ble.startNotification(model.deviceID, experienceServiceUUID, frequencyCharacteristicsUUID, function(data) {
        model.score.frequency = new Float32Buffer(data)[0];
      }, errorHandler);

      // start measurement
      $cordovaBLE.write(model.deviceID, experienceServiceUUID, controlCharacteristicsUUID, new Uint8Array([1]).buffer).catch(errorHandler);
      resolve();
    });

  };

  this.stopMeasurement = function() {
    return $q(function(resolve, reject) {
      $log.debug('stopping measurement');

      var errorHandler = function(error) {
        $log.error(error);
        reject(error);
      };

      // stop measurement
      $cordovaBLE.write(model.deviceID, experienceServiceUUID, controlCharacteristicsUUID, new Uint8Array([0]).buffer).catch(errorHandler);

      // unregister callbacks
      ble.stopNotification(model.deviceID, experienceServiceUUID, amplitudeCharacteristicsUUID, null, errorHandler);
      ble.stopNotification(model.deviceID, experienceServiceUUID, rhythmCharacteristicsUUID, null, errorHandler);
      ble.stopNotification(model.deviceID, experienceServiceUUID, frequencyCharacteristicsUUID, null, errorHandler);

      resolve();
    });

  };

})

;
