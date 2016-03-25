'use strict';

angular.module('experience.directives.account', [])

.directive('jumpAccount', function () {
  return {
    restrict: 'E',
    transclude: true,
    replace: false,
    templateUrl: 'directives/account.html',
    scope: {
      title: '@',
      user: '=',
    },
    link: function (scope, elem, attr, ctrl, $transclude) {
      $transclude(function (clone) {
        scope.hasTranscluded = clone.length;
      });
    },
  };
});
