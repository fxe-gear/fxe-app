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

  var saveState = function() {
    window.localStorage.userService = angular.toJson(model);
    $log.info('userService state saved');
  };

  var restoreState = function() {
    if (window.localStorage.userService) {
      prevModel = angular.fromJson(window.localStorage.userService);
      angular.copy(prevModel, model);
      $rootScope.$apply();
    }

    $log.info('userService state restored');
  };

  $rootScope.$on('pause', saveState);
  $rootScope.$on('resume', restoreState);

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
    window.plugins.googleplus.login({offline: true}, function(response) {
      model.provider = 'google';
      model.accessToken = response.oauthToken;
      model.expiresIn = 0;

      model.email = response.email;
      model.name = response.displayName;

      if (response.gender) model.gender = response.gender; // Android only
      if (response.birthday) model.birthday = response.birthday; // Android only

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
      model.birthday = response.data.birthday;
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
  this.model = model;
  this.loginFacebook = loginFacebook;
  this.loginGoogle = loginGoogle;
  this.loadFromFacebook = loadFromFacebook;
  this.loadFromGoogle = loadFromGoogle;
})

// ------------------------------------------------------------------------------------------------

.constant('peripheralServices', {
  experience: {
    uuid: '6b00',
    characteristics: {
      control: {uuid: '6bff'},
      amplitude: {uuid: '6b04'},
      rhythm: {uuid: '6b05'},
      frequency: {uuid: '6b06'},
    },
  },
  led: {
    uuid: '6c00',
    characteristics: {
      led: {uuid: '6c01'},
    },
  },
})

