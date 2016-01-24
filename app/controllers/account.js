'use strict';

var module = angular.module('experience.controllers.account', [
  'experience.services.store',
]);

var CreateAccountController = function($scope, $state, $ionicPopup, storeService) {
  $scope.user = storeService.getUser();

  $scope.create = function() {
    $scope.user.provider = 'jumping';
    $state.go('scanning');
  };

};

module.controller('CreateAccountController', CreateAccountController);
