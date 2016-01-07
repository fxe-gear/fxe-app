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

// ------------------------------------------------------------------------------------------------

var SettingsController = function($scope, $localStorage, $cordovaSQLite) {
  $scope.clearAll = function() {
    $localStorage.$reset();
    $cordovaSQLite.deleteDB({name: 'store.sqlite'});
  };
};

module.controller('SettingsController', SettingsController);

module.controller('LessonController', LessonController);
