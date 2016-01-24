'use strict';

angular.module('experience.directives.account', [
  'ngCordova',
  'ngMessages',
])

.directive('jumpAccount', function() {
  return {
    restrict: 'E',
    transclude: true,
    replace: false,
    templateUrl: 'templates/directives/account.html',
    scope: {
      title: '@',
      user: '=',
    },
  };
});
