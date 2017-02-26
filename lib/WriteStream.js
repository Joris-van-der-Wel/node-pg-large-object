"use strict";
var stream = require('stream');



/** 
  * @constructor
  * @augments stream.Writable
  * @exports pg-large-object/lib/WriteStream
  */
function WriteStream(largeObject, bufferSize)
{
        stream.Writable.call(this, {
                'highWaterMark': bufferSize || 16384,
                'decodeStrings': true,
                'objectMode': false
        });
        this._largeObject = largeObject;
}

WriteStream.prototype = Object.create(stream.Writable.prototype);

WriteStream.prototype._write = function(chunk, encoding, callback)
{
        if (!Buffer.isBuffer(chunk))
        {
                throw "Illegal Argument";
        }
        
        // callback(error)
        this._largeObject.write(chunk, callback);
};

module.exports = WriteStream;
