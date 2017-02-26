"use strict";

var LargeObject = require('./LargeObject');



/** This class lets you use the Large Object functionality of PostgreSQL.
  * All usage of Large Object should take place within a transaction block!
  * (BEGIN ... COMMIT)   
  * 
  * @example new LargeObjectManager(client)
  * @constructor
  * @exports pg-large-object/lib/LargeObjectManager
  * @param {!pg/Client} client
  */
function LargeObjectManager(client)
{
        this._client = client;
}

/** @constant {Number} */
LargeObjectManager.WRITE = 0x00020000;
/** @constant {Number} */
LargeObjectManager.READ = 0x00040000;
/** @constant {Number} */ 
LargeObjectManager.READWRITE = 0x00020000 | 0x00040000;

/** @callback module:pg-large-object/lib/LargeObjectManager~openCallback
  * @param {?Error} error If set, an error occured.
  * @param {module:pg-large-object/lib/LargeObject} result
  */
/** Open an existing large object, based on its OID.
  * In mode READ, the data read from it will reflect the 
  * contents of the large object at the time of the transaction 
  * snapshot that was active when open was executed, 
  * regardless of later writes by this or other transactions.
  * If opened using WRITE (or READWRITE), data read will reflect 
  * all writes of other committed transactions as well as 
  * writes of the current transaction.
  * @param {Number} oid
  * @param {Number} mode One of WRITE, READ, or READWRITE
  * @param {module:pg-large-object/lib/LargeObjectManager~openCallback} callback
  */
LargeObjectManager.prototype.open = function(oid, mode, callback)
{
        if (!oid)
        {
                throw "Illegal Argument";
        }
        
        this._client.query(
                {name: "npg_lo_open", text:"SELECT lo_open($1, $2) AS fd", values: [oid, mode]},
                function(err, result)
                {
                        if (err) return callback(err);
                        
                        var fd = result.rows[0].fd;
                        
                        callback(null, new LargeObject(this._client, oid, fd));
                }.bind(this)
        );
};

/** @callback module:pg-large-object/lib/LargeObjectManager~createCallback
  * @param {?Error} error If set, an error occured.
  * @param {Number} oid
  */
/** Creates a large object, returning its OID. 
  * After which you can open() it.
  * @param {module:pg-large-object/lib/LargeObjectManager~createCallback} callback
  */
LargeObjectManager.prototype.create = function(callback)
{
        this._client.query(
                {name: "npg_lo_creat", text:"SELECT lo_creat($1) AS oid", values: [LargeObjectManager.READWRITE]},
                function(err, result)
                {
                        if (err) return callback(err);
                        
                        var oid = result.rows[0].oid;
                        callback(null, oid);
                }
        );
};

/** @callback module:pg-large-object/lib/LargeObjectManager~unlinkCallback
  * @param {?Error} error If set, an error occured.
  */
/** Unlinks (deletes) large object
  * @param {module:pg-large-object/lib/LargeObjectManager~unlinkCallback} [callback]
  */
LargeObjectManager.prototype.unlink = function(oid, callback)
{
        if (!oid)
        {
                throw "Illegal Argument";
        }
        
        this._client.query(
                {name: "npg_lo_unlink", text:"SELECT lo_unlink($1) as ok", values: [oid]},
                callback ? function(err, result)
                {
                        callback(err);
                } : undefined
        );
};

/** @callback module:pg-large-object/lib/LargeObjectManager~openAndReadableStreamCallback
  * @param {?Error} error If set, an error occured.
  * @param {Number} size The total size of the large object
  * @param {module:pg-large-object/lib/ReadStream} stream
  */
/** Open a large object, return a stream and close the object when done streaming.
  * Only call this within a transaction block.
  * @param {Number} oid  
  * @param {Number} [bufferSize=16384]  
  * @param {module:pg-large-object/lib/LargeObjectManager~openAndReadableStreamCallback} callback
  * 
  */
LargeObjectManager.prototype.openAndReadableStream = function(oid, bufferSize, callback)
{
        if (typeof bufferSize === 'function')
        {
                callback = bufferSize;
                bufferSize = undefined;
        }
        
        this.open(oid, LargeObjectManager.READ, function(err, obj)
        {
                if (err) return callback(err);
                
                obj.size(function(err, size)
                {
                        if (err) return callback(err);
                        
                        var stream = obj.getReadableStream(bufferSize);
                        
                        stream.on('end', function()
                        {
                                // this should rarely happen, but if it does
                                // use a callback so that error handling is consistent
                                // (otherwise an error will be emmited by node-postgres) 
                                obj.close(function(err)
                                {
                                        if (err)
                                        {
                                                console.error('Warning: closing a large object failed:', err);
                                        }
                                });
                        });
                        
                        callback(null, size, stream);
                });
        });
};

/** @callback module:pg-large-object/lib/LargeObjectManager~createAndWritableStreamCallback
  * @param {?Error} error If set, an error occured.
  * @param {Number} oid  
  * @param {module:pg-large-object/lib/WriteStream} stream
  */
/** Create and open a large object, return a stream and close the object when done streaming.
  * Only call this within a transaction block.
  * @param {Number} [bufferSize=16384]  
  * @param {module:pg-large-object/lib/LargeObjectManager~createAndWritableStreamCallback} [callback]
  */
LargeObjectManager.prototype.createAndWritableStream = function(bufferSize, callback)
{
        if (typeof bufferSize === 'function')
        {
                callback = bufferSize;
                bufferSize = undefined;
        }

        var man = this;
        
        man.create(function(err, oid)
        {
                if (err) return callback(err);
                
                man.open(oid, LargeObjectManager.WRITE, function(err, obj)
                {
                        if (err) return callback(err);
                        
                        var stream = obj.getWritableStream(bufferSize);
                        stream.on('finish', function()
                        { 
                                obj.close(function(err)
                                {
                                        if (err)
                                        {
                                                console.error('Warning: closing a large object failed:', err);
                                        }
                                });
                        });
                        
                        callback(null, oid, stream);
                });
        });
};

module.exports = LargeObjectManager;