'use strict';

var module = angular.module('experience.controllers.welcome', [
  'experience.services.user',
]);

var WelcomeController = function ($scope, $state, $ionicPopup, userService) {

  $scope.loginFacebook = function () {
    userService.loginFacebook()
      .then(userService.loadFromFacebook)
      .then(function () {
        $state.go('scanning');
      }).catch(function (error) {
        $ionicPopup.alert({
          title: 'Facebook login failed.',
          template: 'Please try again.',
          okType: 'button-assertive',
        });
      });
  };

  $scope.loginGoogle = function () {
    userService.loginGoogle()
      .then(userService.loadFromGoogle)
      .then(function () {
        $state.go('scanning');
      }).catch(function (error) {
        $ionicPopup.alert({
          title: 'Google login failed.',
          template: 'Please try again.',
          okType: 'button-assertive',
        });
      });
  };
};

module.controller('WelcomeController', WelcomeController);
