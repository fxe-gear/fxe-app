'use strict';

// inspired by http://engineering.talis.com/articles/client-side-error-logging/

var loggingModule = angular.module('fxe.services.logging', []);

loggingModule.service('stackTraceService', function () {
  return StackTrace;
});

loggingModule.service('stackTraceGPSService', function () {
  return StackTraceGPS;
});

loggingModule.provider('$exceptionHandler', {
  $get: function (exceptionLoggingService) {
    return (exceptionLoggingService);
  },
});

loggingModule.factory('exceptionLoggingService', function ($log, $window, stackTraceService, stackTraceGPSService) {
  function error(exception, cause) {
    $log.error.apply($log, arguments);
    var errorMessage = exception.toString();

    stackTraceService.fromError(exception)
      .then(stackTraceGPSService.pinpoint)
      .then(function (stackframes) {
        try {
          // do NOT use angular service (it might fail and result in recursion)
          var xmlhttp = new XMLHttpRequest();
          xmlhttp.open('POST', 'http://fxe.tbedrich.cz/api/v1/log');
          xmlhttp.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
          xmlhttp.send(angular.toJson({
            url: $window.location.href,
            message: errorMessage,
            type: 'exception',
            stackTrace: stackframes,
            cause: (cause || ''),
          }));
          $log.info('Error logged to remote server.');
        } catch (loggingError) {
          $log.warn('Logging error to remote server failed.');
          $log.log(loggingError);
        }
      });
  };

  return (error);
});
