'use strict';

var module = angular.module('experience.controllers.pairing', [
  'experience.services.experience',
  'experience.services.util',
]);

var PairingController = function ($scope, $state, $ionicHistory, $ionicPopup, experienceService, shuffleService) {
  var colors = {
    red: '#ff0000',
    green: '#00ff00',
    blue: '#0000ff',
    yellow: '#ffff00',
    white: '#ffffff',
    cyan: '#00ffff',
  };
  var colorNamesShuffled = shuffleService.shuffle(Object.keys(colors));

  $scope.stepCount = 4;
  $scope.step = 0;

  var setRandomColor = function () {
    $scope.colorName = colorNamesShuffled[$scope.step];
    $scope.color = colors[$scope.colorName];
    return experienceService.setColor($scope.color);
  };

  $scope.yes = function () {
    if ($scope.step + 1 >= $scope.stepCount) {
      // on the end of pairing process
      experienceService.pair();
      return experienceService.clearColor().then(function () {
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
        template: 'Cannot communicate with Experience, please try it again.',
        okType: 'button-assertive',
      }).then(function () {
        return $state.go('scanning');
      });
    });
  };

  $scope.no = function () {
    $ionicPopup.alert({
        title: 'Paring failed',
        template: 'Sorry, we have unintentionally connected to another Experience. Please try it again.',
        okType: 'button-energized',
      })
      .then(experienceService.clearColor)
      .then(experienceService.ignore)
      .then(experienceService.disconnect)
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
    setRandomColor();
  });
};

module.controller('PairingController', PairingController);