.service('experienceService', function($rootScope, $cordovaBLE, $q, $log, peripheralServices) {
  var ps = peripheralServices;

  var connected = false;
  var scanning = false;

  var model = {
    deviceID: '',
    paired: false,
    score: {
      amplitude: 0,
      rhythm: 0,
      frequency: 0,
    },
    ignoredIDs: [],
  };

  var saveState = function() {
    window.localStorage.experienceService = angular.toJson(model);
    $log.info('experienceService state saved');
  };

  var restoreState = function() {
    $log.info('experienceService state restored');
    if (window.localStorage.experienceService) {
      prevModel = angular.fromJson(window.localStorage.experienceService);
      angular.copy(prevModel, model);
      $rootScope.$apply();
    }
  };

  $rootScope.$on('pause', saveState);
  $rootScope.$on('resume', restoreState);

  var enable = function() {
    var q = $q.defer();

    if (typeof ble === 'undefined') {
      // check for ble plugin
      $log.error('ble module not avalible');
      q.reject();
    } else {
      $cordovaBLE.isEnabled()
      .then(function() {  // already enabled
        q.resolve();
      })
      .catch(function(error) { // not enabled
        if (typeof ble.enable === 'undefined') {
          // iOS doesn't have ble.enable
          $log.warning('cannot enable bluetooth, probably on iOS');
          q.reject();
        } else {
          // Android
          $log.debug('enabling bluetooth');
          $cordovaBLE.enable().then(function() {
            $log.info('bluetooth enabled');
            q.resolve();
          }).catch(function(error) {
            $log.warning('bluetooth not enabled');
            q.reject(error);
          });
        }
      });
    }

    return q.promise;
  };

  var scan = function() {
    var q = $q.defer();
    scanning = true;
    $cordovaBLE.startScan([ps.experience.uuid], function(device) {
      if (model.ignoredIDs.indexOf(device.id) == -1) {
        $log.info('found ' + device.id);
        stopScan().then(function() {
          q.resolve(device);
        });
      } else {
        $log.info('found ignored ' + device.id);
        q.notify(device);
      }
    }, q.reject);
    $log.info('scanning started');
    return q.promise;
  };

  var stopScan = function() {
    if (!scanning) return $q.resolve();
    $log.debug('stopping ble scan');
    return $cordovaBLE.stopScan().then(function(result) {
      $log.info('scanning stopped');
      scanning = false;
      return result;
    }).catch(function(error) {
      $log.error('scanning stop failed');
      throw error;
    });
  };

  var connect = function(deviceID) {
    $log.debug('connecting to ' + deviceID);
    return $cordovaBLE.connect(deviceID).then(function(device) {
      $log.info('connected to ' + deviceID);
      connected = true;
      model.deviceID = deviceID;
      return device;
    }).catch(function(error) {
      $log.error('connecting to ' + deviceID + ' failed');
      throw error;
    });
  };

  var reconnect = function() {
    if (!model.paired) throw 'unable to reconnect, no device is paired';
    return connect(model.deviceID);
  };

  var disconnect = function() {
    if (!connected) return $q.resolve();
    $log.debug('disconnecting from ' + model.deviceID);

    return $cordovaBLE.disconnect(model.deviceID).then(function(result) {
      $log.info('disconnected from ' + model.deviceID);
      connected = false;
      return result;
    }).catch(function(error) {
      $log.error('disconnecting from ' + deviceID + ' failed');
      throw error;
    });
  };

  var ignore = function() {
    if (!model.deviceID) return;
    if (model.ignoredIDs.indexOf(model.deviceID) == -1) {
      model.ignoredIDs.push(model.deviceID);
    }

    $log.info(model.deviceID + ' added to ignore list');
  };

  var clearIgnored = function() {
    model.ignoredIDs = [];
  };

  var setColor = function(color) {
    if (!connected) return $q.resolve();
    $log.debug('setting color to ' + color);

    var data = new Uint8Array(3);
    data[0] = parseInt(color.substring(1, 3), 16); // red
    data[1] = parseInt(color.substring(3, 5), 16); // green
    data[2] = parseInt(color.substring(5, 7), 16); // blue
    // TODO use reliable write - sometimes throws error number 133
    return $cordovaBLE.writeWithoutResponse(model.deviceID, ps.led.uuid, ps.led.characteristics.led.uuid, data.buffer).then(function() {
      $log.info('color set to ' + color);
    }).catch(function(error) {
      $log.error('setting color failed');
      throw error;
    });
  };

  var clearColor = function() {
    return setColor('#000000');
  };

  var startMeasurement = function(notificationCallback) {
    $log.debug('starting measurement');
    var data = new Float32Array([0]);

    // delete previous scores
    return $cordovaBLE.write(model.deviceID, ps.experience.uuid, ps.experience.characteristics.amplitude.uuid, data.buffer)
    .then($cordovaBLE.write(model.deviceID, ps.experience.uuid, ps.experience.characteristics.rhythm.uuid, data.buffer))
    .then($cordovaBLE.write(model.deviceID, ps.experience.uuid, ps.experience.characteristics.frequency.uuid, data.buffer))

    // register callbacks
    .then(function() {
      $cordovaBLE.startNotification(model.deviceID, ps.experience.uuid, ps.experience.characteristics.amplitude.uuid, function(data) {
        model.score.amplitude = new Float32Array(data)[0];
        notificationCallback();
      });

      $cordovaBLE.startNotification(model.deviceID, ps.experience.uuid, ps.experience.characteristics.rhythm.uuid, function(data) {
        model.score.rhythm = new Float32Array(data)[0];
        notificationCallback();
      });

      $cordovaBLE.startNotification(model.deviceID, ps.experience.uuid, ps.experience.characteristics.frequency.uuid, function(data) {
        model.score.frequency = new Float32Array(data)[0];
        notificationCallback();
      });
    })

    // start measurement
    .then($cordovaBLE.write(model.deviceID, ps.experience.uuid, ps.experience.characteristics.control.uuid, new Uint8Array([0x1]).buffer))
    .then(function() {
      $log.info('measurement started');
    })
    .catch(function(error) {
      $log.error('starting measurement failed');
      throw error;
    });
  };

  var stopMeasurement = function() {
    $log.debug('stopping measurement');

    // stop measurement
    return $cordovaBLE.write(model.deviceID, ps.experience.uuid, ps.experience.characteristics.control.uuid, new Uint8Array([0xff]).buffer)

    // unregister callbacks
    .then($cordovaBLE.stopNotification(model.deviceID, ps.experience.uuid, ps.experience.characteristics.amplitude.uuid))
    .then($cordovaBLE.stopNotification(model.deviceID, ps.experience.uuid, ps.experience.characteristics.rhythm.uuid))
    .then($cordovaBLE.stopNotification(model.deviceID, ps.experience.uuid, ps.experience.characteristics.frequency.uuid))

    .then(function() {
      $log.info('measurement stopped');
    })

    .catch(function(error) {
      $log.error('stopping measurement failed');
      throw error;
    });
  };

  // service public API
  this.model = model; // TODO dev only
  this.score = model.score;
  this.paired = model.paired;
  this.enable = enable;
  this.scan = scan;
  this.stopScan = stopScan;
  this.connect = connect;
  this.reconnect = reconnect;
  this.disconnect = disconnect;
  this.ignore = ignore;
  this.clearIgnored = clearIgnored;
  this.setColor = setColor;
  this.clearColor = clearColor;
  this.startMeasurement = startMeasurement;
  this.stopMeasurement = stopMeasurement;

})

;
