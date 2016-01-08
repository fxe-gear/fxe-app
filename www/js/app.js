'use strict';

angular.module('experience', [
  'ionic',
  'experience.controllers',
  'experience.routes',
  'experience.services',
  'talis.services.logging',
])

.run(function($ionicPlatform, $rootScope, $state, experienceService) {
  $ionicPlatform.ready(function() {

    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }

    if (window.StatusBar) {
      StatusBar.styleLightContent();
    }
  });

  $rootScope.platform = ionic.Platform.platform();

  $rootScope.$on('pause', function(e) {
    // experienceService.stopScan();
    // experienceService.disconnect();
    // $state.go('welcome');
  });

  document.addEventListener('resume', function(event) {
    $rootScope.$broadcast('resume');
  });

  document.addEventListener('pause', function(event) {
    $rootScope.$broadcast('pause');
  });

  // related to live reload
  window.onbeforeunload = function(e) {
    experienceService.disconnect();
    $rootScope.$broadcast('liveunload');
    return; // must explicitly return
  };

  // related to live reload
  window.onload = function(e) {
    $rootScope.$broadcast('livereload');
    // $state.go('welcome');
  };

});

'use strict';

// Chart.js colors
Chart.defaults.global.scaleFontColor = 'rgba(255, 255, 255, 0.8)';
// Chart.defaults.global.scaleLineColor = 'rgba(255, 255, 255, .1)';
Chart.defaults.global.colours = [
  {
    fillColor: 'rgba(156, 207, 40, 0.2)',
    strokeColor: 'rgba(156, 207, 40, 1)',
    pointColor: 'rgba(156, 207, 40, 1)',
    pointStrokeColor: 'rgba(255, 255, 255, 0.8)',
    pointHighlightFill: 'rgba(255, 255, 255, 1)',
    pointHighlightStroke: 'rgba(156, 207, 40, 0.8)',
  },
  {
    fillColor: 'rgba(8, 72, 135, 0.2)',
    strokeColor: 'rgba(8, 72, 135, 1)',
    pointColor: 'rgba(8, 72, 135, 1)',
    pointStrokeColor: 'rgba(255, 255, 255, 0.8)',
    pointHighlightFill: 'rgba(255, 255, 255, 1)',
    pointHighlightStroke: 'rgba(8, 72, 135,0.8)',
  },
  {
    fillColor: 'rgba(60, 22, 66, 0.2)',
    strokeColor: 'rgba(60, 22, 66, 1)',
    pointColor: 'rgba(60, 22, 66, 1)',
    pointStrokeColor: 'rgba(255, 255, 255, 0.8)',
    pointHighlightFill: 'rgba(255, 255, 255, 1)',
    pointHighlightStroke: 'rgba(60, 22, 66, 0.8)',
  },
  { // grey
    fillColor: 'rgba(148,159,177,0.2)',
    strokeColor: 'rgba(148,159,177,1)',
    pointColor: 'rgba(148,159,177,1)',
    pointStrokeColor: 'rgba(255, 255, 255, 0.8)',
    pointHighlightFill: 'rgba(255, 255, 255, 1)',
    pointHighlightStroke: 'rgba(148,159,177,0.8)',
  },
];

'use strict';

angular.module('experience.routes', [])

