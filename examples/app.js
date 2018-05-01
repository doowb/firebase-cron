'use strict';

/**
 * This is an example app that creates the references to a firebase and creates a new instance
 * of the `Cron` class. `Cron` requires a firebase endpoint to store cron jobs and a firebase-queue
 * endpoint to push job data to at the scheduled time.
 */

const firebase = require('firebase');
const Cron = require('../');

/**
 * config has a `FIREBASE_URL` property that points to the root of a firebase.
 * The root is required because cron needs to access `/.info/serverTimeOffset`.
 * Use the `endpoint` option to specify where the `jobs` should be stored.
 */

const config = require('../tmp/config');
firebase.initializeApp(config);

// normal firebase reference
const ref = firebase.database().ref();

// firebase-queue reference. This should be the same reference that you would use in a firebase-queue.
// Data from cron jobs will be pushed into the `tasks` property at the scheduled time.
const queueRef = firebase.database().ref('example-queue');

// create a new Cron instance that stores cron jobs at the `example-jobs` endpoint.
const cron = new Cron(ref, queueRef, {
  interval: 2000,
  endpoint: 'example-jobs'
});

/**
 * Exposes `cron` for use in examples
 */

module.exports = cron;
