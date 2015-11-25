var module = angular.module('experience.controllers', []);

var WelcomeController = function($scope, $state, $ionicPopup, $log, userService) {
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

WelcomeController.$inject = ['$scope', '$state', '$ionicPopup', '$log', 'userService'];
module.controller('WelcomeController', WelcomeController);

// ------------------------------------------------------------------------------------------------

var ScanningController = function($scope, $state, $ionicPopup, experienceService) {
  var enter = function() {
    enableBluetooth()
    .then(scan)
    .then(connect)
    .then(function() {
      // prevent changing state when the process has aleready been canceled
      if ($state.current.controller != 'ScanningController') return;
      $state.go('pairing');
    });
  };

  var enableBluetooth = function() {
    $scope.working = true;
    $scope.status = 'Enabling bluetooth...';
    return experienceService.enable().catch(function(error) {
      $scope.working = false;
      $scope.status = 'Cannot enable bluetooth. Please enable it manually.';
      throw error;
    });
  };

  var scan = function() {
    $scope.working = true;
    $scope.status = 'Scanning...';
    return experienceService.scan().catch(function() {
      $scope.working = false;
      $scope.status = 'Scanning failed, please try again.';
      throw error;
    });
  };

  var connect = function(device) {
    $scope.working = true;
    $scope.status = 'Connecting...';
    return experienceService.connect(device.id).catch(function() {
      $scope.working = false;
      $scope.status = 'Connecting failed, please try again.';
      throw error;
    });
  };

  var exit = function() {
    $scope.working = false;
    $scope.status = '';
    return experienceService.stopScan();
  };

  $scope.$on('$stateChangeSuccess', function(e, toState) {
    if (toState.controller == 'ScanningController') enter();
    else exit();
  });
};

ScanningController.$inject = ['$scope', '$state', '$ionicPopup', 'experienceServiceMock'];
module.controller('ScanningController', ScanningController);

// ------------------------------------------------------------------------------------------------

var PairingController = function($scope, $state, $ionicHistory, $ionicPopup, experienceService, util) {
  var colors = {red: '#ff2222', green: '#22ff22', blue: '#2222ff', yellow: '#ffff22', white: '#ffffff', cyan: '#22ffff'};
  var colorNamesShuffled = util.shuffle(Object.keys(colors));

  $scope.stepCount = 4;
  $scope.step = 0;

  var setRandomColor = function() {
    $scope.colorName = colorNamesShuffled[$scope.step];
    $scope.color = colors[$scope.colorName];
    return experienceService.setColor($scope.color);
  };

  $scope.yes = function() {
    // $ionicPopup.alert({title:experienceService.model.connected});
    $scope.step++;
    if ($scope.step == $scope.stepCount) {
      experienceService.model.paired = true;
      experienceService.setColor(); // clear color
      $ionicHistory.nextViewOptions({historyRoot: true});
      return $state.go('main.start');
    } else return setRandomColor();
  };

  $scope.no = function() {
    $ionicPopup.alert({
      title: 'Paring failed',
      template: 'Sorry, we have unintentionally connected to another Experience. Please try it again.',
      okType: 'button-energized',
    })
    .then(function() {
      return experienceService.disconnect();
    })
    .then(function() {
      $ionicHistory.goBack();
    });
  };

  $scope.cannotRecognize = function() {
    // TODO
  };

  $scope.$on('$stateChangeSuccess', function(e, toState) {
    if (toState.controller == 'PairingController') setRandomColor();
  });
};

PairingController.$inject = ['$scope', '$state', '$ionicHistory', '$ionicPopup', 'experienceServiceMock', 'util'];
module.controller('PairingController', PairingController);

// ------------------------------------------------------------------------------------------------

var StartController = function() {
};

StartController.$inject = ['$scope'];
module.controller('StartController', StartController);