.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider.state('welcome', {
    url: '/welcome',
    templateUrl: 'templates/welcome.html',
    controller: 'WelcomeController',
  });

  $stateProvider.state('create-account', {
    url: '/create-account',
    templateUrl: 'templates/create-account.html',
    controller: 'CreateAccountController',
  });

  $stateProvider.state('login', {
    url: '/login',
    templateUrl: 'templates/login.html',
    controller: 'LoginController',
  });

  $stateProvider.state('scanning', {
    url: '/scanning',
    templateUrl: 'templates/scanning.html',
    controller: 'ScanningController',
  });

  $stateProvider.state('pairing', {
    url: '/pairing',
    templateUrl: 'templates/pairing.html',
    controller: 'PairingController',
  });

  $stateProvider.state('main', {
    url: '/main',
    abstract: true,
    templateUrl: 'templates/main/main.html',
  });

  $stateProvider.state('main.jumping', {
    url: '/jumping',
    views: {
      jump: {
        templateUrl: 'templates/main/jumping.html',
        controller: 'JumpingController',
      },
    },
  });

  $stateProvider.state('main.me', {
    url: '/me',
    abstract: true,
    views: {
      me: {
        templateUrl: 'templates/main/me/me.html',
      },
    },
  });

  $stateProvider.state('main.me.last', {
    url: '/last',
    views: {
      lesson: {
        templateUrl: 'templates/main/me/last.html',
        controller: 'LessonController',
      },
    },
  });

  $stateProvider.state('main.settings', {
    url: '/settings',
    views: {
      settings: {
        templateUrl: 'templates/main/settings.html',
        controller: 'SettingsController',
      },
    },
  });

  $urlRouterProvider.otherwise(function($injector, $location) {
    var userService = $injector.get('userService');
    var storeService = $injector.get('storeService');

    if (storeService.isPaired() && userService.isLoggedIn())
      return '/main/jumping';
    if (!storeService.isPaired() && userService.isLoggedIn())
      return '/scanning';
    else
      return '/welcome';
  });

});

'use strict';

var module = angular.module('experience.controllers', [
  'chart.js',
]);

var WelcomeController = function($scope, $state, $ionicPopup, userService) {
  $scope.user = userService.model;

  $scope.loginFacebook = function() {
    userService.loginFacebook()
    .then(userService.loadFromFacebook)
    .then(function() {
      $state.go('scanning');
    }).catch(function(error) {
      $ionicPopup.alert({
        title: 'Facebook login failed.',
        template: 'Please try again.',
        okType: 'button-assertive',
      });
    });
  };

  $scope.loginGoogle = function() {
    userService.loginGoogle()
    .then(userService.loadFromGoogle)
    .then(function() {
      $state.go('scanning');
    }).catch(function(error) {
      $ionicPopup.alert({
        title: 'Google login failed.',
        template: 'Please try again.',
        okType: 'button-assertive',
      });
    });
  };
};

module.controller('WelcomeController', WelcomeController);

// ------------------------------------------------------------------------------------------------

var CreateAccountController = function($scope, $state, $ionicPopup, userService) {
  $scope.update = function(data) {
    // TODO do NOT copy whole model (overrides other model data)
    angular.copy(data, userService.model);
    $state.go('scanning');
  };
};

module.controller('CreateAccountController', CreateAccountController);

// ------------------------------------------------------------------------------------------------

var LoginController = function($scope, $state, $ionicPopup, userService) {
  $scope.user = userService.model;
};

module.controller('LoginController', LoginController);

// ------------------------------------------------------------------------------------------------

var ScanningController = function($scope, $state, $ionicPopup, experienceService) {

  $scope.status = 'Starting...';
  $scope.working = true;

  $scope.clearIgnored = function() {
    experienceService.clearIgnored();
    experienceService.stopScan().then(enter);
  };

  var enter = function() {
    $scope.ignoredDevices = 0;
    enableBluetooth()
    .then(disconnect)
    .then(scan)
    .then(connect)
    .then(function() {
      // prevent changing state when the process has aleready been canceled
      // if ($state.current.controller != 'ScanningController') return;
      $state.go('pairing');
    }, null, function(device) {
      // ignored device found
      $scope.ignoredDevices++;
    });
  };

  $scope.tryAgain = enter;

  var enableBluetooth = function() {
    $scope.working = true;
    $scope.status = 'Enabling bluetooth...';
    return experienceService.enable().catch(function(error) {
      $scope.working = false;
      $scope.status = 'Cannot enable bluetooth. Please enable it manually.';
      throw error;
    });
  };

  var disconnect = function() {
    $scope.working = true;
    $scope.status = 'Disconnecting previously connected devices...';
    return experienceService.disconnect().catch(function(error) {
      $scope.working = false;
      $scope.status = 'Disconnecting failed';
      throw error;
    });
  };

  var scan = function() {
    $scope.working = true;
    $scope.status = 'Scanning...';
    return experienceService.scan().catch(function(error) {
      $scope.working = false;
      $scope.status = 'Scanning failed';
      throw error;
    });
  };

  var connect = function(device) {
    $scope.working = true;
    $scope.status = 'Connecting...';
    return experienceService.connect(device).catch(function(error) {
      $scope.working = false;
      $scope.status = 'Connecting failed';
      throw error;
    });
  };

  var exit = function() {
    $scope.working = false;
    $scope.status = 'Ready';
    return experienceService.stopScan();
  };

  $scope.$on('$ionicView.enter', enter);
  $scope.$on('$ionicView.exit', exit);
};

