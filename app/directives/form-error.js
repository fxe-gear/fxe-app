'use strict';

angular.module('experience.directives.error', [
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
