'use strict';

var module = angular.module('experience.controllers.login', []);

var LoginController = function ($scope, apiService) {

  $scope.user = {
    email: '',
    password: '',
  };

  $scope.login = function () {
    apiService.loginJumping($scope.user.email, $scope.user.password);
  };
};

module.controller('LoginController', LoginController);