module.controller('ScanningController', ScanningController);

// ------------------------------------------------------------------------------------------------

var PairingController = function($scope, $state, $ionicHistory, $ionicPopup, experienceService, util) {
  var colors = {red: '#ff0000', green: '#00ff00', blue: '#0000ff', yellow: '#ffff00', white: '#ffffff', cyan: '#00ffff'};
  var colorNamesShuffled = util.shuffle(Object.keys(colors));

  $scope.stepCount = 4;
  $scope.step = 0;

  var setRandomColor = function() {
    $scope.colorName = colorNamesShuffled[$scope.step];
    $scope.color = colors[$scope.colorName];
    return experienceService.setColor($scope.color);
  };

  $scope.yes = function() {
    if ($scope.step + 1 >= $scope.stepCount) {
      // on the end of pairing process
      experienceService.pair();
      experienceService.setColor(colors.blue);
      $ionicHistory.nextViewOptions({historyRoot: true});
      return $state.go('main.jumping');
    }

    $scope.step++;
    setRandomColor().catch(function(error) {
      $ionicPopup.alert({
        title: 'Pairing process failed.',
        template: 'Cannot communicate with Experience, please try it again.',
        okType: 'button-assertive',
      })
      .then(experienceService.disconnect)
      .then(function() {
        return $state.go('scanning');
      });
    });
  };

  $scope.no = function() {
    $ionicPopup.alert({
      title: 'Paring failed',
      template: 'Sorry, we have unintentionally connected to another Experience. Please try it again.',
      okType: 'button-energized',
    })
    .then(experienceService.clearColor)
    .then(experienceService.ignore)
    .then(experienceService.disconnect)
    .then(function() {
      return $state.go('scanning');
    }).catch(function(error) {
      $state.go('scanning');
      throw error;
    });
  };

  $scope.cannotRecognize = function() {
    // TODO
  };

  $scope.$on('$ionicView.beforeEnter', function() {
    $scope.step = 0;
    setRandomColor();
  });
};

module.controller('PairingController', PairingController);

// ------------------------------------------------------------------------------------------------

var JumpingController = function($scope, $state, $ionicPlatform, $interval, $timeout, experienceService) {
  var timer = null;

  $scope.running = false;

  $scope.isConnected = experienceService.isConnected;
  $scope.getElapsedTime = experienceService.getElapsedTime;

  var reconnect = function() {
    experienceService.enable()
    .then(experienceService.reconnect)
    .then(function() {
      $scope.connected = experienceService.isConnected();
    }).catch(function(error) {
      // if connecting failed, try again in 3 sec
      $timeout($scope.reconnect, 3000);
      throw error;
    });
  };

  $scope.getScore = function() {
    return experienceService.getCumulativeScore().toFixed(2);
  };

  $scope.start = function() {
    experienceService.startMeasurement().then(function() {
      $scope.running = true;
      timer = $interval($scope.apply, 1000);
    });
  };

  $scope.stop = function() {
    experienceService.stopMeasurement().then(function() {
      $scope.running = false;
      $interval.cancel(timer);
      $state.go('main.me.last');
    });
  };

  $ionicPlatform.ready(function() {
    reconnect();
  });
};

