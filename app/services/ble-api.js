'use strict';

var module = angular.module('fxe.services.bleApi', []);

// naming note: "chrcs" stands for "characteristics"
// see https://trello.com/c/P9eRHwi2
module.constant('bleApi', {
  control: {
    uuid: '6b00',
    chrcs: {
      measure: {
        uuid: '6d01'
      },
      sport: {
        uuid: '6d02'
      },
      lesson: {
        uuid: '6d03'
      },
      sleep: {
        uuid: '6d04'
      }
    }
  },
  jumping: {
    uuid: '6b01',
    chrcs: {
      amplitude: {
        uuid: '6c01'
      },
      rhythm: {
        uuid: '6c02'
      },
      frequency: {
        uuid: '6c03'
      }
    }
  },
  running: {
    uuid: '6b02',
    chrcs: {
      amplitude: {
        uuid: '6c04'
      },
      rhythm: {
        uuid: '6c05'
      },
      frequency: {
        uuid: '6c06'
      }
    }
  },
  led: {
    uuid: '7000',
    chrcs: {
      color: {
        uuid: '7001'
      }
    }
  },
  device: {
    uuid: '180a',
    chrcs: {
      manufacturer: {
        uuid: '2a29'
      },
      firmware: {
        uuid: '2a26'
      }
    }
  },
  battery: {
    uuid: '180f',
    chrcs: {
      level: {
        uuid: '2a19'
      }
    }
  }
});
