'use strict';

/**
 * Add 3 jobs (A, B, C) with different schedules.
 */
const util = require('util');
const cron = require('./app');

(async () => {
  const addJob = util.promisify(cron.addJob.bind(cron));

  let i = 1;
  for (const name of ['A', 'B', 'C']) {
    const pattern = '1-' + ((i++) * 10) + '/5 * * * * *';
    await addJob(name, pattern, {name: name});
  }

  console.log('done');
  process.exit();

})().catch(err => {
  console.error(err);
  process.exit(1);
});