module.controller('JumpingController', JumpingController);

// ------------------------------------------------------------------------------------------------

var LessonController = function($scope, storeService) {
  $scope.labels = ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00'];
  $scope.data = [[28, 48, 40, 19, 86, 27, 90]];

  $scope.score = 0;
  $scope.duration = 0;

  var getLastLessonData = function() {
    storeService.getLastLessonStartTime().then(function(startTime) {
      if (!startTime) {
        console.log('no last lesson found');
        return;
      }

      storeService.getLessonCumulativeScore(startTime).then(function(score) {
        $scope.score = score.toFixed(2);
      });

      storeService.getLessonDuration(startTime).then(function(duration) {
        $scope.duration = duration;
      });
    });
  };

  $scope.$on('$ionicView.enter', function() {
    getLastLessonData();
  });
};

module.controller('LessonController', LessonController);

// ------------------------------------------------------------------------------------------------

var SettingsController = function($scope, $state, $localStorage, $cordovaSQLite, experienceService) {
  $scope.clearAll = function() {
    experienceService.disconnect();
    $localStorage.$reset();
    $cordovaSQLite.deleteDB({name: 'store.sqlite'});
    $state.go('welcome');
  };
};

module.controller('SettingsController', SettingsController);

'use strict';

// downloaded from: http://engineering.talis.com/articles/client-side-error-logging/

var loggingModule = angular.module('talis.services.logging', []);

loggingModule.service('stackTraceService', function() {
  return StackTrace;
});

loggingModule.provider('$exceptionHandler', {
  $get: function(exceptionLoggingService) {
    return (exceptionLoggingService);
  },
});

loggingModule.factory('exceptionLoggingService', ['$log', '$window', 'stackTraceService', function($log, $window, stackTraceService) {
  function error(exception, cause) {
    $log.error.apply($log, arguments);
    var errorMessage = exception.toString();

    stackTraceService.fromError(exception).then(function(stacktrace) {
      try {
        // do NOT use angular service
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open('POST', 'http://experience.tbedrich.cz/api/v1/log');
        xmlhttp.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
        xmlhttp.send(angular.toJson({
          url: $window.location.href,
          message: errorMessage,
          type: 'exception',
          stackTrace: stacktrace,
          cause: (cause || ''),
        }));
        $log.info('Error logged to remote server.');
      } catch (loggingError) {
        $log.warn('Logging error to remote server failed.');
        $log.log(loggingError);
      }
    });
  };

  return (error);
}]);

'use strict';

angular.module('experience.services', [
  'ngCordova',
  // 'ngCordovaMocks',
  'ngStorage',
])

