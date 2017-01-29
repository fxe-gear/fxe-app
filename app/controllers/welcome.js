'use strict';

var module = angular.module('fxe.controllers.welcome', []);

var WelcomeController = function ($scope, $state, $ionicPopup, $ionicHistory, userService, syncService) {

  $scope.loginFacebook = function () {
    userService.getFacebookToken()
      .then(userService.loginFacebook)
      .then($scope.gotoScanning)
      .then(syncService.syncUser)
      .catch(function () {
        $ionicPopup.alert({
          title: 'Facebook login failed.',
          template: 'Please try again.',
          okType: 'button-assertive'
        });
      });
  };

  $scope.loginGoogle = function () {
    userService.getGoogleToken()
      .then(userService.loginGoogle)
      .then($scope.gotoScanning)
      .then(syncService.syncUser)
      .catch(function () {
        $ionicPopup.alert({
          title: 'Google login failed.',
          template: 'Please try again.',
          okType: 'button-assertive'
        });
      });
  };

  $scope.gotoScanning = function () {
    $ionicHistory.nextViewOptions({
      historyRoot: true
    });
    return $state.go('scanning');
  };
};

module.controller('WelcomeController', WelcomeController);
