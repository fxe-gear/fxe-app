'use strict';

var module = angular.module('experience.controllers.account', [
  'experience.services.store',
]);

var CreateAccountController = function($scope, $state, $ionicPopup, storeService) {
  $scope.update = function(data) {
    // TODO do NOT copy whole model (overrides other model data)
    angular.copy(data, storeService.getUser());
    $state.go('scanning');
  };
};

module.controller('CreateAccountController', CreateAccountController);
