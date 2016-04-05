'use strict';

angular.module('fxe.services.sync', [])

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
        // fake average
        friends[person.id].score.average = friends[person.id].score.last - (Math.random() * 25);
      });

      $log.info('friends data synced');
    });
  };

  // Called when link state change to online or lesson tab is visited.
  var syncLessons = function () {
    $log.debug('syncing lessons');

    var lastSync = storeService.getLessonLastSync();

    var remoteNew; // an array of lesson objects
    var localNew; // an array of lesson objects
    var remoteAll = {}; // a set of start times (AS STRING!)
    var localAll = {}; // a set of start times (AS STRING!)
    var remoteDeleted; // an array of start times
    var localDeleted; // an array of start times

    // fill remoteNew
    var remoteNewPromise = apiService.getLessons({
        from: lastSync,
      })
      .then(function (response) {
        remoteNew = response.data;
      });

    // fill localNew
    var localNewPromise = storeService.getVerboseLessonsBetween(lastSync, Date.now())
      .then(function (lessons) {
        localNew = lessons;
      });

    // fill remoteAll
    var remoteAllPromise = apiService.getLessons({
        fields: 'start',
      })
      .then(function (response) {
        angular.forEach(response.data, function (l) {
          remoteAll[l.start] = true;
        });
      });

    // fill localAll
    var localAllPromise = storeService.getAllLessons()
      .then(function (lessons) {
        angular.forEach(lessons, function (l) {
          localAll[l.start] = true;
        });
      });

    // fill remoteDeleted
    // uses localAll and remoteAll => wait for them resolve
    var remoteDeletedPromise = $q.all([localAllPromise, remoteAllPromise])
      .then(function () {
        remoteDeleted = [];
        Object.keys(localAll).forEach(function (start) {
          // do not forget the parseInt() type conversion! localAll is a set of strings!
          var intStart = parseInt(start);
          if (!(start in remoteAll) && storeService.getNewLessons().indexOf(intStart) == -1) {
            // in localAll, not in remoteAll and not a new lesson => must be remoteDeleted
            remoteDeleted.push(intStart);
          }
        });
      });

    // fill localDeleted
    localDeleted = storeService.getDeletedLessons();

    // when we have all the data, do the changes
    return $q.all([remoteNewPromise, localNewPromise, remoteAllPromise, localAllPromise, remoteDeletedPromise])
      .then(function () {
        var promises = [];

        // push local new
        if (localNew.length) {
          var uploadLocalNewPromise = apiService.uploadLessons(localNew)
            .then(function () {
              storeService.getNewLessons().length = 0;
            });
          promises.push(uploadLocalNewPromise);
        }

        // store remote new
        angular.forEach(remoteNew, function (lesson) {
          promises.push(storeService.addLesson(lesson));
        });

        // push local deleted
        for (var start; start = localDeleted.pop();) {
          // avoid request if lesson has been already deleted from another device
          if (remoteDeleted.indexOf(start) != -1) continue;

          // API allows to delete only one lesson per query
          var pushLocalDeletedPromise = apiService.deleteLesson(start)
            .catch(function () {
              // push back on error
              localDeleted.push(start);
            });

          promises.push(pushLocalDeletedPromise);
        }

        // store remote deleted
        angular.forEach(remoteDeleted, function (start) {
          promises.push(storeService.deleteLesson(start, true));
        });

        // wait for all operations to finish
        return $q.all(promises);
      })
      .then(function () {
        storeService.touchLessonLastSync();
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
