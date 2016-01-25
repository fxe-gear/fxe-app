'use strict';

var module = angular.module('experience.controllers.history', [
  'experience.services.store',
]);

var HistoryController = function($scope, storeService) {
  $scope.user = storeService.getUser();

  $scope.$on('$ionicView.beforeEnter', function() {
    storeService.getAllLessons().then(function(lessons) {
      $scope.lessons = lessons;
    });
  });
};

module.controller('HistoryController', HistoryController);
