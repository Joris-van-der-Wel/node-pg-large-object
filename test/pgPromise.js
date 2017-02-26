"use strict";

var pgp = require('pg-promise')();
var Q = require('q');
var pglo = require('../lib');
var fs = require('fs');
var crypto = require('crypto');

var db = pgp("postgres://nodetest:nodetest@localhost/nodetest");
var testFile = "./test/test.jpg";
var testOutFile = "./test/out.jpg";
var testFileSize = fs.statSync(testFile).size;
var testBuf = new Buffer('0123456789ABCDEF', 'hex');

var createdOid;

module.exports = {
        testCreateAndWrite: function(test)
        {
                test.expect(3);

                Q(db.tx(function(tx) {
                        var man = new pglo.LargeObjectManager({pgPromise: tx});

                        return man.createAsync()
                        .then(function(oid)
                        {
                                createdOid = oid;
                                test.ok(oid);
                                test.notEqual(oid, 0);

                                console.log("creating a new Large Object with oid: ", oid);

                                return man.openAsync(oid, pglo.LargeObjectManager.WRITE)
                                .then(function(obj)
                                {
                                        return obj.writeAsync(testBuf).then(function()
                                        {
                                                test.ok(true);
                                        })
                                        .then(function()
                                        {
                                                return obj.closeAsync();
                                        });
                                });
                        });
                }))
                .fail(function(err)
                {
                        test.ifError(err);
                })
                .done(function()
                {
                        test.done();
                });      
        },
        testRead: function(test)
        {
                var oid = createdOid;
                
                test.ok(oid);
                test.expect(18);

                Q(db.tx(function(tx) {
                        var man = new pglo.LargeObjectManager({pgPromise: tx});
                        
                        return man.openAsync(oid, pglo.LargeObjectManager.READ)
                        .then(function(obj)
                        {
                                return obj.readAsync(2)
                                .then(function(buf)
                                {
                                        test.ok(buf);
                                        test.equal(buf.length, 2);
                                        test.equal(buf[0], testBuf[0]);
                                        test.equal(buf[1], testBuf[1]);
                                })
                                .then(function()
                                {
                                        return obj.tellAsync()
                                        .then(function(position)
                                        {
                                                test.equal(position, 2);
                                        });
                                })
                                .then(function()
                                {
                                        return obj.sizeAsync()
                                        .then(function(size)
                                        {
                                                test.equal(size, 8);
                                        });
                                })
                                .then(function()
                                {
                                        return obj.tellAsync()
                                        .then(function(position)
                                        {
                                                test.equal(position, 2, 'calling size() should not change the position');
                                        });
                                })
                                .then(function()
                                {
                                        return obj.readAsync(100)
                                        .then(function(buf)
                                        {
                                                test.equal(buf.length, 6);
                                                for (var i = 0; i < 6; ++i)
                                                {
                                                        test.equal(buf[i], testBuf[i+2]);
                                                }
                                        });
                                })
                                .then(function()
                                {
                                        return obj.seekAsync(-2, pglo.LargeObject.SEEK_END);
                                })
                                .then(function()
                                {
                                        return obj.readAsync(100)
                                        .then(function(buf)
                                        {
                                                test.equal(buf.length, 2);
                                                test.equal(buf[0], testBuf[6]);
                                                test.equal(buf[1], testBuf[7]);
                                        });
                                })
                                .then(function()
                                {
                                        return obj.closeAsync();
                                })
                                .then(function()
                                {
                                        createdOid = null;
                                        console.log("unlinking the Large Object with oid: ", oid);
                                        return man.unlinkAsync(oid);
                                })
                        });
                }))
                .fail(function(err)
                {
                        test.ifError(err);
                })
                .done(function()
                {
                        test.done();
                });
        },
        testWriteStream: function(test)
        {
                test.expect(1);

                Q(db.tx(function(tx) {
                        var man = new pglo.LargeObjectManager({pgPromise: tx});

                        return man.createAndWritableStreamAsync()
                        .then(function(args)
                        {
                                var oid = args[0];
                                var stream = args[1];
                                createdOid = oid;
                                var deferred = Q.defer();

                                console.log("creating a new Large Object with oid: ", oid);

                                var fileStream = fs.createReadStream(testFile);
                                fileStream.pipe(stream);

                                stream.on('error', function(err)
                                {
                                        deferred.reject(err);
                                });

                                stream.on('finish', function()
                                {
                                        test.ok(true);
                                        deferred.resolve();
                                });

                                return deferred.promise;
                        })
                }))
                .fail(function(err)
                {
                        test.ifError(err);
                })
                .done(function()
                {
                        test.done();
                });
        },
        testReadStream: function(test)
        {
                var oid = createdOid;
                test.expect(3);

                Q(db.tx(function(tx) {
                        var man = new pglo.LargeObjectManager({pgPromise: tx});

                        return sha256_hex(testFile)
                        .then(function (origHash) {
                                return man.openAndReadableStreamAsync(oid)
                                .then(function (args) {
                                        var size = args[0];
                                        var stream = args[1];
                                        var deferred = Q.defer();

                                        test.equal(size, testFileSize);

                                        var fileStream = fs.createWriteStream(testOutFile);
                                        stream.pipe(fileStream);

                                        stream.on('error', function (err) {
                                                deferred.reject(err);
                                        });

                                        stream.on('end', function () {
                                                test.ok(true);
                                                deferred.resolve();
                                        });

                                        return deferred.promise;
                                })
                                .then(function () {
                                        return sha256_hex(testOutFile);
                                })
                                .then(function (outHash) {
                                        test.equal(outHash, origHash);
                                })
                                .then(function () {
                                        createdOid = null;
                                        console.log("unlinking the Large Object with oid: ", oid);
                                        return man.unlinkAsync(oid);
                                });
                        });
                }))
                .fail(function(err)
                {
                        test.ifError(err);
                })
                .done(function()
                {
                        test.done();
                });
        }
};

function sha256_hex(filename)
{
        return new Promise(function(resolve, reject) {
                var sum = crypto.createHash('sha256');
                var s = fs.ReadStream(filename);
                s.on('error', reject);
                s.on('data', function(d)
                {
                        sum.update(d);
                });
                s.on('end', function()
                {
                        resolve(sum.digest('hex'));
                });
        });
}
