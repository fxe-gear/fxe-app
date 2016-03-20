'use strict';

var module = angular.module('experience.controllers.welcome', []);

var WelcomeController = function ($scope, $state, $ionicHistory, $ionicPopup, userService) {

  $scope.loginFacebook = function () {
    userService.loginFacebook()
      .then(function () {
        $ionicHistory.nextViewOptions({
          historyRoot: true,
        });
        $state.go('scanning');
      })
      .then(userService.loadFromFacebook)
      .catch(function (error) {
        $ionicPopup.alert({
          title: 'Facebook login failed.',
          template: 'Please try again.',
          okType: 'button-assertive',
        });
      });
  };

  $scope.loginGoogle = function () {
    userService.loginGoogle()
      .then(function () {
        $ionicHistory.nextViewOptions({
          historyRoot: true,
        });
        $state.go('scanning');
      })
      .then(userService.loadFromGoogle)
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
