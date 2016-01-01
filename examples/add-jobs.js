'use strict';

/**
 * Add 3 jobs (A, B, C) with different schedules.
 */

var async = require('async');
var cron = require('./app');

var i = 1;
async.eachSeries(['A', 'B', 'C'], function(name, next) {
  var tab = '1-' + ((i++) * 10) + '/5 * * * * *';
  cron.addJob(name, tab, {name: name}, next);
}, function(err) {
  if (err) console.error(err);
  console.log('done');
  process.exit();
});
