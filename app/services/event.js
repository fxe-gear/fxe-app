'use strict';

var module = angular.module('fxe.services.event', []);

module.service('eventService', function ($log, $q, apiService) {

  this.getEvents = function (sport) {
    var params = {}, events = [];

    var getPage = function () {
      $log.debug('getting events for sport ' + sport);
      return apiService.getEvents(sport, params)
        .then(handlePage)
        .catch(function (error) {
          $log.error('getting events failed', error);
          throw error;
        });
    };

    var handlePage = function (response) {
      // collect server data into local variable
      events.push.apply(events, response.data.data);

      if (response.data.nextPageToken) {
        // handle next page
        params.pageToken = response.data.nextPageToken;
        return getPage();

      } else {
        $log.info('events got');
        return events;
      }
    };

    // kick off downloading
    return getPage();
  };

});
