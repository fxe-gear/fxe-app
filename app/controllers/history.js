'use strict';

var module = angular.module('experience.controllers.history', [
]);

var HistoryController = function($scope, lessons) {
  $scope.lessons = lessons;
};

module.controller('HistoryController', HistoryController);
