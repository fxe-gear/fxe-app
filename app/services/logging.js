'use strict';

// inspired by http://engineering.talis.com/articles/client-side-error-logging/

var loggingModule = angular.module('fxe.services.logging', []);
var LOG_URL = 'http://www.fxe-gear.com/api/v2/log';

loggingModule.factory('$exceptionHandler', function ($log) {
  return function remoteExceptionLogger(exception, cause) {
    // log to console
    $log.error(exception, cause);

    var gps = new StackTraceGPS();

    StackTrace.fromError(exception)
      .then(function (frame) {
        return gps.pinpoint(frame);
      })
      .then(function (gps_frame) {
        return StackTrace.report(gps_frame, LOG_URL);
      })
      .then(function () {
        $log.info('Error logged to remote server.');
      })
      .catch(function (error) {
        $log.error('Logging error to remote server failed.');
      });
  };
});
