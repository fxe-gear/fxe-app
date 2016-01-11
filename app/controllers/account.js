'use strict';

var module = angular.module('experience.controllers.account', [
  'experience.services.user',
]);

var CreateAccountController = function($scope, $state, $ionicPopup, userService) {
  $scope.update = function(data) {
    // TODO do NOT copy whole model (overrides other model data)
    angular.copy(data, userService.model);
    $state.go('scanning');
  };
};

module.controller('CreateAccountController', CreateAccountController);
