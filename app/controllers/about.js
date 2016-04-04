'use strict';

var module = angular.module('fxe.controllers.about', []);

var AboutController = function ($scope) {

  var clickCount = 0;
  $scope.isDeveloper = false;

  $scope.becomeDeveloper = function () {
    clickCount++;
    if (clickCount >= 5) {
      $scope.isDeveloper = true;
    }
  };

};

module.controller('AboutController', AboutController);
