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
        title: 'Facebook login failed.<br>Please try again.',
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
        title: 'Google login failed.<br>Please try again.',
        okType: 'button-assertive',
      });
    });
  };
};

WelcomeController.$inject = ['$scope', '$state', '$ionicPopup', '$log', 'userService'];
module.controller('WelcomeController', WelcomeController);

// ------------------------------------------------------------------------------------------------

var ScanningController = function($scope, $state, $ionicPopup, experienceService) {
  init = function() {
    enableBluetooth()
    .then(scan)
    .then(connect)
    .then(function() {
      // prevent changing state when the process has aleready been canceled
      if ($state.current.controller != 'ScanningController') return;
      $state.go('pairing');
    });
  };

  enableBluetooth = function() {
    $scope.working = true;
    $scope.status = 'Enabling bluetooth...';
    return experienceService.enable().catch(function(error) {
      $scope.working = false;
      $scope.status = 'Cannot enable bluetooth. Please enable it manually.';
      throw error;
    });
  };

  scan = function() {
    $scope.working = true;
    $scope.status = 'Scanning...';
    return experienceService.scan().catch(function() {
      $scope.working = false;
      $scope.status = 'Scanning failed, please try again.';
      throw error;
    });
  };

  connect = function(device) {
    $scope.working = true;
    $scope.status = 'Connecting...';
    return experienceService.connect(device.id).catch(function() {
      $scope.working = false;
      $scope.status = 'Connecting failed, please try again.';
      throw error;
    });
  };

  stopScan = function() {
    $scope.working = false;
    $scope.status = '';
    return experienceService.stopScan();
  };

  $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
    if (toState.controller == 'ScanningController') { // enter
      init();
    } else { // exit
      stopScan();
    }
  });
};

ScanningController.$inject = ['$scope', '$state', '$ionicPopup', 'experienceServiceMock'];
module.controller('ScanningController', ScanningController);

// ------------------------------------------------------------------------------------------------

var PairingController = function($scope, $state, $ionicPopup, experienceService) {

  $scope.yes = function() {
    $ionicPopup.alert({title:'BAF!'});
  };

  $scope.no = function() {
    $ionicPopup.alert({title:'BAF!'});
  };

  $scope.cannotRecognize = function() {
    // TODO
  };

  getRandomColor = function() {
    var colors = ['red', 'green', 'blue', 'yellow', 'white'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  $scope.color = getRandomColor();
};

PairingController.$inject = ['$scope', '$state', '$ionicPopup', 'experienceService'];
module.controller('PairingController', PairingController);
