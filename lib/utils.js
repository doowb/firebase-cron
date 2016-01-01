'use strict';

/**
 * Module dependencies
 */

var utils = require('lazy-cache')(require);

/**
 * Temporarily re-assign `require` to trick browserify and
 * webpack into reconizing lazy dependencies.
 *
 * This tiny bit of ugliness has the huge dual advantage of
 * only loading modules that are actually called at some
 * point in the lifecycle of the application, whilst also
 * allowing browserify and webpack to find modules that
 * are depended on but never actually called.
 */

var fn = require;
require = utils;

/**
 * Lazily required module dependencies
 */

require('cron');
require('async');
require('moment');
require('firebase');
require('firebase-queue', 'Queue');

/**
 * Restore `require`
 */

require = fn;

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
