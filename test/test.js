'use strict';

/* deps:mocha */
var async = require('async');
var assert = require('assert');
var Firebase = require('mockfirebase').MockFirebase;
var Cron = require('../');

describe('firebase-cron', function() {
  var ref = null;
  var queueRef = null;
  var cron = null;
  function createInstance(options) {
    ref = new Firebase('https://mock.firebaseio.com');
    queueRef = new Firebase('https://mock.firebaseio.com/queue');
    cron = new Cron(ref, queueRef, options);
  }

  beforeEach(function() {
    createInstance();
  });

  it('should create an instance', function() {
    assert(cron instanceof Cron);
  });

  it('should throw an error when `ref` is not defined', function(done) {
    try {
      cron = new Cron();
      done(new Error('expected an error'));
    } catch (err) {
      assert.equal(err.message, 'expected `ref` to be a firebase reference.');
      done();
    }
  });

  it('should throw an error when `queueRef` is not defined', function(done) {
    try {
      cron = new Cron(ref);
      done(new Error('expected an error'));
    } catch (err) {
      assert.equal(err.message, 'expected `queue` to be a firebase queue reference.');
      done();
    }
  });

  it('should create an instance with the correct default references', function() {
    var jobsRef = ref.child('jobs');
    assert.deepEqual(cron.root, ref);
    assert.deepEqual(cron.queue, queueRef);
    assert.deepEqual(cron.ref, jobsRef);
  });

  it('should create an instance with the correct custom jobs ref', function() {
    createInstance({endpoint: 'foo'});
    var jobsRef = ref.child('foo');
    assert.deepEqual(cron.root, ref);
    assert.deepEqual(cron.queue, queueRef);
    assert.deepEqual(cron.ref, jobsRef);
  });

  it('should add a job', function(done) {
    cron.addJob('test', '* * * * * *', {foo: 'bar'}, function(err) {
      if (err) return done(err);
      var data = ref.getData();
      assert(data.hasOwnProperty('jobs'));
      assert(data.jobs.hasOwnProperty('test'));
      assert(data.jobs.test.hasOwnProperty('pattern'));
      assert(data.jobs.test.hasOwnProperty('data'));
      assert(data.jobs.test.hasOwnProperty('nextRun'));
      assert.deepEqual(data.jobs.test.pattern, '* * * * * *');
      assert.deepEqual(data.jobs.test.data, {foo: 'bar'});
      done();
    });
    ref.flush();
  });

  it('should update a job', function(done) {
    cron.addJob('test', '* * * * * *', {foo: 'bar'}, function(err) {
      if (err) return done(err);
      cron.updateJob('test', '00 * * * * *', {bar: 'baz'}, function(err) {
        var data = ref.getData();
        assert(data.hasOwnProperty('jobs'));
        assert(data.jobs.hasOwnProperty('test'));
        assert(data.jobs.test.hasOwnProperty('pattern'));
        assert(data.jobs.test.hasOwnProperty('data'));
        assert(data.jobs.test.hasOwnProperty('nextRun'));
        assert.deepEqual(data.jobs.test.pattern, '00 * * * * *');
        assert.deepEqual(data.jobs.test.data, {bar: 'baz'});
        done();
      });
    });
    ref.flush();
  });

  it('should get a job', function(done) {
    cron.addJob('test', '* * * * * *', {foo: 'bar'}, function(err) {
      if (err) return done(err);
      cron.getJob('test', function(err, job) {
        if (err) return done(err);
        assert(job);
        assert(job.hasOwnProperty('pattern'));
        assert(job.hasOwnProperty('data'));
        assert(job.hasOwnProperty('nextRun'));
        assert.deepEqual(job.pattern, '* * * * * *');
        assert.deepEqual(job.data, {foo: 'bar'});
        done();
      });
    });
    ref.flush();
  });

  it('should get all jobs', function(done) {
    async.series([
      async.apply(cron.addJob.bind(cron), 'test-1', '* * * * * *', {foo: 'bar'}),
      async.apply(cron.addJob.bind(cron), 'test-2', '* * * * * *', {bar: 'baz'})
    ], function(err) {
      if (err) return done(err);
      cron.getJobs(function(err, jobs) {
        if (err) return done(err);
        assert(jobs);
        assert(jobs.hasOwnProperty('test-1'));
        assert(jobs.hasOwnProperty('test-2'));
        done();
      });
    });
    ref.flush();
  });

  it('should delete a job', function(done) {
    async.series([
      async.apply(cron.addJob.bind(cron), 'test-1', '* * * * * *', {foo: 'bar'}),
      async.apply(cron.addJob.bind(cron), 'test-2', '* * * * * *', {bar: 'baz'})
    ], function(err) {
      if (err) return done(err);
      cron.deleteJob('test-1', function(err) {
        var data = ref.getData();
        assert(data.hasOwnProperty('jobs'));
        assert(!data.jobs.hasOwnProperty('test-1'));
        assert(data.jobs.hasOwnProperty('test-2'));
        done();
      });
    });
    ref.flush();
  });

  // waiting on https://github.com/katowulf/mockfirebase/pull/61#issuecomment-168340400
  it.skip('should get all waiting jobs', function(done) {
    async.series([
      async.apply(cron.addJob.bind(cron), 'test-1', '00 00 00 * * *', {foo: 'bar'}),
      async.apply(cron.addJob.bind(cron), 'test-2', '* * * * * *', {bar: 'baz'})
    ], function(err) {
      if (err) return done(err);
      cron.waitingJobs(function(err, jobs) {
        if (err) return done(err);
        assert(jobs);
        assert(jobs.hasOwnProperty('test-1'));
        assert(jobs.hasOwnProperty('test-2'));
        done();
      });
    });
    ref.flush();
  });
});
