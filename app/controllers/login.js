'use strict';

var module = angular.module('fxe.controllers.login', []);

var LoginController = function ($scope, $state, $cordovaToast, $ionicHistory, $ionicPopup, userService, syncService) {

  $scope.user = userService.getUser();

  $scope.login = function () {
    userService.loginJumping()
      .then(function () {
        return $cordovaToast.showShortBottom('Logged in.');
      })
      .then(gotoScanning)
      .then(syncService.syncUser)
      .catch(function () {
        $ionicPopup.alert({
          title: 'Jumping login failed.',
          template: 'Please try again.',
          okType: 'button-assertive'
        });
      });
  };

  var gotoScanning = function () {
    $ionicHistory.nextViewOptions({
      historyRoot: true
    });
    return $state.go('scanning');
  };
};

module.controller('LoginController', LoginController);
