'use strict';

var module = angular.module('experience.controllers.login', []);

var LoginController = function ($scope, $state, $ionicPopup, userService, storeService) {

  $scope.user = storeService.getUser();

  $scope.login = function () {
    userService.loginJumping($scope.user.email, $scope.user.password)
      .then(function () {
        $state.go('scanning');
      }).then(function () {
        userService.loadDetails();
      }).catch(function (error) {
        $ionicPopup.alert({
          title: 'Jumping login failed.',
          template: 'Please try again.',
          okType: 'button-assertive',
        });
      });
  };
};

module.controller('LoginController', LoginController);
