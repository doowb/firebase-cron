'use strict';

const colors = require('ansi-colors');

const cron = require('./app');
cron.run(displayJobs, handleError);

function displayJobs(jobs) {
  const now = cron.remoteDate();
  if (!jobs) {
    console.log(colors.cyan('[ ' + new Date(now) + ' ]') + ' no jobs');
    return;
  }
  console.log(colors.cyan('[ ' + new Date(now) + ' ]'));
  Object.keys(jobs).forEach(function(name) {
    const job = jobs[name];
    console.log(name, new Date(job.nextRun));
  });
  console.log('------------------------------');
  console.log();
}

function handleError(err) {
  console.error(err);
}
