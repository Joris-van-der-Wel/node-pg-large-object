'use strict';

/**
 * @exports pg-large-object/lib/promiseFromCallback
 * @param {function} fn
 * @param {object} self
 * @param {object} [options]
 * @returns {Promise}
 */
function promiseFromCallback(fn, self, options) {
        // there are no callbacks with more than two arguments in this project
        const twoArgs = options && options.twoArgs;

        return new Promise(function(resolve, reject) {
                function callback(error, arg1, arg2) {
                        if (error) {
                                reject(error);
                                return;
                        }

                        if (twoArgs) {
                                resolve([arg1, arg2]);
                        }
                        else {
                                resolve(arg1);
                        }
                }

                fn.call(self, callback);
        });
}

module.exports = promiseFromCallback;
