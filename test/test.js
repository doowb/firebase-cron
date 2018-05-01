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

  // helper used because the mock ref needs to be flushed after calling the cron method
  const wrap = method => (...args) => {
    return new Promise((resolve, reject) => {
      cron[method](...args).then(resolve).catch(reject);
      ref.flush();
    });
  };

  const getJob = wrap('getJob');
  const addJob = wrap('addJob');
  const getJobs = wrap('getJobs');
  const updateJob = wrap('updateJob');
  const deleteJob = wrap('deleteJob');
  const waitingJobs = wrap('waitingJobs');

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

  it('should add a job', async () => {
    await addJob('test', '* * * * * *', {foo: 'bar'});

    const data = ref.getData();
    assert(data.hasOwnProperty('jobs'));
    assert(data.jobs.hasOwnProperty('test'));
    assert(data.jobs.test.hasOwnProperty('pattern'));
    assert(data.jobs.test.hasOwnProperty('data'));
    assert(data.jobs.test.hasOwnProperty('nextRun'));
    assert.deepEqual(data.jobs.test.pattern, '* * * * * *');
    assert.deepEqual(data.jobs.test.data, {foo: 'bar'});
  });

  it('should update a job', async () => {
    await addJob('test', '* * * * * *', {foo: 'bar'});
    await updateJob('test', '00 * * * * *', {bar: 'baz'});

    const data = ref.getData();
    assert(data.hasOwnProperty('jobs'));
    assert(data.jobs.hasOwnProperty('test'));
    assert(data.jobs.test.hasOwnProperty('pattern'));
    assert(data.jobs.test.hasOwnProperty('data'));
    assert(data.jobs.test.hasOwnProperty('nextRun'));
    assert.deepEqual(data.jobs.test.pattern, '00 * * * * *');
    assert.deepEqual(data.jobs.test.data, {foo: 'bar', bar: 'baz'});
  });

  it('should get a job', async () => {
    await addJob('test', '* * * * * *', {foo: 'bar'});
    const job = await getJob('test');
    assert(job);
    assert(job.hasOwnProperty('pattern'));
    assert(job.hasOwnProperty('data'));
    assert(job.hasOwnProperty('nextRun'));
    assert.deepEqual(job.pattern, '* * * * * *');
    assert.deepEqual(job.data, {foo: 'bar'});
  });

  it('should get all jobs', async () => {
    await addJob('test-1', '* * * * * *', {foo: 'bar'});
    await addJob('test-2', '* * * * * *', {bar: 'baz'});
    const jobs = await getJobs();
    assert(jobs);
    assert(jobs.hasOwnProperty('test-1'));
    assert(jobs.hasOwnProperty('test-2'));
  });

  it('should delete a job', async () => {
    await addJob('test-1', '* * * * * *', {foo: 'bar'});
    await addJob('test-2', '* * * * * *', {bar: 'baz'});
    await deleteJob('test-1');

    const data = ref.getData();
    assert(data.hasOwnProperty('jobs'));
    assert(!data.jobs.hasOwnProperty('test-1'));
    assert(data.jobs.hasOwnProperty('test-2'));
  });

  // waiting on https://github.com/katowulf/mockfirebase/pull/61#issuecomment-168340400
  it.skip('should get all waiting jobs', async () => {
    await addJob('test-1', '00 00 00 * * *', {foo: 'bar'});
    await addJob('test-2', '* * * * * *', {bar: 'baz'});
    const jobs = await waitingJobs();
    assert(jobs);
    assert(jobs.hasOwnProperty('test-1'));
    assert(jobs.hasOwnProperty('test-2'));
  });
});
