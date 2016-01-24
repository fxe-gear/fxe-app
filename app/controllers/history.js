'use strict';

var module = angular.module('experience.controllers.history', [
  'experience.services.store',
]);

var HistoryController = function($scope, lessons, storeService) {
  $scope.lessons = lessons;
  $scope.user = storeService.getUser();
};

module.controller('HistoryController', HistoryController);
