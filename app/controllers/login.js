'use strict';

var module = angular.module('experience.controllers.login', [
  'experience.services.user',
]);

var LoginController = function($scope, $state, $ionicPopup, userService) {
  $scope.user = userService.model;
};

module.controller('LoginController', LoginController);
