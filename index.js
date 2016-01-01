/*!
 * firebase-cron <https://github.com/doowb/firebase-cron>
 *
 * Copyright (c) 2015, Brian Woodward.
 * Licensed under the MIT License.
 */

'use strict';

var utils = require('./lib/utils');

/**
 * Main `Cron` class for creating a new instance to manage cron jobs.
 *
 * ```js
 * var Firebase = require('firebase');
 * var ref = new Firebase('https://{your-firebase}.firebaseio.com');
 * var queueRef = new Firebase('https://{your-firebase}.firebaseio.com/queue');
 * var options = {endpoint: 'jobs'};
 *
 * var cron = new Cron(ref, queueRef, options);
 * ```
 *
 * @param {Object} `ref` Instance of a [firebase][] reference pointing to the root of a [firebase][].
 * @param {Object} `queue` Instance of a [firebase][] refernece pointing to a [firebase-queue][].
 * @param {Object} `options` Options specifying where the cron jobs are stored.
 * @param {String} `options.endpoint` Specific endpoint relative to the `ref` where the cron jobs are stored (defaults to `jobs`.
 * @api public
 */

function Cron(ref, queue, options) {
  if (!(this instanceof Cron)) {
    return new Cron(ref, options);
  }
  this.options = options || {};

  if (!ref) {
    throw new Error('expected `ref` to be a firebase reference.');
  }

  if (!queue) {
    throw new Error('expected `queue` to be a firebase queue reference.');
  }

  this.root = ref;
  this.queue = queue;
  this.remoteDate = utils.remoteDate(this.root);
  this.ref = this.root.child(this.options.endpoint || 'jobs');
}

/**
 * Add a new cron job.
 *
 * @param {String} `name` Name of the cron job.
 * @param {String} `pattern` Cron job pattern. See [cron job patterns](http://crontab.org/) for specifics.
 * @param {Object} `data` Data to be pushed onto the [firebase-queue][] when job is run.
 * @param {Function} `cb` Callback function that is called after the job is added to the database.
 * @api public
 */

Cron.prototype.addJob = function(name, pattern, data, cb) {
  var schedule = utils.cron.time(pattern);
  var next = schedule._getNextDateFrom(this.remoteDate());
  var job = {
    pattern: pattern,
    nextRun: +next,
    data: data
  };
  this.ref.child(name).update(job, cb);
};

/**
 * Update a cron job.
 *
 * @param {String} `name` Name of the cron job.
 * @param {String} `pattern` Cron job pattern. See [cron job patterns](http://crontab.org/) for specifics.
 * @param {Object} `data` Data to be pushed onto the [firebase-queue][] when job is run.
 * @param {Function} `cb` Callback function that is called after the job is updated in the database.
 * @api public
 */

Cron.prototype.updateJob = function(name, pattern, data, cb) {
  var schedule = utils.cron.time(pattern);
  var next = schedule._getNextDateFrom(this.remoteDate());
  var job = {
    pattern: pattern,
    nextRun: +next,
    data: data
  };
  this.ref.child(name).update(job, cb);
};

/**
 * Remove a cron job.
 *
 * @param {String} `name` Name of the cron job.
 * @param {Function} `cb` Callback function that is called after the job is removed from the database.
 * @api public
 */

Cron.prototype.deleteJob = function(name, cb) {
  this.ref.child(name).remove(cb);
};

/**
 * Get a cron job.
 *
 * @param {String} `name` Name of the cron job.
 * @param {Function} `cb` Callback function that is called with any errors or the job.
 * @api public
 */

Cron.prototype.getJob = function(name, cb) {
  this.ref.child(name).once('value', function(snapshot) {
    cb(null, snapshot.val());
  });
};

/**
 * Get all of the cron jobs.
 *
 * @param {Function} `cb` Callback function that is called retrieving all of the jobs.
 * @api public
 */

Cron.prototype.getJobs = function(cb) {
  this.ref.once('value', function(snapshot) {
    cb(null, snapshot.val());
  });
};


/**
 * Get all of the scheduled/waiting jobs.
 *
 * @param {Function} `cb` Callback function that is called after retrieveing all of the waiting jobs.
 * @api public
 */

Cron.prototype.waitingJobs = function(cb) {
  var now = this.remoteDate();
  this.ref.orderByChild('nextRun')
    .endAt(now)
    .once('value', function(snapshot) {
      cb(null, snapshot.val());
    });
};


/**
 * Start running the cron manager.
 *
 * @param {Function} `cb` Callback function that is called each time manager checks for jobs to run.
 * @param {Function} `error` Callback function that is called if an error occurrs.
 * @api public
 */

Cron.prototype.run = function(cb, error) {
  var self = this;

  var id = null;
  var running = true;
  function stop() {
    if (id) clearTimeout(id);
    id = null;
  };

  function handleChanges(snapshot) {
    if (!running) return;
    var done = function(err) {
      stop();
      if (err) return error(err);
      id = setTimeout(execute.bind(null, done), 1000);
    };

    stop();
    execute(done);
  }

  function removeHandler() {
    self.ref.off('value', handleChanges);
  }

  function execute(done) {
    self.waitingJobs(function(err, jobs) {
      if (err) return done(err);

      cb(jobs);
      utils.async.eachOf(jobs, function(job, name, next) {
        var schedule = utils.cron.time(job.pattern);
        var lastRun = new Date(job.nextRun);
        lastRun.setSeconds(lastRun.getSeconds() + 1);
        job.nextRun = +schedule._getNextDateFrom(lastRun);
        job.lastRun = +utils.moment(lastRun);
        self.queue.child('tasks').push(job.data, next);
      }, function(err) {
        if (err) return done(err);
        if (!jobs) return done();
        self.ref.update(jobs, done);
      });
    });
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
