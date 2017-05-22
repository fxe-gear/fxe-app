'use strict';

var module = angular.module('fxe.controllers.developer', []);

var DeveloperController = function ($scope, $state, $localStorage, $cordovaSQLite, fxeService) {

  $scope.getBatteryLevel = function () {
    fxeService.getBatteryLevel()
      .then(function (level) {
        alert('Battery level is ' + (level * 100).toFixed(0) + '%');
      });
  };

  $scope.disconnect = fxeService.disconnect;
  $scope.reconnect = fxeService.reconnect;
  $scope.disableConnectionHolding = fxeService.disableConnectionHolding;

  $scope.upgradeFirmware = function () {
    $state.go('firmware-upgrade');
  };

  $scope.unpair = function () {
    if (!confirm('Really?')) return;

    fxeService.unpair();
    return fxeService.disconnect()
      .finally(function () {
        return $state.go('scanning');
      });
  };

  $scope.clearAll = function () {
    if (!confirm('Really?')) return;

    return fxeService.disconnect()
      .finally(function () {
        $localStorage.$reset();
        $cordovaSQLite.deleteDB({
          name: 'store.sqlite',
          iosDatabaseLocation: 'default'
        });
        ionic.Platform.exitApp();
      });
  };

    $scope._dumpDB = function() {
        var db = $cordovaSQLite.openDB({
            name: 'store.sqlite',
            bgType: true,
            version: '',
            iosDatabaseLocation: 'default'
        });
        return $cordovaSQLite.execute(db, 'SELECT * FROM lesson', []).then(function(lesson) {
            var res = {
                lesson: [],
                score: [],
            };

            for (var i = 0; i < lesson.rows.length; i++) res.lesson.push(lesson.rows.item(i));

            $cordovaSQLite.execute(db, 'SELECT * FROM score', []).then(function(score) {
                for (var i = 0; i < score.rows.length; i++) res.score.push(score.rows.item(i));

                var xmlhttp = new XMLHttpRequest();
                xmlhttp.open('POST', 'https://www.fxe-gear.com/api/v2/log');
                xmlhttp.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
                xmlhttp.setRequestHeader('Authorization', 'Bearer 6d050f299b9b90a9d0f8e61eb15ac42f2fc743a3');
                xmlhttp.send(angular.toJson(res));
                console.log('Database dumped to remote server.');
            });
        });
    };
};

module.controller('DeveloperController', DeveloperController);
