node-pg-large-object
====================
Large object support for PostgreSQL clients using the [node-postgres](https://www.npmjs.org/package/pg) library.

The API of this library resembles the JDBC library for PostgreSQL.

Installation
------------

```
npm install pg-large-object
```

You will also need to install the [pg](https://www.npmjs.org/package/pg) library:

```
npm install pg
```

Some of the methods in this library require PostgreSQL 9.3 (server) and up:
* LargeObject.seek()
* LargeObject.tell()
* LargeObject.size()
* LargeObject.truncate()

All other methods should work on PostgreSQL 8.4 and up.

Large Objects
-------------
Large Objects in PostgreSQL lets you store files/objects up to 4 TiB in size. The main benefit
of using Large Objects instead of a simple column is that the data can be read and written in
chunks (e.g. as a stream), instead of having to load the entire column into memory.

Examples
--------

Reading a large object using a stream:

```javascript
var pg = require('pg');
var LargeObjectManager = require('pg-large-object').LargeObjectManager;
var conString = "postgres://postgres:1234@localhost/postgres";

pg.connect(conString, function(err, client, done)
{
  if (err)
  {
    return console.error('could not connect to postgres', err);
  }

  var man = new LargeObjectManager(client);

  // When working with Large Objects, always use a transaction
  client.query('BEGIN', function(err, result)
  {
    if (err)
    {
      done(err);
      return client.emit('error', err);
    }

    // A LargeObject oid, probably stored somewhere in one of your own tables.
    var oid = 123;

    // If you are on a high latency connection and working with
    // large LargeObjects, you should increase the buffer size
    var bufferSize = 16384;
    man.openAndReadableStream(oid, bufferSize, function(err, size, stream)
    {
      if (err)
      {
        done(err);
        return console.error('Unable to read the given large object', err);
      }

      console.log('Streaming a large object with a total size of ', size);
      stream.on('end', function()
      {
        client.query('COMMIT', done);
      });

      // Store it as an image
      var fileStream = require('fs').createWriteStream('my-file.png');
      stream.pipe(fileStream);
    });
  });
});
```


Creating a new large object using a stream:

```javascript
var pg = require('pg');
var LargeObjectManager = require('pg-large-object').LargeObjectManager;
var conString = "postgres://postgres:1234@localhost/postgres";

pg.connect(conString, function(err, client, done)
{
  if (err)
  {
    return console.error('could not connect to postgres', err);
  }

  var man = new LargeObjectManager(client);

  // When working with Large Objects, always use a transaction
  client.query('BEGIN', function(err, result)
  {
    if (err)
    {
      done(err);
      return client.emit('error', err);
    }

    // If you are on a high latency connection and working with
    // large LargeObjects, you should increase the buffer size
    var bufferSize = 16384;
    man.createAndWritableStream(bufferSize, function(err, oid, stream)
    {
      if (err)
      {
        done(err);
        return console.error('Unable to create a new large object', err);
      }

      // The server has generated an oid
      console.log('Creating a large object with the oid ', oid);
      stream.on('finish', function()
      {
        // Actual writing of the large object in DB may
        // take some time, so one should provide a
        // callback to client.query.
        client.query('COMMIT', done);
      });

      // Upload an image
      var fileStream = require('fs').createReadStream('upload-my-file.png');
      fileStream.pipe(stream);
    });
  });
});
```

Using LargeObject methods.

```javascript
var pg = require('pg');
var LargeObjectManager = require('pg-large-object').LargeObjectManager;
var LargeObject = require('pg-large-object').LargeObject;
var conString = "postgres://postgres:1234@localhost/postgres";

pg.connect(conString, function(err, client, done)
{
  if (err)
  {
    return console.error('could not connect to postgres', err);
  }

  var man = new LargeObjectManager(client);

  // When working with Large Objects, always use a transaction
  client.query('BEGIN', function(err, result)
  {
    if (err)
    {
      done(err);
      return client.emit('error');
    }

    // A LargeObject oid, probably stored somewhere in one of your own tables.
    var oid = 123;

    // Open with READWRITE if you would like to use
    // write() and truncate()
    man.open(oid, LargeObjectManager.READ, function(err, obj)
    {
      if (err)
      {
        done(err);
        return console.error(
          'Unable to open the given large object',
          oid,
          err);
      }

      // Read the first 50 bytes
      obj.read(50, function(err, buf)
      {
        // buf is a standard node.js Buffer
        console.log(buf.toString('hex'));
      });

      // pg uses a query queue, this guarantees the LargeObject
      // will be executed in the order you call them, even if you do not
      // wait on the callbacks.
      // In this library the callback for methods that only return an error
      // is optional (such as for seek below). If you do not give a callback
      // and an error occurs, this error will me emit()ted on the client object.

      // Set the position to byte 5000
      obj.seek(5000, LargeObject.SEEK_SET);
      obj.tell(function(err, position)
      {
        console.log(err, position); // 5000
      });
      obj.size(function(err, size)
      {
        console.log(err, size); // The size of the entire LargeObject
      });

      // Done with the object, close it
      obj.close();
      client.query('COMMIT', done);
    });
  });
});
```

Testing
-------
You can test this library by running:

```
npm install pg-large-object
npm test
```

The test assumes that postgres://nodetest:nodetest@localhost/nodetest is a valid database.
You also need to place a large file named "test.jpg" in the test folder.

API Documentation
-----------------
Also see: http://www.postgresql.org/docs/9.3/static/largeobjects.html
## Modules

<dl>
<dt><a href="#module_pg-large-object">pg-large-object</a></dt>
<dd></dd>
<dt><a href="#module_pg-large-object/lib/LargeObject">pg-large-object/lib/LargeObject</a></dt>
<dd><p>Represents an opened large object.</p>
</dd>
<dt><a href="#module_pg-large-object/lib/LargeObjectManager">pg-large-object/lib/LargeObjectManager</a></dt>
<dd><p>This class lets you use the Large Object functionality of PostgreSQL.
All usage of Large Object should take place within a transaction block!
(BEGIN ... COMMIT)</p>
</dd>
<dt><a href="#module_pg-large-object/lib/promiseFromCallback">pg-large-object/lib/promiseFromCallback</a> ⇒ <code>Promise</code></dt>
<dd></dd>
<dt><a href="#module_pg-large-object/lib/ReadStream">pg-large-object/lib/ReadStream</a> ⇐ <code>stream.Readable</code></dt>
<dd></dd>
<dt><a href="#module_pg-large-object/lib/WriteStream">pg-large-object/lib/WriteStream</a> ⇐ <code>stream.Writable</code></dt>
<dd></dd>
</dl>

<a name="module_pg-large-object"></a>

## pg-large-object

* [pg-large-object](#module_pg-large-object)
    * [.LargeObjectManager](#module_pg-large-object.LargeObjectManager) : <code>function</code>
    * [.LargeObject](#module_pg-large-object.LargeObject) : <code>function</code>
    * [.ReadStream](#module_pg-large-object.ReadStream) : <code>function</code>
    * [.WriteStream](#module_pg-large-object.WriteStream) : <code>function</code>

<a name="module_pg-large-object.LargeObjectManager"></a>

### pg-large-object.LargeObjectManager : <code>function</code>
[pg-large-object/lib/LargeObjectManager](#module_pg-large-object/lib/LargeObjectManager)

**Kind**: static constant of <code>[pg-large-object](#module_pg-large-object)</code>  
<a name="module_pg-large-object.LargeObject"></a>

### pg-large-object.LargeObject : <code>function</code>
[pg-large-object/lib/LargeObject](#module_pg-large-object/lib/LargeObject)

**Kind**: static constant of <code>[pg-large-object](#module_pg-large-object)</code>  
<a name="module_pg-large-object.ReadStream"></a>

### pg-large-object.ReadStream : <code>function</code>
[pg-large-object/lib/ReadStream](#module_pg-large-object/lib/ReadStream)

**Kind**: static constant of <code>[pg-large-object](#module_pg-large-object)</code>  
<a name="module_pg-large-object.WriteStream"></a>

### pg-large-object.WriteStream : <code>function</code>
[pg-large-object/lib/WriteStream](#module_pg-large-object/lib/WriteStream)

**Kind**: static constant of <code>[pg-large-object](#module_pg-large-object)</code>  
<a name="module_pg-large-object/lib/LargeObject"></a>

## pg-large-object/lib/LargeObject
Represents an opened large object.


* [pg-large-object/lib/LargeObject](#module_pg-large-object/lib/LargeObject)
    * _instance_
        * [.close([callback])](#module_pg-large-object/lib/LargeObject+close)
        * [.closeAsync()](#module_pg-large-object/lib/LargeObject+closeAsync) ⇒ <code>Promise</code>
        * [.read(length, callback)](#module_pg-large-object/lib/LargeObject+read)
        * [.readAsync(length)](#module_pg-large-object/lib/LargeObject+readAsync) ⇒ <code>Promise.&lt;Buffer&gt;</code>
        * [.write(buffer, [callback])](#module_pg-large-object/lib/LargeObject+write)
        * [.writeAsync(buffer)](#module_pg-large-object/lib/LargeObject+writeAsync) ⇒ <code>Promise</code>
        * [.seek(position, ref, [callback])](#module_pg-large-object/lib/LargeObject+seek)
        * [.seekAsync(position, ref)](#module_pg-large-object/lib/LargeObject+seekAsync) ⇒ <code>Promise.&lt;number&gt;</code>
        * [.tell(callback)](#module_pg-large-object/lib/LargeObject+tell)
        * [.tellAsync()](#module_pg-large-object/lib/LargeObject+tellAsync) ⇒ <code>Promise.&lt;number&gt;</code>
        * [.size(callback)](#module_pg-large-object/lib/LargeObject+size)
        * [.sizeAsync()](#module_pg-large-object/lib/LargeObject+sizeAsync) ⇒ <code>Promise.&lt;number&gt;</code>
        * [.truncate(length, [callback])](#module_pg-large-object/lib/LargeObject+truncate)
        * [.truncateAsync(length)](#module_pg-large-object/lib/LargeObject+truncateAsync) ⇒ <code>Promise</code>
        * [.getReadableStream([bufferSize])](#module_pg-large-object/lib/LargeObject+getReadableStream) ⇒ <code>[pg-large-object/lib/ReadStream](#module_pg-large-object/lib/ReadStream)</code>
        * [.getWritableStream([bufferSize])](#module_pg-large-object/lib/LargeObject+getWritableStream) ⇒ <code>[pg-large-object/lib/WriteStream](#module_pg-large-object/lib/WriteStream)</code>
    * _static_
        * [.SEEK_SET](#module_pg-large-object/lib/LargeObject.SEEK_SET) : <code>Number</code>
        * [.SEEK_CUR](#module_pg-large-object/lib/LargeObject.SEEK_CUR) : <code>Number</code>
        * [.SEEK_END](#module_pg-large-object/lib/LargeObject.SEEK_END) : <code>Number</code>
    * _inner_
        * [~closeCallback](#module_pg-large-object/lib/LargeObject..closeCallback) : <code>function</code>
        * [~readCallback](#module_pg-large-object/lib/LargeObject..readCallback) : <code>function</code>
        * [~writeCallback](#module_pg-large-object/lib/LargeObject..writeCallback) : <code>function</code>
        * [~seekCallback](#module_pg-large-object/lib/LargeObject..seekCallback) : <code>function</code>
        * [~tellCallback](#module_pg-large-object/lib/LargeObject..tellCallback) : <code>function</code>
        * [~sizeCallback](#module_pg-large-object/lib/LargeObject..sizeCallback) : <code>function</code>
        * [~truncateCallback](#module_pg-large-object/lib/LargeObject..truncateCallback) : <code>function</code>

<a name="module_pg-large-object/lib/LargeObject+close"></a>

### pg-large-object/lib/LargeObject.close([callback])
Closes this large object. 
 You should no longer call any methods on this object.

**Kind**: instance method of <code>[pg-large-object/lib/LargeObject](#module_pg-large-object/lib/LargeObject)</code>  

| Param | Type |
| --- | --- |
| [callback] | <code>[closeCallback](#module_pg-large-object/lib/LargeObject..closeCallback)</code> | 

<a name="module_pg-large-object/lib/LargeObject+closeAsync"></a>

### pg-large-object/lib/LargeObject.closeAsync() ⇒ <code>Promise</code>
Closes this large object.
 You should no longer call any methods on this object.

**Kind**: instance method of <code>[pg-large-object/lib/LargeObject](#module_pg-large-object/lib/LargeObject)</code>  
<a name="module_pg-large-object/lib/LargeObject+read"></a>

### pg-large-object/lib/LargeObject.read(length, callback)
Reads some data from the large object.

**Kind**: instance method of <code>[pg-large-object/lib/LargeObject](#module_pg-large-object/lib/LargeObject)</code>  

| Param | Type | Description |
| --- | --- | --- |
| length | <code>Number</code> | How many bytes to read |
| callback | <code>[readCallback](#module_pg-large-object/lib/LargeObject..readCallback)</code> |  |

<a name="module_pg-large-object/lib/LargeObject+readAsync"></a>

### pg-large-object/lib/LargeObject.readAsync(length) ⇒ <code>Promise.&lt;Buffer&gt;</code>
Reads some data from the large object.

**Kind**: instance method of <code>[pg-large-object/lib/LargeObject](#module_pg-large-object/lib/LargeObject)</code>  
**Returns**: <code>Promise.&lt;Buffer&gt;</code> - The binary data that was read.
         If the length of this buffer is less than the supplied
         length param, there is no more data to be read.  

| Param | Type | Description |
| --- | --- | --- |
| length | <code>Number</code> | How many bytes to read |

<a name="module_pg-large-object/lib/LargeObject+write"></a>

### pg-large-object/lib/LargeObject.write(buffer, [callback])
Writes some data to the large object.

**Kind**: instance method of <code>[pg-large-object/lib/LargeObject](#module_pg-large-object/lib/LargeObject)</code>  

| Param | Type | Description |
| --- | --- | --- |
| buffer | <code>Buffer</code> | data to write |
| [callback] | <code>[writeCallback](#module_pg-large-object/lib/LargeObject..writeCallback)</code> |  |

<a name="module_pg-large-object/lib/LargeObject+writeAsync"></a>

### pg-large-object/lib/LargeObject.writeAsync(buffer) ⇒ <code>Promise</code>
Writes some data to the large object.

**Kind**: instance method of <code>[pg-large-object/lib/LargeObject](#module_pg-large-object/lib/LargeObject)</code>  

| Param | Type | Description |
| --- | --- | --- |
| buffer | <code>Buffer</code> | data to write |

<a name="module_pg-large-object/lib/LargeObject+seek"></a>

### pg-large-object/lib/LargeObject.seek(position, ref, [callback])
Sets the position within the large object.
Beware floating point rounding with values greater than 2^53 (8192 TiB)

**Kind**: instance method of <code>[pg-large-object/lib/LargeObject](#module_pg-large-object/lib/LargeObject)</code>  

| Param | Type | Description |
| --- | --- | --- |
| position | <code>Number</code> |  |
| ref | <code>Number</code> | One of SEEK_SET, SEEK_CUR, SEEK_END |
| [callback] | <code>[seekCallback](#module_pg-large-object/lib/LargeObject..seekCallback)</code> |  |

<a name="module_pg-large-object/lib/LargeObject+seekAsync"></a>

### pg-large-object/lib/LargeObject.seekAsync(position, ref) ⇒ <code>Promise.&lt;number&gt;</code>
Sets the position within the large object.
Beware floating point rounding with values greater than 2^53 (8192 TiB)

**Kind**: instance method of <code>[pg-large-object/lib/LargeObject](#module_pg-large-object/lib/LargeObject)</code>  
**Returns**: <code>Promise.&lt;number&gt;</code> - The new position  

| Param | Type | Description |
| --- | --- | --- |
| position | <code>Number</code> |  |
| ref | <code>Number</code> | One of SEEK_SET, SEEK_CUR, SEEK_END |

<a name="module_pg-large-object/lib/LargeObject+tell"></a>

### pg-large-object/lib/LargeObject.tell(callback)
Retrieves the current position within the large object.
Beware floating point rounding with values greater than 2^53 (8192 TiB)

**Kind**: instance method of <code>[pg-large-object/lib/LargeObject](#module_pg-large-object/lib/LargeObject)</code>  

| Param | Type |
| --- | --- |
| callback | <code>[tellCallback](#module_pg-large-object/lib/LargeObject..tellCallback)</code> | 

<a name="module_pg-large-object/lib/LargeObject+tellAsync"></a>

### pg-large-object/lib/LargeObject.tellAsync() ⇒ <code>Promise.&lt;number&gt;</code>
Retrieves the current position within the large object.
Beware floating point rounding with values greater than 2^53 (8192 TiB)

**Kind**: instance method of <code>[pg-large-object/lib/LargeObject](#module_pg-large-object/lib/LargeObject)</code>  
<a name="module_pg-large-object/lib/LargeObject+size"></a>

### pg-large-object/lib/LargeObject.size(callback)
Find the total size of the large object.

**Kind**: instance method of <code>[pg-large-object/lib/LargeObject](#module_pg-large-object/lib/LargeObject)</code>  

| Param | Type |
| --- | --- |
| callback | <code>[sizeCallback](#module_pg-large-object/lib/LargeObject..sizeCallback)</code> | 

<a name="module_pg-large-object/lib/LargeObject+sizeAsync"></a>

### pg-large-object/lib/LargeObject.sizeAsync() ⇒ <code>Promise.&lt;number&gt;</code>
Find the total size of the large object.

**Kind**: instance method of <code>[pg-large-object/lib/LargeObject](#module_pg-large-object/lib/LargeObject)</code>  
<a name="module_pg-large-object/lib/LargeObject+truncate"></a>

### pg-large-object/lib/LargeObject.truncate(length, [callback])
Truncates the large object to the given length in bytes.
If the number of bytes is larger than the current large
object length, the large object will be filled with zero
bytes.  This method does not modify the current file offset.

**Kind**: instance method of <code>[pg-large-object/lib/LargeObject](#module_pg-large-object/lib/LargeObject)</code>  

| Param | Type |
| --- | --- |
| length | <code>Number</code> | 
| [callback] | <code>[truncateCallback](#module_pg-large-object/lib/LargeObject..truncateCallback)</code> | 

<a name="module_pg-large-object/lib/LargeObject+truncateAsync"></a>

### pg-large-object/lib/LargeObject.truncateAsync(length) ⇒ <code>Promise</code>
Truncates the large object to the given length in bytes.
If the number of bytes is larger than the current large
object length, the large object will be filled with zero
bytes.  This method does not modify the current file offset.

**Kind**: instance method of <code>[pg-large-object/lib/LargeObject](#module_pg-large-object/lib/LargeObject)</code>  

| Param | Type |
| --- | --- |
| length | <code>Number</code> | 

<a name="module_pg-large-object/lib/LargeObject+getReadableStream"></a>

### pg-large-object/lib/LargeObject.getReadableStream([bufferSize]) ⇒ <code>[pg-large-object/lib/ReadStream](#module_pg-large-object/lib/ReadStream)</code>
Return a stream to read this large object.
Call this within a transaction block.

**Kind**: instance method of <code>[pg-large-object/lib/LargeObject](#module_pg-large-object/lib/LargeObject)</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [bufferSize] | <code>Number</code> | <code>16384</code> | A larger buffer size will  require more memory on both the server and client, however it will make  transfers faster because there is less overhead (less read calls to the server).  his overhead is most noticeable on high latency connections because each  ransfered chunk will incur at least RTT of additional transfer time. |

<a name="module_pg-large-object/lib/LargeObject+getWritableStream"></a>

### pg-large-object/lib/LargeObject.getWritableStream([bufferSize]) ⇒ <code>[pg-large-object/lib/WriteStream](#module_pg-large-object/lib/WriteStream)</code>
Return a stream to write to this large object.
Call this within a transaction block.

**Kind**: instance method of <code>[pg-large-object/lib/LargeObject](#module_pg-large-object/lib/LargeObject)</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [bufferSize] | <code>Number</code> | <code>16384</code> | A larger buffer size will  require more memory on both the server and client, however it will make  transfers faster because there is less overhead (less read calls to the server).  his overhead is most noticeable on high latency connections because each  ransfered chunk will incur at least RTT of additional transfer time. |

<a name="module_pg-large-object/lib/LargeObject.SEEK_SET"></a>

### pg-large-object/lib/LargeObject.SEEK_SET : <code>Number</code>
A seek from the beginning of a object

**Kind**: static constant of <code>[pg-large-object/lib/LargeObject](#module_pg-large-object/lib/LargeObject)</code>  
<a name="module_pg-large-object/lib/LargeObject.SEEK_CUR"></a>

### pg-large-object/lib/LargeObject.SEEK_CUR : <code>Number</code>
A seek from the current position

**Kind**: static constant of <code>[pg-large-object/lib/LargeObject](#module_pg-large-object/lib/LargeObject)</code>  
<a name="module_pg-large-object/lib/LargeObject.SEEK_END"></a>

### pg-large-object/lib/LargeObject.SEEK_END : <code>Number</code>
A seek from the end of a object

**Kind**: static constant of <code>[pg-large-object/lib/LargeObject](#module_pg-large-object/lib/LargeObject)</code>  
<a name="module_pg-large-object/lib/LargeObject..closeCallback"></a>

### pg-large-object/lib/LargeObject~closeCallback : <code>function</code>
**Kind**: inner typedef of <code>[pg-large-object/lib/LargeObject](#module_pg-large-object/lib/LargeObject)</code>  

| Param | Type | Description |
| --- | --- | --- |
| error | <code>Error</code> | If set, an error occurred. |

<a name="module_pg-large-object/lib/LargeObject..readCallback"></a>

### pg-large-object/lib/LargeObject~readCallback : <code>function</code>
**Kind**: inner typedef of <code>[pg-large-object/lib/LargeObject](#module_pg-large-object/lib/LargeObject)</code>  

| Param | Type | Description |
| --- | --- | --- |
| error | <code>Error</code> | If set, an error occurred. |
| data | <code>Buffer</code> | The binary data that was read.        If the length of this buffer is less than the supplied        length param, there is no more data to be read. |

<a name="module_pg-large-object/lib/LargeObject..writeCallback"></a>

### pg-large-object/lib/LargeObject~writeCallback : <code>function</code>
**Kind**: inner typedef of <code>[pg-large-object/lib/LargeObject](#module_pg-large-object/lib/LargeObject)</code>  

| Param | Type | Description |
| --- | --- | --- |
| error | <code>Error</code> | If set, an error occurred. |

<a name="module_pg-large-object/lib/LargeObject..seekCallback"></a>

### pg-large-object/lib/LargeObject~seekCallback : <code>function</code>
**Kind**: inner typedef of <code>[pg-large-object/lib/LargeObject](#module_pg-large-object/lib/LargeObject)</code>  

| Param | Type | Description |
| --- | --- | --- |
| error | <code>Error</code> | If set, an error occurred. |
| position | <code>Number</code> | The new position |

<a name="module_pg-large-object/lib/LargeObject..tellCallback"></a>

### pg-large-object/lib/LargeObject~tellCallback : <code>function</code>
**Kind**: inner typedef of <code>[pg-large-object/lib/LargeObject](#module_pg-large-object/lib/LargeObject)</code>  

| Param | Type | Description |
| --- | --- | --- |
| error | <code>Error</code> | If set, an error occurred. |
| position | <code>Number</code> | The position |

<a name="module_pg-large-object/lib/LargeObject..sizeCallback"></a>

### pg-large-object/lib/LargeObject~sizeCallback : <code>function</code>
**Kind**: inner typedef of <code>[pg-large-object/lib/LargeObject](#module_pg-large-object/lib/LargeObject)</code>  

| Param | Type | Description |
| --- | --- | --- |
| error | <code>Error</code> | If set, an error occurred. |
| size | <code>Number</code> | Object size in bytes |

<a name="module_pg-large-object/lib/LargeObject..truncateCallback"></a>

### pg-large-object/lib/LargeObject~truncateCallback : <code>function</code>
**Kind**: inner typedef of <code>[pg-large-object/lib/LargeObject](#module_pg-large-object/lib/LargeObject)</code>  

| Param | Type | Description |
| --- | --- | --- |
| error | <code>Error</code> | If set, an error occurred. |

<a name="module_pg-large-object/lib/LargeObjectManager"></a>

## pg-large-object/lib/LargeObjectManager
This class lets you use the Large Object functionality of PostgreSQL.
All usage of Large Object should take place within a transaction block!
(BEGIN ... COMMIT)


| Param | Type |
| --- | --- |
| client | <code>pg/Client</code> | 

**Example**  
```js
new LargeObjectManager(client)
```

* [pg-large-object/lib/LargeObjectManager](#module_pg-large-object/lib/LargeObjectManager)
    * _instance_
        * [.open(oid, mode, callback)](#module_pg-large-object/lib/LargeObjectManager+open)
        * [.openAsync(oid, mode)](#module_pg-large-object/lib/LargeObjectManager+openAsync) ⇒ <code>[Promise.&lt;pg-large-object/lib/LargeObject&gt;](#module_pg-large-object/lib/LargeObject)</code>
        * [.create(callback)](#module_pg-large-object/lib/LargeObjectManager+create)
        * [.createAsync()](#module_pg-large-object/lib/LargeObjectManager+createAsync) ⇒ <code>Promise.&lt;number&gt;</code>
        * [.unlink(oid, [callback])](#module_pg-large-object/lib/LargeObjectManager+unlink)
        * [.unlinkAsync(oid)](#module_pg-large-object/lib/LargeObjectManager+unlinkAsync) ⇒ <code>Promise</code>
        * [.openAndReadableStream(oid, [bufferSize], callback)](#module_pg-large-object/lib/LargeObjectManager+openAndReadableStream)
        * [.openAndReadableStreamAsync(oid, [bufferSize])](#module_pg-large-object/lib/LargeObjectManager+openAndReadableStreamAsync) ⇒ <code>Promise.&lt;Array&gt;</code>
        * [.createAndWritableStream([bufferSize], [callback])](#module_pg-large-object/lib/LargeObjectManager+createAndWritableStream)
        * [.createAndWritableStreamAsync([bufferSize])](#module_pg-large-object/lib/LargeObjectManager+createAndWritableStreamAsync) ⇒ <code>promise.&lt;Array&gt;</code>
    * _static_
        * [.WRITE](#module_pg-large-object/lib/LargeObjectManager.WRITE) : <code>Number</code>
        * [.READ](#module_pg-large-object/lib/LargeObjectManager.READ) : <code>Number</code>
        * [.READWRITE](#module_pg-large-object/lib/LargeObjectManager.READWRITE) : <code>Number</code>
    * _inner_
        * [~openCallback](#module_pg-large-object/lib/LargeObjectManager..openCallback) : <code>function</code>
        * [~createCallback](#module_pg-large-object/lib/LargeObjectManager..createCallback) : <code>function</code>
        * [~unlinkCallback](#module_pg-large-object/lib/LargeObjectManager..unlinkCallback) : <code>function</code>
        * [~openAndReadableStreamCallback](#module_pg-large-object/lib/LargeObjectManager..openAndReadableStreamCallback) : <code>function</code>
        * [~createAndWritableStreamCallback](#module_pg-large-object/lib/LargeObjectManager..createAndWritableStreamCallback) : <code>function</code>

<a name="module_pg-large-object/lib/LargeObjectManager+open"></a>

### pg-large-object/lib/LargeObjectManager.open(oid, mode, callback)
Open an existing large object, based on its OID.
In mode READ, the data read from it will reflect the 
contents of the large object at the time of the transaction 
snapshot that was active when open was executed, 
regardless of later writes by this or other transactions.
If opened using WRITE (or READWRITE), data read will reflect 
all writes of other committed transactions as well as 
writes of the current transaction.

**Kind**: instance method of <code>[pg-large-object/lib/LargeObjectManager](#module_pg-large-object/lib/LargeObjectManager)</code>  

| Param | Type | Description |
| --- | --- | --- |
| oid | <code>Number</code> |  |
| mode | <code>Number</code> | One of WRITE, READ, or READWRITE |
| callback | <code>[openCallback](#module_pg-large-object/lib/LargeObjectManager..openCallback)</code> |  |

<a name="module_pg-large-object/lib/LargeObjectManager+openAsync"></a>

### pg-large-object/lib/LargeObjectManager.openAsync(oid, mode) ⇒ <code>[Promise.&lt;pg-large-object/lib/LargeObject&gt;](#module_pg-large-object/lib/LargeObject)</code>
Open an existing large object, based on its OID.
In mode READ, the data read from it will reflect the
contents of the large object at the time of the transaction
snapshot that was active when open was executed,
regardless of later writes by this or other transactions.
If opened using WRITE (or READWRITE), data read will reflect
all writes of other committed transactions as well as
writes of the current transaction.

**Kind**: instance method of <code>[pg-large-object/lib/LargeObjectManager](#module_pg-large-object/lib/LargeObjectManager)</code>  

| Param | Type | Description |
| --- | --- | --- |
| oid | <code>Number</code> |  |
| mode | <code>Number</code> | One of WRITE, READ, or READWRITE |

<a name="module_pg-large-object/lib/LargeObjectManager+create"></a>

### pg-large-object/lib/LargeObjectManager.create(callback)
Creates a large object, returning its OID. 
After which you can open() it.

**Kind**: instance method of <code>[pg-large-object/lib/LargeObjectManager](#module_pg-large-object/lib/LargeObjectManager)</code>  

| Param | Type |
| --- | --- |
| callback | <code>[createCallback](#module_pg-large-object/lib/LargeObjectManager..createCallback)</code> | 

<a name="module_pg-large-object/lib/LargeObjectManager+createAsync"></a>

### pg-large-object/lib/LargeObjectManager.createAsync() ⇒ <code>Promise.&lt;number&gt;</code>
Creates a large object, returning its OID.
After which you can open() it.

**Kind**: instance method of <code>[pg-large-object/lib/LargeObjectManager](#module_pg-large-object/lib/LargeObjectManager)</code>  
**Returns**: <code>Promise.&lt;number&gt;</code> - oid  
<a name="module_pg-large-object/lib/LargeObjectManager+unlink"></a>

### pg-large-object/lib/LargeObjectManager.unlink(oid, [callback])
Unlinks (deletes) a large object

**Kind**: instance method of <code>[pg-large-object/lib/LargeObjectManager](#module_pg-large-object/lib/LargeObjectManager)</code>  

| Param | Type |
| --- | --- |
| oid | <code>number</code> | 
| [callback] | <code>[unlinkCallback](#module_pg-large-object/lib/LargeObjectManager..unlinkCallback)</code> | 

<a name="module_pg-large-object/lib/LargeObjectManager+unlinkAsync"></a>

### pg-large-object/lib/LargeObjectManager.unlinkAsync(oid) ⇒ <code>Promise</code>
Unlinks (deletes) a large object

**Kind**: instance method of <code>[pg-large-object/lib/LargeObjectManager](#module_pg-large-object/lib/LargeObjectManager)</code>  

| Param | Type |
| --- | --- |
| oid | <code>number</code> | 

<a name="module_pg-large-object/lib/LargeObjectManager+openAndReadableStream"></a>

### pg-large-object/lib/LargeObjectManager.openAndReadableStream(oid, [bufferSize], callback)
Open a large object, return a stream and close the object when done streaming.
Only call this within a transaction block.

**Kind**: instance method of <code>[pg-large-object/lib/LargeObjectManager](#module_pg-large-object/lib/LargeObjectManager)</code>  

| Param | Type | Default |
| --- | --- | --- |
| oid | <code>Number</code> |  | 
| [bufferSize] | <code>Number</code> | <code>16384</code> | 
| callback | <code>[openAndReadableStreamCallback](#module_pg-large-object/lib/LargeObjectManager..openAndReadableStreamCallback)</code> |  | 

<a name="module_pg-large-object/lib/LargeObjectManager+openAndReadableStreamAsync"></a>

### pg-large-object/lib/LargeObjectManager.openAndReadableStreamAsync(oid, [bufferSize]) ⇒ <code>Promise.&lt;Array&gt;</code>
Open a large object, return a stream and close the object when done streaming.
Only call this within a transaction block.

**Kind**: instance method of <code>[pg-large-object/lib/LargeObjectManager](#module_pg-large-object/lib/LargeObjectManager)</code>  
**Returns**: <code>Promise.&lt;Array&gt;</code> - The total size and a ReadStream  

| Param | Type | Default |
| --- | --- | --- |
| oid | <code>Number</code> |  | 
| [bufferSize] | <code>Number</code> | <code>16384</code> | 

<a name="module_pg-large-object/lib/LargeObjectManager+createAndWritableStream"></a>

### pg-large-object/lib/LargeObjectManager.createAndWritableStream([bufferSize], [callback])
Create and open a large object, return a stream and close the object when done streaming.
Only call this within a transaction block.

**Kind**: instance method of <code>[pg-large-object/lib/LargeObjectManager](#module_pg-large-object/lib/LargeObjectManager)</code>  

| Param | Type | Default |
| --- | --- | --- |
| [bufferSize] | <code>Number</code> | <code>16384</code> | 
| [callback] | <code>[createAndWritableStreamCallback](#module_pg-large-object/lib/LargeObjectManager..createAndWritableStreamCallback)</code> |  | 

<a name="module_pg-large-object/lib/LargeObjectManager+createAndWritableStreamAsync"></a>

### pg-large-object/lib/LargeObjectManager.createAndWritableStreamAsync([bufferSize]) ⇒ <code>promise.&lt;Array&gt;</code>
Create and open a large object, return a stream and close the object when done streaming.
Only call this within a transaction block.

**Kind**: instance method of <code>[pg-large-object/lib/LargeObjectManager](#module_pg-large-object/lib/LargeObjectManager)</code>  
**Returns**: <code>promise.&lt;Array&gt;</code> - The oid and a WriteStream  

| Param | Type | Default |
| --- | --- | --- |
| [bufferSize] | <code>Number</code> | <code>16384</code> | 

<a name="module_pg-large-object/lib/LargeObjectManager.WRITE"></a>

### pg-large-object/lib/LargeObjectManager.WRITE : <code>Number</code>
**Kind**: static constant of <code>[pg-large-object/lib/LargeObjectManager](#module_pg-large-object/lib/LargeObjectManager)</code>  
<a name="module_pg-large-object/lib/LargeObjectManager.READ"></a>

### pg-large-object/lib/LargeObjectManager.READ : <code>Number</code>
**Kind**: static constant of <code>[pg-large-object/lib/LargeObjectManager](#module_pg-large-object/lib/LargeObjectManager)</code>  
<a name="module_pg-large-object/lib/LargeObjectManager.READWRITE"></a>

### pg-large-object/lib/LargeObjectManager.READWRITE : <code>Number</code>
**Kind**: static constant of <code>[pg-large-object/lib/LargeObjectManager](#module_pg-large-object/lib/LargeObjectManager)</code>  
<a name="module_pg-large-object/lib/LargeObjectManager..openCallback"></a>

### pg-large-object/lib/LargeObjectManager~openCallback : <code>function</code>
**Kind**: inner typedef of <code>[pg-large-object/lib/LargeObjectManager](#module_pg-large-object/lib/LargeObjectManager)</code>  

| Param | Type | Description |
| --- | --- | --- |
| error | <code>Error</code> | If set, an error occurred. |
| result | <code>[pg-large-object/lib/LargeObject](#module_pg-large-object/lib/LargeObject)</code> |  |

<a name="module_pg-large-object/lib/LargeObjectManager..createCallback"></a>

### pg-large-object/lib/LargeObjectManager~createCallback : <code>function</code>
**Kind**: inner typedef of <code>[pg-large-object/lib/LargeObjectManager](#module_pg-large-object/lib/LargeObjectManager)</code>  

| Param | Type | Description |
| --- | --- | --- |
| error | <code>Error</code> | If set, an error occurred. |
| oid | <code>Number</code> |  |

<a name="module_pg-large-object/lib/LargeObjectManager..unlinkCallback"></a>

### pg-large-object/lib/LargeObjectManager~unlinkCallback : <code>function</code>
**Kind**: inner typedef of <code>[pg-large-object/lib/LargeObjectManager](#module_pg-large-object/lib/LargeObjectManager)</code>  

| Param | Type | Description |
| --- | --- | --- |
| error | <code>Error</code> | If set, an error occurred. |

<a name="module_pg-large-object/lib/LargeObjectManager..openAndReadableStreamCallback"></a>

### pg-large-object/lib/LargeObjectManager~openAndReadableStreamCallback : <code>function</code>
**Kind**: inner typedef of <code>[pg-large-object/lib/LargeObjectManager](#module_pg-large-object/lib/LargeObjectManager)</code>  

| Param | Type | Description |
| --- | --- | --- |
| error | <code>Error</code> | If set, an error occurred. |
| size | <code>Number</code> | The total size of the large object |
| stream | <code>[pg-large-object/lib/ReadStream](#module_pg-large-object/lib/ReadStream)</code> |  |

<a name="module_pg-large-object/lib/LargeObjectManager..createAndWritableStreamCallback"></a>

### pg-large-object/lib/LargeObjectManager~createAndWritableStreamCallback : <code>function</code>
**Kind**: inner typedef of <code>[pg-large-object/lib/LargeObjectManager](#module_pg-large-object/lib/LargeObjectManager)</code>  

| Param | Type | Description |
| --- | --- | --- |
| error | <code>Error</code> | If set, an error occurred. |
| oid | <code>Number</code> |  |
| stream | <code>[pg-large-object/lib/WriteStream](#module_pg-large-object/lib/WriteStream)</code> |  |

<a name="module_pg-large-object/lib/promiseFromCallback"></a>

## pg-large-object/lib/promiseFromCallback ⇒ <code>Promise</code>

| Param | Type |
| --- | --- |
| fn | <code>function</code> | 
| self | <code>object</code> | 
| [options] | <code>object</code> | 

<a name="module_pg-large-object/lib/ReadStream"></a>

## pg-large-object/lib/ReadStream ⇐ <code>stream.Readable</code>
**Extends:** <code>stream.Readable</code>  
<a name="module_pg-large-object/lib/WriteStream"></a>

## pg-large-object/lib/WriteStream ⇐ <code>stream.Writable</code>
**Extends:** <code>stream.Writable</code>  
