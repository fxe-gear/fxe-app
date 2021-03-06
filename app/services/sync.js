'use strict';

var module = angular.module('fxe.services.sync', []);

module.service('syncService', function ($log, $q, userService, friendService, lessonService, apiService, $localStorage) {
  // User and lesson syncing step order is based on this post:
  // http://programmers.stackexchange.com/questions/135412/how-best-do-you-represent-a-bi-directional-sync-in-a-rest-api

  var $storage = $localStorage;

  // called when link state change to online, user object change or settings tab is visited.
  var syncUser = function () {
    if (!userService.isLoggedIn()) {
      $log.warn('ignoring user sync request, not logged in');
      return $q.resolve();
    }

    $log.debug('syncing user account');

    // change object (should be "clean" when all data is synced)
    var userChanges = userService.getUserChanges();

    // local and remote user objects
    var localUser = userService.getUser();
    var remoteUser = null;

    // get user changes from API
    return apiService.getUser()
      .then(function (response) { // wait for user download
        // store new user data for later and push local changes to API
        remoteUser = response.data;
        if (Object.keys(userChanges).length) {
          // prevent empty request
          return apiService.updateUser(userChanges);
        }
      })
      .then(function () { // wait for user update
        // merge the previously saved response with local changes to lessonService
        angular.merge(localUser, remoteUser, userChanges);

        // clear password
        localUser.password = null;

        // clear the change set
        for (var k in userChanges) {
          if (userChanges.hasOwnProperty(k)) delete userChanges[k];
        }
        $log.info('user account synced');
      });
  };

  // ===================================================================================================

  // called when link state change to online or friends tab is visited.
  var syncFriends = function (sport) {
    if (!userService.isLoggedIn()) {
      $log.warn('ignoring friend sync request, not logged in');
      return $q.resolve();
    }

    // sync target
    var friends = friendService.getFriends();

    // API call params
    var params = {};

    var getPage = function () {
      $log.debug('syncing friends data');
      return apiService.getFriends(sport, params)
        .then(handlePage)
        .catch(function (error) {
          $log.error('friend sync failed', error);
          throw error;
        });
    };

    var handlePage = function (response) {
      // copy friends data by their IDs
      angular.forEach(response.data.data, function (person) {
        // create a new friend if it doesn't exist yet
        friends[person.id] = friends[person.id] || {};
        // update its data
        angular.merge(friends[person.id], person);
      });

      if (response.data.nextPageToken) {
        // handle next page
        params.pageToken = response.data.nextPageToken;
        return getPage();

      } else {
        $log.info('friends data synced');
      }
    };

    // kick off sync
    return getPage();
  };

  // ===================================================================================================

  // called when link state change to online or lesson tab is visited.
  var syncLessons = function (forceFullSync) {
    if (!userService.isLoggedIn()) {
      $log.warn('ignoring lesson sync request, not logged in');
      return $q.resolve();
    }

    // API call params
    var params = {};

    // add sync token only if we have it and full sync is not forced
    if ($storage.lessonSyncToken !== null && forceFullSync !== true) {
      params.syncToken = $storage.lessonSyncToken;
    }

    // tmp storage for server and local data
    var remoteAdded = []; // whole lessons
    var remoteDeleted = []; // lesson IDs
    var locallyAdded = lessonService.getNewLessons(); // lesson IDs
    var locallyDeleted = lessonService.getDeletedLessons(); // lesson IDs

    var getPage = function () {
      $log.debug('syncing lessons');
      return apiService.getLessons(params).then(handlePage)
    };

    var handlePage = function (response) {
      // collect server data into local variables
      remoteAdded.push.apply(remoteAdded, response.data.added);
      remoteDeleted.push.apply(remoteDeleted, response.data.deleted);

      // save next sync token
      if (response.data.nextSyncToken) {
        $storage.lessonSyncToken = response.data.nextSyncToken;
      }

      if (response.data.nextPageToken) {
        // handle next page
        params.pageToken = response.data.nextPageToken;
        return getPage();
      }
    };

    // ----------------------------------------------------------------------------
    // get all remote lessons

    return getPage()
      .then(function () {
        var start, task, promises = [];

        // now we have all the data locally, lets do the changes!

        // ----------------------------------------------
        // push locally added lessons

        while (start = locallyAdded.pop()) {
          // get lesson with complete score
          task = lessonService.getLesson(start, true).then(function (lesson) {
            return apiService.uploadLesson(lesson).catch(function () {
              // push back on error
              locallyAdded.push(lesson.start);
            });
          });
          promises.push(task);
        }

        // ----------------------------------------------
        // store remote added

        angular.forEach(remoteAdded, function (lesson) {
          task = lessonService.addLesson(lesson, true);
          promises.push(task);
        });

        // ----------------------------------------------
        // push locally deleted lessons

        while (start = locallyDeleted.pop()) {

          // avoid request if lesson has been already deleted from another device
          if (remoteDeleted.indexOf(start) != -1) continue;

          // need to wrap to IIFE to protect start from mutating
          task = function (start) {
            return apiService.deleteLesson(start).catch(function () {
              // push back on error
              locallyDeleted.push(start);
            });
          }(start);
          promises.push(task);
        }

        // ----------------------------------------------
        // store remote deleted

        angular.forEach(remoteDeleted, function (start) {
          task = lessonService.deleteLesson(start, true);
          promises.push(task);
        });

        // ----------------------------------------------
        // wait for all operations to finish
        return $q.all(promises);
      })
      .then(function () {
        $log.info('lessons synced');
      })
      .catch(function (error) {
        $log.error('lesson sync failed', error);
        throw error;
      });
  };

  // ===================================================================================================

  var syncAll = function () {
    return $q.all([syncUser(), syncFriends(1), syncLessons()]);
  };

  // service public API
  this.syncUser = syncUser;
  this.syncFriends = syncFriends;
  this.syncLessons = syncLessons;
  this.syncAll = syncAll;
});
