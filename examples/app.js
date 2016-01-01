'use strict';

/**
 * This is an example app that creates the references to a firebase and creates a new instance
 * of the `Cron` class. `Cron` requires a firebase endpoint to store cron jobs and a firebase-queue
 * endpoint to push job data to at the scheduled time.
 */

var Firebase = require('firebase');
var Cron = require('../');

/**
 * config has a `FIREBASE_URL` property that points to the root of a firebase.
 * The root is required because cron needs to access `/.info/serverTimeOffset`.
 * Use the `endpoint` option to specify where the `jobs` should be stored.
 */

var config = require('../tmp/config');

// normal firebase reference
var ref = new Firebase(config.FIREBASE_URL);

// firebase-queue reference. This should be the same reference that you would use in a firebase-queue.
// Data from cron jobs will be pushed into the `tasks` property at the scheduled time.
var queueRef = new Firebase(config.FIREBASE_URL + '/queue');

// create a new Cron instance that stores cron jobs at the `jobs` endpoint.
var cron = new Cron(ref, queueRef, {endpoint: 'jobs'});

/**
 * Exposes `cron` for use in examples
 */

module.exports = cron;
