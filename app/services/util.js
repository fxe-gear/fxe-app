'use strict';

// ------------------------------------------------------------------------------------------------

var module = angular.module('fxe.services.util', []);

module.filter('msToDate', function () {
  return function (ms) {
    return new Date(1970, 0, 1).setSeconds(0, ms);
  };
});

module.filter('msToTimeSpan', function (msToDateFilter, dateFilter) {
  return function (val) {
    return dateFilter(msToDateFilter(val), 'HH:mm:ss');
  };
});

module.filter('ordinal', function () {
  return function (val) {
    if (val > 3 && val < 21) return 'th';
    switch (val % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  };
});

// ------------------------------------------------------------------------------------------------

// Fisher–Yates shuffle
module.factory('shuffle', function () {
  return function (array) {
    var counter = array.length;
    var temp;
    var index;

    while (counter > 0) {
      index = Math.floor(Math.random() * counter);
      counter--;
      temp = array[counter];
      array[counter] = array[index];
      array[index] = temp;
    }

    return array;
  };
});

// ------------------------------------------------------------------------------------------------
// inspired from: https://gist.github.com/amcdnl/df3344de6ae9ed400a56

Array.prototype.union = function (a) {
  var r = this.slice(0);
  a.forEach(function (i) {
    if (r.indexOf(i) < 0) r.push(i);
  });

  return r;
};

Array.prototype.diff = function (a) {
  return this.filter(function (i) {
    return a.indexOf(i) < 0;
  });
};

module.factory('diffWatch', function () {
  return function ($scope, variableName, callback) {

    function diff(orig, updated) {
      var newKeys = Object.keys(updated);
      var oldKeys = Object.keys(orig);
      var removed = oldKeys.diff(newKeys);
      var added = newKeys.diff(oldKeys);
      var union = newKeys.union(oldKeys);

      var changes = {
        count: removed.length + added.length,
        added: added,
        removed: removed,
        updated: {},
      };

      union.forEach(function (k) {
        if (!angular.equals(orig[k], updated[k])) {
          changes.updated[k] = (updated[k] !== undefined ? updated[k] : null);
          changes.count++;
        }
      });

      return changes;
    }

    return $scope.$watch(variableName, function (updated, orig) {
      updated = updated || {};
      var changes = diff(orig, updated);
      if (changes.count) {
        callback(changes, updated, orig);
      }
    }, true);
  };
});
