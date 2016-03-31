'use strict';

var module = angular.module('fxe.controllers.pairing', []);

var PairingController = function ($scope, $state, $ionicPlatform, $ionicHistory, $ionicPopup, fxeService, bleDevice, shuffle) {
  var colors = {
    red: '#ff0000',
    green: '#00ff00',
    blue: '#0000ff',
    yellow: '#ffff00',
    white: '#ffffff',
    cyan: '#00ffff',
  };
  var colorNamesShuffled;

  $scope.stepCount = 4;
  $scope.step = 0;

  var setRandomColor = function () {
    $scope.colorName = colorNamesShuffled[$scope.step];
    $scope.color = colors[$scope.colorName];
    return fxeService.setColor($scope.color);
  };

  $scope.yes = function () {
    if ($scope.step + 1 >= $scope.stepCount) {
      // on the end of pairing process
      bleDevice.pair();
      return fxeService.clearColor().then(function () {
        $ionicHistory.nextViewOptions({
          historyRoot: true,
        });
        $state.go('main.jumping');
      });
    }

    $scope.step++;
    setRandomColor().catch(function (error) {
      $ionicPopup.alert({
        title: 'Pairing process failed.',
        template: 'Cannot communicate with FXE, please try it again.',
        okType: 'button-assertive',
      }).then(function () {
        return $state.go('scanning');
      });
    });
  };

  $scope.no = function () {
    fxeService.clearColor()
      .then(bleDevice.ignore)
      .then(function () {
        return $state.go('scanning');
      }).catch(function (error) {
        $state.go('scanning');
        throw error;
      });
  };

  $scope.cannotRecognize = function () {
    // TODO
  };

  $scope.$on('$ionicView.beforeEnter', function () {
    $scope.step = 0;
    $ionicPlatform.ready().then(function () {
        colorNamesShuffled = shuffle(Object.keys(colors));
      })
      .then(setRandomColor);
  });
};

module.controller('PairingController', PairingController);
