/*!
 * firebase-cron <https://github.com/doowb/firebase-cron>
 *
 * Copyright (c) 2015, Brian Woodward.
 * Licensed under the MIT License.
 */

'use strict';

var utils = require('./lib/utils');

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

Cron.prototype.addJob = function(name, tab, data, cb) {
  var schedule = utils.cron.time(tab);
  var next = schedule._getNextDateFrom(this.remoteDate());
  var job = {
    tab: tab,
    nextRun: +next,
    data: data
  };
  this.ref.child(name).update(job, cb);
};

Cron.prototype.updateJob = function(name, tab, data, cb) {
  var schedule = utils.cron.time(tab);
  var next = schedule._getNextDateFrom(this.remoteDate());
  var job = {
    tab: tab,
    nextRun: +next,
    data: data
  };
  this.ref.child(name).update(job, cb);
};

Cron.prototype.deleteJob = function(name, cb) {
  this.ref.child(name).remove(cb);
};

Cron.prototype.getJob = function(name, cb) {
  this.ref.child(name).once('value', function(snapshot) {
    cb(null, snapshot.val());
  });
};

Cron.prototype.getJobs = function(cb) {
  this.ref.once('value', function(snapshot) {
    cb(null, snapshot.val());
  });
};

Cron.prototype.waitingJobs = function(cb) {
  var now = this.remoteDate();
  this.ref.orderByChild('nextRun')
    .endAt(now)
    .once('value', function(snapshot) {
      cb(null, snapshot.val());
    });
};

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
        var schedule = utils.cron.time(job.tab);
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

module.exports = Cron;
