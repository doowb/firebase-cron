/*!
 * firebase-cron <https://github.com/doowb/firebase-cron>
 *
 * Copyright (c) 2015-2018, Brian Woodward.
 * Released under the MIT License.
 */

'use strict';

const moment = require('moment');
const parser = require('cron-parser');

/**
 * Main `Cron` class for creating a new instance to manage cron jobs.
 *
 * ```js
 * const Firebase = require('firebase');
 * const ref = new Firebase('https://{your-firebase}.firebaseio.com');
 * const queueRef = new Firebase('https://{your-firebase}.firebaseio.com/queue');
 * const options = {endpoint: 'jobs'};
 *
 * const cron = new Cron(ref, queueRef, options);
 * ```
 *
 * @param {Object} `ref` Instance of a [firebase][] reference pointing to the root of a [firebase][].
 * @param {Object} `queue` Instance of a [firebase][] refernece pointing to a [firebase-queue][].
 * @param {Object} `options` Options specifying where the cron jobs are stored.
 * @param {String} `options.endpoint` Specific endpoint relative to the `ref` where the cron jobs are stored (defaults to `jobs`).
 * @param {Number} `options.interval` Optional interval in milliseconds to use when calling `.run` (defaults to 1000).
 * @api public
 */

function Cron(ref, queue, options) {
  if (!(this instanceof Cron)) {
    return new Cron(ref, queue, options);
  }
  this.options = Object.assign({
    interval: 1000,
    endpoint: 'jobs'
  }, options);

  if (!ref) {
    throw new Error('expected `ref` to be a firebase reference.');
  }

  if (!queue) {
    throw new Error('expected `queue` to be a firebase queue reference.');
  }

  this.root = ref;
  this.queue = queue;

  let offset = 0;
  let remoteDate = null;
  this.remoteDate = () => Date.now() + offset;
  this.ref = this.root.child(this.options.endpoint);

  this.root.child('/.info/serverTimeOffset').on('value', function(snapshot) {
    offset = snapshot.val() || 0;
  });
}

/**
 * Add a new cron job.
 *
 * @param {String} `name` Name of the cron job.
 * @param {String} `pattern` Cron job pattern. See [cron job patterns](http://crontab.org/) for specifics.
 * @param {Object} `data` Data to be pushed onto the [firebase-queue][] when job is run.
 * @returns {Promise} Returns a promise that is resolved when the job has been updated.
 * @api public
 */

Cron.prototype.addJob = function(name, pattern, data) {
  const schedule = parser.parseExpression(pattern, {currentDate: this.remoteDate()});
  const job = {
    pattern: pattern,
    nextRun: +schedule.next().toDate(),
    data: data
  };
  return this.ref.child(name).update(job);
};

/**
 * Update a cron job.
 *
 * @param {String} `name` Name of the cron job.
 * @param {String} `pattern` Cron job pattern. See [cron job patterns](http://crontab.org/) for specifics.
 * @param {Object} `data` Data to be pushed onto the [firebase-queue][] when job is run.
 * @returns {Promise} Returns a promise that is resolved when the job has been added.
 * @api public
 */

Cron.prototype.updateJob = function(name, pattern, data) {
  const schedule = parser.parseExpression(pattern, {currentDate: this.remoteDate()});
  const job = {
    pattern: pattern,
    nextRun: +schedule.next().toDate(),
    data: data
  };
  return this.ref.child(name).update(job);
};

/**
 * Remove a cron job.
 *
 * @param {String} `name` Name of the cron job.
 * @returns {Promise} Returns a promise that is resolved when the job has been removed.
 * @api public
 */

Cron.prototype.deleteJob = function(name) {
  return this.ref.child(name).remove();
};

/**
 * Get a cron job.
 *
 * @param {String} `name` Name of the cron job.
 * @returns {Promise} Returns a promise that is resolved with the job.
 * @api public
 */

Cron.prototype.getJob = function(name) {
  return this.ref.child(name).once('value')
    .then(snap => snap.val());
};

/**
 * Get all of the cron jobs.
 *
 * @returns {Promise} Returns a promise that is resolved with all of the jobs.
 * @api public
 */

Cron.prototype.getJobs = function() {
  return this.ref.once('value')
    .then(snap => snap.val());
};


/**
 * Get all of the scheduled/waiting jobs.
 *
 * @returns {Promise} Returns a promise that is resolved with the waiting jobs.
 * @api public
 */

Cron.prototype.waitingJobs = function() {
  const now = this.remoteDate();
  return this.ref.orderByChild('nextRun').endAt(now).once('value')
    .then(snap => snap.val());
};


/**
 * Start running the cron manager.
 *
 * @param {Function} `cb` Callback function that is called each time manager checks for jobs to run.
 * @param {Function} `error` Callback function that is called if an error occurrs.
 * @api public
 */

Cron.prototype.run = function(cb, error) {
  const self = this;
  const interval = this.options.interval;

  let id = null;
  let running = true;
  function stop() {
    if (id) clearTimeout(id);
    id = null;
  };

  function handleChanges(snapshot) {
    if (!running) return;
    const done = function(err) {
      stop();
      if (err) return error(err);
      id = setTimeout(() => execute().then(done).catch(done), interval);
    };

    stop();
    execute().then(done).catch(done);
  }

  function removeHandler() {
    self.ref.off('value', handleChanges);
  }

  async function execute() {
    const jobs = await self.waitingJobs();
    cb(jobs);

    if (!jobs) return;
    for (const name in jobs) {
      const job = jobs[name];
      const lastRun = new Date(job.nextRun);
      lastRun.setSeconds(lastRun.getSeconds() + 1);

      const schedule = parser.parseExpression(job.pattern, {currentDate: lastRun});
      job.nextRun = +schedule.next().toDate();
      job.lastRun = +moment(lastRun);
      await self.queue.child('tasks').push(job.data);
    }

    await self.ref.update(jobs);
  }

  this.ref.on('value', handleChanges);

  return function() {
    running = false;
    removeHandler();
    stop();
  };
};

/**
 * Exposes `Cron`
 */

module.exports = Cron;
