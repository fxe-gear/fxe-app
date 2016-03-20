'use strict';

var module = angular.module('experience.controllers.settings', []);

var SettingsController = function ($scope, $ionicPlatform, storeService, userService, diffWatch) {

  $scope.user = storeService.getUser();

  var onUserChange = function (changes) {
    // pass them to userService and show progress
    userService.updateAccount(changes.updated).catch(function (error) {
      // TODO handle server side validation errors
      $ionicPopup.alert({
        title: 'Updating account failed.',
        okType: 'button-assertive',
      });
    });
  };

  $ionicPlatform.ready(function () {
    diffWatch($scope, 'user', onUserChange);
  });

};

module.controller('SettingsController', SettingsController);
