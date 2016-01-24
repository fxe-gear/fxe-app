'use strict';

var module = angular.module('experience.controllers.settings', [
  'experience.services.user',
]);

var SettingsController = function($scope, storeService) {
  $scope.user = storeService.getUser();
};

module.controller('SettingsController', SettingsController);
