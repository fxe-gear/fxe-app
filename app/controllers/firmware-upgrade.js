'use strict';

var module = angular.module('fxe.controllers.firmwareUpgrade', []);

var FirmwareUpgradeController = function ($scope, $state, $log, $ionicHistory, $ionicPopup, $cordovaFileTransfer, fxeService, apiService) {

  $scope.progress = null;
  $scope.working = null;
  $scope.status = null;

  var enter = function () {
    $scope.status = 'starting';
    $scope.working = true;

    upgradeFirmware()
      .then(function () {
        $scope.working = false;
        return $ionicPopup.alert({
          title: 'Firmware upgrade complete.',
          okType: 'button-balanced'
        });
      })
      .catch(function (error) {
        $scope.status = 'failed';
        $scope.working = false;
        return $ionicPopup.alert({
          title: 'Firmware upgrade failed.',
          template: 'Please restart the application and try it again.<br><br>' + error,
          okType: 'button-assertive'
        });
      })
      .then(function () {
        if ($ionicHistory.backView()) {
          return $ionicHistory.goBack();
        } else {
          $ionicHistory.nextViewOptions({historyRoot: true});
          return $state.go('scanning');
        }
      });
  };

  var upgradeFirmware = function () {
    var device = fxeService.getConnected();

    return apiService.getLatestFirmware(device)
      .then(function (response) {
        var app = response.data.application;
        var target = 'cdvfile://localhost/persistent/firmwares/' + app.version;
        return downloadFirmware(app.url, target);
      })
      .then(function (firmware) {
        return fxeService.upgradeFirmware(firmware.toURL());
      })
      .then(null, null, function (status) {
        // on notify, update status string and possibly progress

        if (status instanceof ProgressEvent) {
          // downloading firmware
          $scope.status = 'downloadingFirmware';
          $scope.progress = (status.loaded / status.total) * 100;

        } else {
          $scope.status = status.status;
          $scope.progress = status.status == 'progressChanged' ? status.progress.percent : null;
        }
      });
  };

  var downloadFirmware = function (from, to) {
    $log.debug('downloading firmware from ' + from + ' to ' + to);

    return $cordovaFileTransfer.download(from, to)
      .then(
        function (firmware) {
          $log.info('firmware downloaded');
          return firmware;
        },
        function (error) {
          $log.error('firmware download failed', error);
        },
        function (progress) {
          $log.debug('firmware download progress: ' + (progress.loaded / progress.total) * 100 + '%');
          return progress; // pass progress up in the promise chain
        }
      );
  };

  $scope.$on('$ionicView.beforeEnter', enter);

};

module.controller('FirmwareUpgradeController', FirmwareUpgradeController);
