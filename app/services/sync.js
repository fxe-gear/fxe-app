'use strict';

angular.module('experience.services.sync', [])

.service('syncService', function ($scope, $log, $q, storeService, apiService, diffWatch) {

  var user = storeService.getUser();
  var friends = storeService.getFriends();

  var _disableUserSync = null;

  var loadDetails = function () {
    $log.debug('loading user details');
    return apiService.getUser().then(function (response) {
      angular.merge(user, response.data);
      $log.info('user details loaded');
    });
  };

  var updateUser = function (diff) {
    $log.debug('updating user account');
    return apiService.updateUser(diff).then(function (response) {
      $log.info('user account updated');
    });
  };

  var enableUserSync = function () {
    // disable previous sync if needed
    disableUserSync();
    $log.debug('enabling user sync');

    _disableUserSync = diffWatch($scope, 'user', onUserChange);

    $log.info('user sync enabled');
  };

  var disableUserSync = function () {
    if (_disableUserSync) {
      $log.info('disabling user sync');
      _disableUserSync();
      _disableUserSync = null;
      $log.info('user sync disabled');
    }

    return $q.resolve();
  };

  var reloadFriends = function () {
    $log.debug('getting friends data');
    return apiService.getFriends().then(function (response) {
      // copy friends to storeService's friends object by its IDs
      angular.forEach(response.data, function (person) {
        if (friends.hasOwnProperty(person.id)) {
          // we already know this person, just update its data and score
          angular.merge(friends[person.id], person);
        } else {
          // new friend
          friends[person.id] = person;
        }
      });

      $log.info('friends data reloaded');
    });
  };

  // service public API
  this.loadDetails = loadDetails;
  this.reloadFriends = reloadFriends;
});
