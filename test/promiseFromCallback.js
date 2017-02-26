'use strict';

const promiseFromCallback = require('../lib/promiseFromCallback');

module.exports = {
        testResolve: function(test) {
                test.expect(2);

                const promise = promiseFromCallback(function(callback) {
                        test.equal(this, 'myThisObject');
                        callback(null, 1234);
                }, 'myThisObject');

                promise.then(function(result){
                        test.equal(result, 1234);
                        test.done();
                });
        },

        testResolveWithTwoArgs: function(test) {
                test.expect(2);

                const promise = promiseFromCallback(function(callback) {
                        test.equal(this, 'myThisObject');
                        callback(null, 1234, 4567);
                }, 'myThisObject', {twoArgs: true});

                promise.then(function(result){
                        test.deepEqual(result, [1234, 4567]);
                        test.done();
                });
        },

        testReject: function(test) {
                test.expect(2);

                const promise = promiseFromCallback(function(callback) {
                        test.equal(this, 'myThisObject');
                        callback(Error('foo'), 1234);
                }, 'myThisObject');

                promise.then(function() {
                        test.ok(false);
                }, function(error) {
                        test.equal(error.message, 'foo');
                        test.done();
                });
        },

        testThrow: function(test) {
                test.expect(2);

                const promise = promiseFromCallback(function(callback) {
                        test.equal(this, 'myThisObject');
                        throw Error('bar');
                }, 'myThisObject');

                promise.then(function() {
                        test.ok(false);
                }, function(error) {
                        test.equal(error.message, 'bar');
                        test.done();
                });
        },
};