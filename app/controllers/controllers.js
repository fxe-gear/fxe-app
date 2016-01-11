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
    return experienceService.isConnected().then(function(connected) {
      if (connected) experienceService.disconnect();
    }).catch(function(error) {
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

  $scope.$on('$ionicView.beforeEnter', enter);
  $scope.$on('$ionicView.afterExit', exit);
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
      return experienceService.clearColor().then(function() {
        $ionicHistory.nextViewOptions({historyRoot: true});
        $state.go('main.jumping');
      });
    }

    $scope.step++;
    setRandomColor().catch(function(error) {
      $ionicPopup.alert({
        title: 'Pairing process failed.',
        template: 'Cannot communicate with Experience, please try it again.',
        okType: 'button-assertive',
      }).then(function() {
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

module.constant('reconnectTimeout', 3000); // in milliseconds

var JumpingController = function($scope, $state, $ionicPlatform, $ionicHistory, $interval, $timeout, experienceService, reconnectTimeout) {
  var timer = null;

  $scope.running = false;
  $scope.connected = false;

  $scope.getElapsedTime = experienceService.getElapsedTime;

  var reconnect = function() {
    experienceService.enable()
    .then(experienceService.reconnect)
    .then(experienceService.isConnected).then(function(connected) {
      $scope.connected = connected;
      if (!connected) {
        throw 'not connected, but reconnect resolved successfully, don\'t know why';
      }
    }).catch(function(error) {
      // if connecting failed, try again in 3 sec
      $timeout(reconnect, reconnectTimeout);
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
    }).catch(function(error) {
      // if connecting failed, try again in 3 sec
      $timeout(reconnect, reconnectTimeout);
      throw error;
    });
  };

  $scope.stop = function() {
    experienceService.stopMeasurement().then(function() {
      $interval.cancel(timer);

      // TODO go to nested state
      // https://gist.github.com/Deminetix/f7e0d9b91b685df5fc0d
      // http://codepen.io/TimothyKrell/pen/bnukj?editors=101
      $state.go('main.history').then(function() {
        $scope.running = false;
      });
    }).catch(function(error) {
      // if connecting failed, try again in 3 sec
      $timeout(reconnect, reconnectTimeout);
      throw error;
    });
  };

  $ionicPlatform.ready(function() {
    reconnect();
  });
};

module.controller('JumpingController', JumpingController);

// ------------------------------------------------------------------------------------------------

// interval used in diff graph (in seconds)
module.constant('diffGraphInterval', 90);

var LessonController = function($scope, storeService, diffGraphInterval, msToTimeSpanFilter, dateFilter, lesson) {

  $scope.lesson = lesson;

  var msToLabel = function(val) {
    return dateFilter(msToTimeSpanFilter(val), 'HH:mm:ss');
  };

  var prepareChartData = function() {
    storeService.getLessonDiffData(lesson.startTime, diffGraphInterval).then(function(data) {

      // fill labels
      $scope.chartLabels = [];
      for (var i = 0; i <= data.length; i++) {
        $scope.chartLabels.push(msToLabel(i * diffGraphInterval * 1e3)); // in milliseconds
      }

      // fill score
      $scope.chartData = [[0]];
      for (var i = 0; i < data.length; i++) {
        $scope.chartData[0].push(data[i]);
      }

    });
  };

  $scope.$on('$ionicView.beforeEnter', function() {
    prepareChartData();
  });
};

module.controller('LessonController', LessonController);

// ------------------------------------------------------------------------------------------------

var HistoryController = function($scope, lessons) {
  $scope.lessons = lessons;
};

module.controller('HistoryController', HistoryController);

// ------------------------------------------------------------------------------------------------

var SettingsController = function($scope, $state, $localStorage, $cordovaSQLite, experienceService) {

  $localStorage.$default({
    websocket: {
      ip: '127.0.0.1',
      port: 8237,
    },
  });
  $scope.extremesSubscribed = false;
  $scope.websocket = $localStorage.websocket;

  $scope.toggleSubscribeExtremes = function() {
    if (!$scope.extremesSubscribed) {
      experienceService.subscribeExtremes($scope.websocket.ip, $scope.websocket.port);
    } else {
      experienceService.unsubscribeExtremes();
    }

    $scope.extremesSubscribed = !$scope.extremesSubscribed;
  };

  $scope.clearAll = function() {
    $localStorage.$reset();
    $cordovaSQLite.deleteDB({name: 'store.sqlite'});
    experienceService.isConnected().then(function(connected) {
      if (connected) experienceService.disconnect();
    }).then(function() {
      $state.go('welcome');
    });
  };

};

module.controller('SettingsController', SettingsController);
