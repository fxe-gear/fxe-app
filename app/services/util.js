'use strict';

angular.module('experience.services.util', [])

.filter('msToDate', function () {
  return function (ms) {
    return new Date(1970, 0, 1).setSeconds(0, ms);
  };
})

.filter('msToTimeSpan', function (msToDateFilter, dateFilter) {
  return function (val) {
    return dateFilter(msToDateFilter(val), 'HH:mm:ss');
  };
})

// ------------------------------------------------------------------------------------------------

// Fisher–Yates shuffle
.service('shuffleService', function () {
  this.shuffle = function (array) {
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
