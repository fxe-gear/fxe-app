'use strict';

var module = angular.module('fxe.services.friend', []);

module.service('friendService', function ($log, $q, $localStorage) {

  var $storage = $localStorage.$default({
    friends: {}
  });

  this.getFriends = function () {
    return $storage.friends;
  };

});
