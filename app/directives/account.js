'use strict';

angular.module('fxe.directives.account', [])

.directive('jumpAccount', function ($ionicPopover) {
  return {
    restrict: 'E',
    transclude: true,
    replace: false,
    templateUrl: 'directives/account.html',
    scope: {
      user: '=',
      title: '@',
      change: '@',
      class: '@'
    },
    link: function ($scope, elem, attr, ctrl, $transclude) {

      // pass a flag indicating transcluded content
      $transclude(function (clone) {
        $scope.hasTranscluded = clone.length;
      });

    }
  };
});
