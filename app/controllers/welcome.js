'use strict';

var module = angular.module('experience.controllers.welcome', []);

var WelcomeController = function ($scope, $state, $ionicHistory, $ionicPopup, userService) {

  $scope.loginFacebook = function () {
    userService.getFacebookToken()
      .then(function () {
        $ionicHistory.nextViewOptions({
          historyRoot: true,
        });
        $state.go('scanning');
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
        $ionicHistory.nextViewOptions({
          historyRoot: true,
        });
        $state.go('scanning');
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
