'use strict';

/**
 * Module dependencies
 */

const utils = module.exports = {};

utils.cron = require('cron');
utils.moment = require('moment');

var remoteDate = null;
utils.remoteDate = function(ref) {
  if (remoteDate) return remoteDate;

  var offset = 0;
  ref.child('/.info/serverTimeOffset').on('value', function(snapshot) {
    offset = snapshot.val() || 0;
  });

  remoteDate = function() {
    return Date.now() + offset;
  };

  return remoteDate;
};

/**
 * Expose `utils` modules
 */

module.exports = utils;
