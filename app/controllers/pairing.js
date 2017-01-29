'use strict';

var module = angular.module('fxe.controllers.pairing', []);

var PairingController = function ($scope, $state, $ionicHistory, $ionicPopup, fxeService, shuffle) {
  var colors = {
    red: '#ff0000',
    green: '#00ff00',
    blue: '#0000ff',
    yellow: '#ffff00',
    white: '#ffffff',
    cyan: '#00ffff'
  };
  var colorNamesShuffled;

  $scope.stepCount = 4;
  $scope.step = 0;

  var setRandomColor = function () {
    $scope.colorName = colorNamesShuffled[$scope.step];
    $scope.color = colors[$scope.colorName];
    return fxeService.setColor($scope.color)
      .catch(onFail);
  };

  var onFail = function () {
    return $ionicPopup.alert({
      title: 'Pairing process failed.',
      template: 'Cannot communicate with FXE, it will be temporary ignored. Please try again.',
      okType: 'button-assertive'
    }).then(function () {
      return fxeService.ignore();
    }).finally(function () {
      if ($ionicHistory.backView()) {
        return $ionicHistory.goBack();
      } else {
        $ionicHistory.nextViewOptions({historyRoot: true});
        return $state.go('scanning');
      }
    });
  };

  $scope.yes = function () {
    if ($scope.step + 1 >= $scope.stepCount) {
      // on the end of pairing process
      fxeService.pair();
      return fxeService.clearColor().then(function () {
        $ionicHistory.nextViewOptions({historyRoot: true});
        $state.go('main.start');
      });
    }

    $scope.step++;
    setRandomColor();
  };

  $scope.no = function () {
    fxeService.clearColor()
      .then(fxeService.ignore)
      .finally(function () {
        return $ionicHistory.goBack();
      });
  };

  // $scope.cannotRecognize = function () {
  //   // TODO
  // };

  $scope.$on('$ionicView.beforeEnter', function () {
    $scope.step = 0;
    colorNamesShuffled = shuffle(Object.keys(colors));
    setRandomColor();
  });
};

module.controller('PairingController', PairingController);
