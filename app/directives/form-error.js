'use strict';

angular.module('fxe.directives.error', [
  'ngCordova',
  'ngMessages',
])

.directive('jumpFormError', function () {
  return {
    restrict: 'E',
    transclude: true,
    replace: false,
    templateUrl: 'directives/form-error.html',
    scope: {
      input: '=',
    },
  };
});
