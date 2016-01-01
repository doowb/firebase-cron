'use strict';

var colors = require('ansi-colors');

var cron = require('./app');
cron.run(displayJobs, handleError);

function displayJobs(jobs) {
  var now = cron.remoteDate();
  if (!jobs) {
    console.log(colors.cyan('[ ' + new Date(now) + ' ]') + ' no jobs');
    return;
  }
  console.log(colors.cyan('[ ' + new Date(now) + ' ]'));
  Object.keys(jobs).forEach(function(name) {
    var job = jobs[name];
    console.log(name, new Date(job.nextRun));
  });
  console.log('------------------------------');
  console.log();
}

function handleError(err) {
  console.error(err);
}
