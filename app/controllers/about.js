'use strict';

var module = angular.module('fxe.controllers.about', []);

var AboutController = function ($scope, $localStorage) {

  var clickCount = 0;
  $localStorage.$default({
    about: {
      isDeveloper: false
    }
  });

  $scope.persistent = $localStorage.about;

  $scope.becomeDeveloper = function () {
    clickCount++;
    if (clickCount >= 5) {
      $scope.persistent.isDeveloper = true;
    }
  };

};

module.controller('AboutController', AboutController);
