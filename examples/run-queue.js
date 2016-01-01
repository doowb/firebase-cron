'use strict';

/**
 * This example shows how the `cron` app is not required to run `firebase-queue`.
 * The only requirement is that the queue is listening to the same endpoint that the
 * cron jobs will be pushing tasks to.
 */

var colors = require('ansi-colors');
var Queue = require('firebase-queue');

// only used to ensure the same queue endpoint is used.
var cron = require('./app');

// create a new Queue instance using the same queue reference that cron is using
var queue = new Queue(cron.queue, function(data, progress, resolve, reject) {
  console.log(colors.cyan('-------- Queue starting [ ' + new Date() + ' ] ---------'));
  console.log();
  console.log(data);
  console.log();
  progress(50);
  setTimeout(function() {
    console.log(colors.cyan('-------- Queue finished [ ' + new Date() + ' ] ---------'));
    console.log();
    resolve();
  }, 0);
});