.filter('msToTimeSpan', function() {
  return function(ms) {
    return new Date(1970, 0, 1).setSeconds(0, ms);
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

.service('userService', function($rootScope, $localStorage, $http, $log, $cordovaFacebook, $q) {

  $localStorage.$default({
    userService: {
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
    },
  });
  var model = $localStorage.userService;

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

  var isLoggedIn = function() {
    return model.provider != '';
  };

  // service public API
  this.model = model;
  this.isLoggedIn = isLoggedIn;
  this.loginFacebook = loginFacebook;
  this.loginGoogle = loginGoogle;
  this.loadFromFacebook = loadFromFacebook;
  this.loadFromGoogle = loadFromGoogle;
})

// ------------------------------------------------------------------------------------------------

// thin wrapper on the top of SQL storage providing JS API to persistent data
.service('storeService', function($cordovaSQLite, $localStorage, $q, $log) {

  $localStorage.$default({deviceID: null});
  $localStorage.$default({pairedID: null});
  $localStorage.$default({ignoredIDs: []});

  var db;

  var getDB = function() {
    // $cordovaSQLite.deleteDB({name: 'store.sqlite'}); // run after schema change
    if (!db) {
      db = $cordovaSQLite.openDB({name: 'store.sqlite', bgType: true, version: '0.1.0'});
      createSchema(db);
    }

    return db;
  };

  var createSchema = function(db) {
    $cordovaSQLite.execute(db, 'CREATE TABLE IF NOT EXISTS lesson (start_time DATETIME PRIMARY KEY, end_time DATETIME)');
    $cordovaSQLite.execute(db, 'CREATE TABLE IF NOT EXISTS score (start_time DATETIME NOT NULL, time DATETIME PRIMARY KEY, score FLOAT NOT NULL, type TINYINT)');
  };

  var addLesson = function(startTime) {
    var query = 'INSERT INTO lesson (start_time) VALUES (?)';
    return $cordovaSQLite.execute(getDB(), query, [startTime]);
  };

  var addScore = function(startTime, time, score, type) {
    var query = 'INSERT INTO score (start_time, time, score, type) VALUES (?, ?, ?, ?)';
    return $cordovaSQLite.execute(getDB(), query, [startTime, time, score, type]);
  };

  var setLessonStopTime = function(startTime, endTime) {
    var query = 'UPDATE lesson SET end_time = ? WHERE start_time = ?';
    return $cordovaSQLite.execute(getDB(), query, [endTime, startTime]);
  };

  var getLessonDuration = function(startTime) {
    var q = $q.defer();

    var query = 'SELECT (end_time - start_time) AS duration FROM lesson WHERE start_time = ?';
    $cordovaSQLite.execute(getDB(), query, [startTime]).then(function(res) {
      q.resolve((res.rows.length > 0) ? res.rows.item(0).duration : 0);
    }).catch(function(err) {
      $log.error('DB select failed');
      q.reject(err);
    });

    return q.promise;
  };

  var getLessonCumulativeScore = function(startTime) {
    var q = $q.defer();

    var query = 'SELECT score FROM score WHERE start_time = ? ORDER BY time DESC LIMIT 1';
    $cordovaSQLite.execute(getDB(), query, [startTime]).then(function(res) {
      q.resolve((res.rows.length > 0) ? res.rows.item(0).score : 0);
    }).catch(function(err) {
      $log.error('getting lesson cumulative score failed');
      q.reject(err);
    });

    return q.promise;
  };

  var getLastLessonStartTime = function() {
    var q = $q.defer();

    var query = 'SELECT start_time AS startTime FROM lesson ORDER BY start_time DESC LIMIT 1';
    $cordovaSQLite.execute(getDB(), query).then(function(res) {
      q.resolve((res.rows.length > 0) ? res.rows.item(0).startTime : 0);
    }).catch(function(err) {
      $log.error('getting last lesson start time failed');
      q.reject(err);
    });

    return q.promise;
  };

  var setDeviceID = function(id) {
    $localStorage.deviceID = id;
  };

  var getDeviceID = function() {
    return $localStorage.deviceID;
  };

  var getPairedID = function() {
    return $localStorage.pairedID;
  };

  var setPairedID = function(id) {
    $localStorage.pairedID = id;
  };

  var isPaired = function() {
    return $localStorage.pairedID;
  };

  var ignore = function(deviceID) {
    if (!isIgnored(deviceID)) {
      $localStorage.ignoredIDs.push(deviceID);
    }
  };

  var isIgnored = function(deviceID) {
    return $localStorage.ignoredIDs.indexOf(deviceID) != -1;
  };

  var clearIgnored = function() {
    $localStorage.ignoredIDs = [];
  };

  // sqlite related service API
  this.addLesson = addLesson;
  this.addScore = addScore;
  this.setLessonStopTime = setLessonStopTime;
  this.getLessonDuration = getLessonDuration;
  this.getLessonCumulativeScore = getLessonCumulativeScore;
  this.getLastLessonStartTime = getLastLessonStartTime;

  // local storage related service API
  this.setDeviceID = setDeviceID;
  this.getDeviceID = getDeviceID;
  this.setPairedID = setPairedID;
  this.getPairedID = getPairedID;
  this.isPaired = isPaired;
  this.ignore = ignore;
  this.isIgnored = isIgnored;
  this.clearIgnored = clearIgnored;

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

.service('experienceService', function($rootScope, $cordovaBLE, $q, $log, storeService, peripheralServices) {
  var ps = peripheralServices;

  var connected = false;
  var scanning = false;
  var score = {
    amplitude: 0,
    rhythm: 0,
    frequency: 0,
  };
  var startTime = null;
  var stopTime = null;

  var enable = function() {
    var q = $q.defer();

    // TODO horrible hack
    function checkBle() {
      if (typeof ble === 'undefined') {
        window.setTimeout(checkBle, 100);
      } else {
        $cordovaBLE.isEnabled().then(function() {  // already enabled
          q.resolve();
        }).catch(function(error) { // not enabled
          if (typeof ble.enable === 'undefined') {
            // iOS doesn't have ble.enable
            q.reject('cannot enable bluetooth, probably on iOS');
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
    }

    checkBle();

    return q.promise;
  };

  var scan = function() {
    var q = $q.defer();
    $log.debug('starting ble scan');
    scanning = true;

    $cordovaBLE.startScan([ps.experience.uuid], function(device) {
      var deviceID = device.id;
      if (storeService.isPaired()) { // paired
        if (storeService.getPairedID() == deviceID) { // found paired device
          $log.info('found paired ' + deviceID);
          stopScan().then(function() { q.resolve(deviceID); });
        } else { // found another (not paired) device
          $log.info('found not paired ' + deviceID);
        }

      } else { // not paired yet
        if (!storeService.isIgnored(deviceID)) { // found new (not ignored) device
          $log.info('found ' + deviceID);
          stopScan().then(function() { q.resolve(deviceID); });
        } else { // found ignored
          $log.info('found ignored ' + deviceID);
          q.notify(deviceID);
        }
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
      storeService.setDeviceID(deviceID);
      return deviceID;
    }).catch(function(error) {
      $log.error('connecting to ' + deviceID + ' failed');
      throw error;
    });
  };

  var reconnect = function() {
    if (!storeService.isPaired()) return $q.reject('unable to reconnect, no device is paired');
    if (connected) return $q.resolve();
    return scan().then(connect);
  };

  var disconnect = function() {
    if (!connected) return $q.resolve();
    $log.debug('disconnecting from ' + storeService.getDeviceID());

    return $cordovaBLE.disconnect(storeService.getDeviceID()).then(function(result) {
      $log.info('disconnected from ' + storeService.getDeviceID());
      connected = false;
      return result;
    }).catch(function(error) {
      $log.error('disconnecting from ' + deviceID + ' failed');
      throw error;
    });
  };

  var ignore = function() {
    if (!storeService.getDeviceID()) return;
    storeService.ignore(storeService.getDeviceID());
    $log.info(storeService.getDeviceID() + ' added to ignore list');
  };

  var clearIgnored = function() {
    storeService.clearIgnored();
  };

  var setColor = function(color) {
    if (!connected) return $q.resolve();
    $log.debug('setting color to ' + color);

    var data = new Uint8Array(3);
    data[0] = parseInt(color.substring(1, 3), 16); // red
    data[1] = parseInt(color.substring(3, 5), 16); // green
    data[2] = parseInt(color.substring(5, 7), 16); // blue
    // TODO use reliable write - sometimes throws error number 133
    return $cordovaBLE.write(storeService.getDeviceID(), ps.led.uuid, ps.led.characteristics.led.uuid, data.buffer).then(function() {
      $log.info('color set to ' + color);
    }).catch(function(error) {
      $log.error('setting color failed');
      throw error;
    });
  };

  var clearColor = function() {
    return setColor('#000000');
  };

  var startMeasurement = function() {
    if (!connected) return $q.reject('experience not connected');
    $log.debug('starting measurement');
    var zeroScore = new Float32Array([0]);

    var scoreCallback = function(data) {
      // TODO separate different characteristic types
      score.amplitude = new Float32Array(data)[0];
      storeService.addScore(startTime, Date.now(), getCumulativeScore(), null);
    };

    // delete previous scores
    score.amplitude = 0;
    return $cordovaBLE.write(storeService.getDeviceID(), ps.experience.uuid, ps.experience.characteristics.amplitude.uuid, zeroScore.buffer)
    .then($cordovaBLE.write(storeService.getDeviceID(), ps.experience.uuid, ps.experience.characteristics.rhythm.uuid, zeroScore.buffer))
    .then($cordovaBLE.write(storeService.getDeviceID(), ps.experience.uuid, ps.experience.characteristics.frequency.uuid, zeroScore.buffer))

    // register callbacks
    .then(function() {
      $cordovaBLE.startNotification(storeService.getDeviceID(), ps.experience.uuid, ps.experience.characteristics.amplitude.uuid, scoreCallback);
      $cordovaBLE.startNotification(storeService.getDeviceID(), ps.experience.uuid, ps.experience.characteristics.rhythm.uuid, scoreCallback);
      $cordovaBLE.startNotification(storeService.getDeviceID(), ps.experience.uuid, ps.experience.characteristics.frequency.uuid, scoreCallback);
    })

    // start measurement
    .then($cordovaBLE.write(storeService.getDeviceID(), ps.experience.uuid, ps.experience.characteristics.control.uuid, new Uint8Array([0x1]).buffer))
    .then(function() {
      startTime = Date.now();
      stopTime = null;
      storeService.addLesson(startTime);
      $log.info('measurement started');
    })
    .catch(function(error) {
      $log.error('starting measurement failed');
      throw error;
    });
  };

  var stopMeasurement = function() {
    if (!connected) return $q.reject('experience not connected');
    $log.debug('stopping measurement');

    // stop measurement
    return $cordovaBLE.write(storeService.getDeviceID(), ps.experience.uuid, ps.experience.characteristics.control.uuid, new Uint8Array([0xff]).buffer)

    // unregister callbacks
    .then($cordovaBLE.stopNotification(storeService.getDeviceID(), ps.experience.uuid, ps.experience.characteristics.amplitude.uuid))
    .then($cordovaBLE.stopNotification(storeService.getDeviceID(), ps.experience.uuid, ps.experience.characteristics.rhythm.uuid))
    .then($cordovaBLE.stopNotification(storeService.getDeviceID(), ps.experience.uuid, ps.experience.characteristics.frequency.uuid))

    .then(function() {
      stopTime = Date.now();
      storeService.setLessonStopTime(startTime, stopTime);
      $log.info('measurement stopped');
    })

    .catch(function(error) {
      $log.error('stopping measurement failed');
      throw error;
    });
  };

  var sendCommand = function(cmd) {
    if (!connected) return $q.reject('experience not connected');
    $log.debug('sending command ' + cmd);
    var data = new Uint8Array([cmd]).buffer;
    return $cordovaBLE.writeWithoutResponse(storeService.getDeviceID(), ps.experience.uuid, ps.experience.characteristics.control.uuid, data)
    .then(function() {
      $log.info('command ' + cmd + ' sent');
    }).catch(function(error) {
      $log.error('sending command failed');
      throw error;
    });
  };

  var getElapsedTime = function() {
    // return elapsed time from start of measurement (in milliseconds)
    return startTime != null ? (stopTime != null ? stopTime : Date.now()) - startTime : 0;
  };

  var pair = function() {
    $log.info('device ' + storeService.getDeviceID() + ' paired');
    storeService.setPairedID(storeService.getDeviceID());
  };

  var isConnected = function() {
    return connected;
  };

  var getScore = function() {
    return score;
  };

  var getCumulativeScore = function() {
    var s = getScore();
    return s.amplitude + s.rhythm + s.frequency;
  };

  // service public API
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
  this.sendCommand = sendCommand;
  this.getElapsedTime = getElapsedTime;
  this.pair = pair;
  this.isConnected = isConnected;
  this.getScore = getScore;
  this.getCumulativeScore = getCumulativeScore;

})

;
