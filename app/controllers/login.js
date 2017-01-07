'use strict';

var module = angular.module('fxe.controllers.login', []);

var LoginController = function ($scope, $state, $cordovaToast, $ionicHistory, $ionicPopup, userService, storeService) {

  $scope.user = storeService.getUser();

  $scope.login = function () {
    userService.loginJumping()
      .then(function () {
        return $cordovaToast.showShortBottom('Logged in.');
      }).then(function () {
        $ionicHistory.nextViewOptions({
          historyRoot: true
        });
        $state.go('scanning');
      }).then(function () {
        userService.loadDetails();
      }).catch(function (error) {
        $ionicPopup.alert({
          title: 'Jumping login failed.',
          template: 'Please try again.',
          okType: 'button-assertive'
        });
      });
  };
};

module.controller('LoginController', LoginController);
