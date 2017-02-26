node-pg-large-object
====================
Large object support for PostgreSQL clients using the [node-postgres](https://www.npmjs.org/package/pg) library.

The API of this library resembles the JDBC library for PostgreSQL.

Installation
------------

```
npm install --save pg-large-object
```

You will also need to install either the [pg](https://www.npmjs.org/package/pg) library, or the [pg-promise](https://www.npmjs.org/pg-promise) library:

```
npm install --save pg
# or
npm install --save pg-promise
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
The easiest way to use this library is in combination with promises and [pg-promise](https://www.npmjs.org/pg-promise). This
library exposes a callback style interface (for backwards compatibility) and a promise style
interface (see [API Documentation](#api-documentation)). All functions that end with "Async" will return a promise

### Reading a large object using a stream and pg-promise:
```javascript
const pgp = require('pg-promise')();
const {LargeObjectManager} = require('pg-large-object');
const {createWriteStream} = require('fs');

const db = pgp('postgres://postgres:1234@localhost/postgres');

// When working with Large Objects, always use a transaction
db.tx(tx => {
  const man = new LargeObjectManager({pgPromise: tx});

  // A LargeObject oid, probably stored somewhere in one of your own tables.
  const oid = 123;

  // If you are on a high latency connection and working with
  // large LargeObjects, you should increase the buffer size.
  // The buffer should be divisible by 2048 for best performance
  // (2048 is the default page size in PostgreSQL, see LOBLKSIZE)
  const bufferSize = 16384;

  return man.openAndReadableStreamAsync(oid, bufferSize)
  .then(([size, stream]) => {
    console.log('Streaming a large object with a total size of', size);

    // Store it as an image
    const fileStream = createWriteStream('my-file.png');
    stream.pipe(fileStream);

    return new Promise((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });
  });
})
.then(() => {
  console.log('Done!');
})
.catch(error => {
  console.log('Something went horribly wrong!', error);
});
```

### Creating a new large object using a stream and pg-promise:

```javascript
const pgp = require('pg-promise')();
const {LargeObjectManager} = require('pg-large-object');
const {createReadStream} = require('fs');

const db = pgp('postgres://postgres:1234@localhost/postgres');

// When working with Large Objects, always use a transaction
db.tx(tx => {
  const man = new LargeObjectManager({pgPromise: tx});

  // If you are on a high latency connection and working with
  // large LargeObjects, you should increase the buffer size.
  // The buffer should be divisible by 2048 for best performance
  // (2048 is the default page size in PostgreSQL, see LOBLKSIZE)
  const bufferSize = 16384;

  return man.createAndWritableStreamAsync(bufferSize)
  .then(([oid, stream]) => {
    // The server has generated an oid
    console.log('Creating a large object with the oid', oid);

    const fileStream = createReadStream('upload-my-file.png');
    fileStream.pipe(stream);

    return new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  });
})
.then(() => {
  console.log('Done!');
})
.catch(error => {
  console.log('Something went horribly wrong!', error);
});
```


### Reading a large object using a stream and callbacks:

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

  var man = new LargeObjectManager({pg: client});

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
    // large LargeObjects, you should increase the buffer size.
    // The buffer should be divisible by 2048 for best performance
    // (2048 is the default page size in PostgreSQL, see LOBLKSIZE)
    var bufferSize = 16384;
    man.openAndReadableStream(oid, bufferSize, function(err, size, stream)
    {
      if (err)
      {
        done(err);
        return console.error('Unable to read the given large object', err);
      }

      console.log('Streaming a large object with a total size of', size);
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


### Creating a new large object using a stream:

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

  var man = new LargeObjectManager({pg: client});

  // When working with Large Objects, always use a transaction
  client.query('BEGIN', function(err, result)
  {
    if (err)
    {
      done(err);
      return client.emit('error', err);
    }

    // If you are on a high latency connection and working with
    // large LargeObjects, you should increase the buffer size.
    // The buffer should be divisible by 2048 for best performance
    // (2048 is the default page size in PostgreSQL, see LOBLKSIZE)
    var bufferSize = 16384;
    man.createAndWritableStream(bufferSize, function(err, oid, stream)
    {
      if (err)
      {
        done(err);
        return console.error('Unable to create a new large object', err);
      }

      // The server has generated an oid
      console.log('Creating a large object with the oid', oid);
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

### Using low level LargeObject functions:

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

  var man = new LargeObjectManager({pg: client});

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
