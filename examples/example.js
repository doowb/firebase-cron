'use strict';

const cron = require('./app');

/**
 * Add a cron job that will run on the specified cron schedule.
 */

cron.addJob('test', '00 * * * * *', {foo: 'bar'}, function(err) {
  if (err) return console.error(err);
  console.log('job added');
  console.log();

  /**
   * Update the cron job and give it a new schedule and new data.
   */

  cron.updateJob('test', '00 00 * * * *', {bar: 'baz'}, function(err) {
    if (err) return console.error(err);
    console.log('job updated');
    console.log();

    /**
     * Get the cron job to see the nextRun time and data.
     */

    cron.getJob('test', function(err, job) {
      if (err) return console.error(err);
      console.log('test job:', job);
      console.log('nextRun:', new Date(job.nextRun));
      console.log();

      /**
       * Get all of the cron jobs and see their next run times.
       */

      cron.getJobs(function(err, jobs) {
        if (err) return console.error(err);
        console.log('---- All jobs ----');
        Object.keys(jobs).forEach(function(name) {
          const job = jobs[name];
          console.log(name, new Date(job.nextRun));
        });
        console.log();

        /**
         * Get all of the cron jobs that are waiting to run (nextRun < now).
         */

        cron.waitingJobs(function(err, jobs) {
          if (err) return console.error(err);
          console.log('---- Waiting Jobs ----');
          console.log(jobs);
          console.log();
          process.exit();
        });
      });
    });
  });
});
