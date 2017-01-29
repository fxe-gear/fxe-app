'use strict';

var module = angular.module('fxe.controllers.passwordReset', []);

var PasswordResetController = function ($scope, $ionicHistory, $ionicPopup, userService) {

  $scope.user = userService.getUser();

  $scope.reset = function () {
    userService.resetPassword()
      .then(function () {
        $ionicPopup.alert({
          title: 'Password reset requested.',
          template: 'Please check your inbox to finish the password reset process.',
          okType: 'button-balanced'
        });
        $ionicHistory.goBack();
      })
      .catch(function () {
        $ionicPopup.alert({
          title: 'Password reset failed.',
          template: 'Please try again.',
          okType: 'button-assertive'
        });
      });
  };
};

module.controller('PasswordResetController', PasswordResetController);
