'use strict';

var module = angular.module('fxe.controllers.welcome', []);

var WelcomeController = function ($scope, $state, $ionicPopup, userService) {

  $scope.loginFacebook = function () {
    userService.getFacebookToken()
      .then(function () {
        return $state.go('scanning');
      })
      .then(userService.loginFacebook)
      .then(userService.loadDetails)
      .catch(function (error) {
        $ionicPopup.alert({
          title: 'Facebook login failed.',
          template: 'Please try again.',
          okType: 'button-assertive',
        });
      });
  };

  $scope.loginGoogle = function () {
    userService.getGoogleToken()
      .then(function () {
        return $state.go('scanning');
      })
      .then(userService.loginGoogle)
      .then(userService.loadDetails)
      .catch(function (error) {
        $ionicPopup.alert({
          title: 'Google login failed.',
          template: 'Please try again.',
          okType: 'button-assertive',
        });
      });
  };
};

module.controller('WelcomeController', WelcomeController);
