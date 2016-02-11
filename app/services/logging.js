'use strict';

// downloaded from: http://engineering.talis.com/articles/client-side-error-logging/

var loggingModule = angular.module('talis.services.logging', []);

loggingModule.service('stackTraceService', function () {
  return StackTrace;
});

loggingModule.provider('$exceptionHandler', {
  $get: function (exceptionLoggingService) {
    return (exceptionLoggingService);
  },
});

loggingModule.factory('exceptionLoggingService', function ($log, $window, stackTraceService) {
  function error(exception, cause) {
    $log.error.apply($log, arguments);
    var errorMessage = exception.toString();

    stackTraceService.fromError(exception).then(function (stacktrace) {
      try {
        // do NOT use angular service
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open('POST', 'http://experience.tbedrich.cz/api/v1/log');
        xmlhttp.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
        xmlhttp.send(angular.toJson({
          url: $window.location.href,
          message: errorMessage,
          type: 'exception',
          stackTrace: stacktrace,
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
