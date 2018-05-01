'use strict';

/* deps:mocha */
const assert = require('assert');
const Firebase = require('firebase-mock').MockFirebase;
const Cron = require('../');

describe('firebase-cron', function() {
  let ref = null;
  let queueRef = null;
  let cron = null;
  function createInstance(options) {
    ref = new Firebase('https://mock.firebaseio.com');
    queueRef = new Firebase('https://mock.firebaseio.com/queue');
    cron = new Cron(ref, queueRef, options);
  }

  function addJob(name, pattern, data) {
    return new Promise((resolve, reject) => {
      cron.addJob(name, pattern, data, err => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
      ref.flush();
    });
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
    const jobsRef = ref.child('jobs');
    assert.deepEqual(cron.root, ref);
    assert.deepEqual(cron.queue, queueRef);
    assert.deepEqual(cron.ref, jobsRef);
  });

  it('should create an instance with the correct custom jobs ref', function() {
    createInstance({endpoint: 'foo'});
    const jobsRef = ref.child('foo');
    assert.deepEqual(cron.root, ref);
    assert.deepEqual(cron.queue, queueRef);
    assert.deepEqual(cron.ref, jobsRef);
  });

  it('should add a job', function(done) {
    cron.addJob('test', '* * * * * *', {foo: 'bar'}, function(err) {
      if (err) return done(err);
      const data = ref.getData();
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
        const data = ref.getData();
        assert(data.hasOwnProperty('jobs'));
        assert(data.jobs.hasOwnProperty('test'));
        assert(data.jobs.test.hasOwnProperty('pattern'));
        assert(data.jobs.test.hasOwnProperty('data'));
        assert(data.jobs.test.hasOwnProperty('nextRun'));
        assert.deepEqual(data.jobs.test.pattern, '00 * * * * *');
        assert.deepEqual(data.jobs.test.data, {foo: 'bar', bar: 'baz'});
        done();
      });
      ref.flush();
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
      ref.flush();
    });
    ref.flush();
  });

  it('should get all jobs', async function() {
    await addJob('test-1', '* * * * * *', {foo: 'bar'});
    await addJob('test-2', '* * * * * *', {bar: 'baz'});
    return new Promise((resolve, reject) => {
      cron.getJobs(function(err, jobs) {
        if (err) return reject(err);
        assert(jobs);
        assert(jobs.hasOwnProperty('test-1'));
        assert(jobs.hasOwnProperty('test-2'));
        resolve();
      });
      ref.flush();
    });
  });

  it('should delete a job', async function() {
    await addJob('test-1', '* * * * * *', {foo: 'bar'});
    await addJob('test-2', '* * * * * *', {bar: 'baz'});
    return new Promise((resolve, reject) => {
      cron.deleteJob('test-1', function(err) {
        if (err) {
          reject(err);
          return;
        }

        const data = ref.getData();
        assert(data.hasOwnProperty('jobs'));
        assert(!data.jobs.hasOwnProperty('test-1'));
        assert(data.jobs.hasOwnProperty('test-2'));
        resolve();
      });
      ref.flush();
    });
  });

  // waiting on https://github.com/katowulf/mockfirebase/pull/61#issuecomment-168340400
  it.skip('should get all waiting jobs', async function() {
    await addJob('test-1', '00 00 00 * * *', {foo: 'bar'});
    await addJob('test-2', '* * * * * *', {bar: 'baz'});
    return new Promise((resolve, reject) => {
      cron.waitingJobs(function(err, jobs) {
        if (err) {
          reject(err);
          return;
        }
        assert(jobs);
        assert(jobs.hasOwnProperty('test-1'));
        assert(jobs.hasOwnProperty('test-2'));
        resolve();
      });
      ref.flush();
    });
  });
});
