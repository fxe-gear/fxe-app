'use strict';

angular.module('experience.services.sync', [])

.service('syncService', function ($log, $q, storeService, apiService) {

  // User and lesson syncing step order is based on this post:
  // http://programmers.stackexchange.com/questions/135412/how-best-do-you-represent-a-bi-directional-sync-in-a-rest-api

  var user = storeService.getUser();
  var friends = storeService.getFriends();

  // change object (should be "clean" when all data is synced)
  var userChanges = storeService.getUserChanges();

  // Called when link state change to online, user object change or settings tab is visited.
  var syncUser = function () {
    $log.debug('syncing user account');

    // get user changes from API
    var remoteUser;
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
        // merge the previously saved response with local changes to storeService
        angular.merge(user, remoteUser, userChanges);

        // clear the change set
        for (var k in userChanges) delete userChanges[k];
        $log.info('user account synced');
      });
  };

  // Called when link state change to online or friends tab is visited.
  // Get friend from API and store them to friends object.
  var syncFriends = function () {
    $log.debug('syncing friends data');
    return apiService.getFriends().then(function (response) {
      // copy friends to storeService's friends object by its IDs
      angular.forEach(response.data, function (person) {
        if (friends.hasOwnProperty(person.id)) {
          // we already know this person, just update its data and score
          angular.merge(friends[person.id], person);
        } else {
          // otherwise add a new friend
          friends[person.id] = person;
        }
      });

      $log.info('friends data synced');
    });
  };

  // Called when link state change to online or lesson tab is visited.
  var syncLessons = function () {
    $log.debug('syncing lessons');

    var lastSync = storeService.getLessonLastSync();

    // handle new lessons ------------------------------------------------
    var newLessons;
    var newPromise = apiService.getLessons({
        from: lastSync,
      })
      .then(function (response) { // wait for lesson download
        // store new API lessons for later and push new local lessons to API
        newLessons = response.data;
        return storeService.getVerboseLessonsBetween(lastSync, Date.now());
      })
      .then(function (lessons) { // wait for storeService to return lessons
        // avoid empty request
        if (lessons.length) return apiService.uploadLessons(lessons);
      })
      .then(function () { // wait for lesson upload
        // copy new API lessons to storeService
        angular.forEach(newLessons, storeService.addLesson);
        storeService.touchLessonLastSync();
      });

    // handle deleted lessons ------------------------------------------------
    var allLessons = {}; // a set
    var deletedPromise = apiService.getLessons({
        fields: 'start',
      })
      .then(function (response) { // wait for lesson download
        // store ALL lesson start times for later
        angular.forEach(response.data, function (l) {
          allLessons[l.start] = true;
        });

        // push locally deleted lessons to API
        var apiRequests = [];
        var deletedLessons = storeService.getDeletedLessons();
        for (var l; l = deletedLessons.pop();) {
          // avoid request if lesson has been already deleted from another device
          if (!(l in allLessons)) continue;
          apiRequests.push(apiService.deleteLesson(l).catch(function () {
            // push back on error
            deletedLessons.push(l);
          }));
        }

        return $q.all(apiRequests);
      })
      .then(function () { // wait for ALL delete requests
        // delete local lessons which are not in API lesson set
        storeService.getAllLessons().then(function (lessons) {
          angular.forEach(lessons, function (l) {
            if (!(l.start in allLessons)) {
              storeService.deleteLesson(l.start, true);
            }
          });
        });
      });

    // wait for both chains to finish
    return $q.all([newPromise, deletedPromise]).then(function () {
      $log.info('lessons synced');
    });
  };

  var syncAll = function () {
    return $q.all([syncUser(), syncFriends(), syncLessons()]);
  };

  // service public API
  this.syncUser = syncUser;
  this.syncFriends = syncFriends;
  this.syncLessons = syncLessons;
  this.syncAll = syncAll;
});
