'use strict';

var module = angular.module('fxe.services.token', []);

/**
 * A storage for login tokens with some getters and setters.
 *
 * Needed to break circular dependency between userService and apiService.
 */
module.service('tokenService', function ($localStorage) {

  var $storage = $localStorage.$default({
    jumping: {},
    facebook: {},
    google: {}
  });

  this.getJumpingToken = function () {
    return $storage.jumping;
  };

  this.setJumpingToken = function (data) {
    angular.merge($storage.jumping, data);
  };

  this.setFacebookToken = function (data) {
    angular.merge($storage.facebook, data);
  };

  this.setGoogleToken = function (data) {
    angular.merge($storage.google, data);
  };

  this.getFacebookToken = function () {
    return $storage.facebook;
  };

  this.getGoogleToken = function () {
    return $storage.google;
  }

});

