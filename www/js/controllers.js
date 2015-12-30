'use strict';

var module = angular.module('experience.controllers', []);

var WelcomeController = function($scope, $state, $ionicPopup, userService) {
  $scope.user = userService.model;

  $scope.loginFacebook = function() {
    userService.loginFacebook()
    .then(userService.loadFromFacebook)
    .then(userService.saveState)
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
    .then(userService.saveState)
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

  $scope.status = '';
  $scope.working = false;

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
    return experienceService.connect(device.id).catch(function(error) {
      $scope.working = false;
      $scope.status = 'Connecting failed';
      throw error;
    });
  };

  var exit = function() {
    $scope.working = false;
    $scope.status = 'Scanning stopped';
    return experienceService.stopScan();
  };

  // controller enter/exit
  $scope.$on('$stateChangeSuccess', function(e, toState) {
    if (toState.controller == 'ScanningController') enter();
    else exit();
  });

  // $scope.$on('pause', exit);
  // $scope.$on('resume', enter);
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
    $scope.step++;
    if ($scope.step >= $scope.stepCount) {
      // on the end of pairing process
      experienceService.pair();
      return experienceService.clearColor().then(function() {
        $ionicHistory.nextViewOptions({historyRoot: true});
        $state.go('main.start');
      });
    }

    setRandomColor().catch(function(error) {
      $ionicPopup.alert({
        title: 'Pairing process failed.',
        template: 'Cannot communicate with Experience, please try it again.',
        okType: 'button-assertive',
      })
      .then(experienceService.disconnect)
      .then(function() {
        $ionicHistory.goBack();
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
    .then(experienceService.disconnect)
    .then(experienceService.ignore)
    .then(function() {
      $ionicHistory.goBack();
    }).catch(function(error) {
      $ionicHistory.goBack();
      throw error;
    });
  };

  $scope.cannotRecognize = function() {
    // TODO
  };

  // controller enter/exit
  $scope.$on('$stateChangeSuccess', function(e, toState) {
    if (toState.controller == 'PairingController') setRandomColor();
  });
};

module.controller('PairingController', PairingController);

// ------------------------------------------------------------------------------------------------

var StartController = function($scope, $state, $timeout, experienceService) {

  $scope.connected = experienceService.isConnected();

  $scope.reconnect = function() {
    experienceService.reconnect().then(function() {
      $scope.connected = experienceService.isConnected();
    }).catch(function(error) {
      // if connecting failed, try again in 3 sec
      $timeout($scope.reconnect, 3000);
      throw error;
    });
  };

  $scope.start = function() {
    experienceService.startMeasurement().then(function() {
      $state.go('main.jumping');
    });
  };

  $scope.reconnect();
};

module.controller('StartController', StartController);

// ------------------------------------------------------------------------------------------------

var JumpingController = function($scope, $state, $interval, experienceService) {
  var timer = $interval($scope.apply, 1000);

  $scope.getElapsedTime = experienceService.getElapsedTime;

  $scope.getScore = function() {
    var s = experienceService.getScore();
    return (s.amplitude + s.rhythm + s.frequency).toFixed(2);
  };

  $scope.stop = function() {
    experienceService.stopMeasurement().then(function() {
      $interval.cancel(timer);
    }).then(function() {
      // TODO go to result
      $state.go('main.me.last');
    });
  };
};

module.controller('JumpingController', JumpingController);
