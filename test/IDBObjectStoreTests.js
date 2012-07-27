/*
 Copyright 2012 Facebook Inc.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

var IDBObjectStoreTests = new (function () {
  // Run
  this.run = function () {
    module("IDBObjectStore.add");
    _test("Simple add and delete data", testSimpleAddGetDelete);
    _test("ReadOnly Transaction error", testAddReadOnlyTransactionError);
    _test("DataError adding", testAddDataError);
    _test("Out-of-line key provided as a separate parameter", testOutOfLineKey);
    _test("In-line string key provided within a value", testInlineStringKey);
    _test("In-line array key provided within a value", testInlineArrayKey);
    _test("Out-of-line key with key generator", testOutOfLineKeyWithKeyGenerator);
    _test("In-line key with key generator", testInlineKeyWithKeyGenerator);
  };

  // Environment
  var env =
  {
    dbname : "TestDatabase",
    dbversion : 10,
    // exists
    people : "People",
    cars : "Cars",
    specs : "Specifications",
    models : "Models",
    stores : "CarStores"
  };

  // Tests
  function testSimpleAddGetDelete(db) {
    expect(3);

    var tx = db.transaction([env.people], IDBTransaction.READ_WRITE);
    var people = tx.objectStore(env.people);
    people.add({ name : "Name1", age : 21}, "key1");
    people.add({ name : "Name2", age : 14}, [10, 11]);

    var tx2 = db.transaction([env.people], IDBTransaction.READ_ONLY);
    var people2 = tx2.objectStore(env.people);
    var request = people2.get("key1");
    request.onsuccess = function (e) {
      equal(e.target.result.name, "Name1", "Data");
      equal(e.target.result.age, 21);
    };

    var tx3 = db.transaction([env.people], IDBTransaction.READ_WRITE);
    var people3 = tx3.objectStore(env.people);
    people3.delete("key1");

    var tx4 = db.transaction([env.people], IDBTransaction.READ_ONLY);
    var people4 = tx4.objectStore(env.people);
    var request4 = people4.get("key1");
    request4.onsuccess = function (e) {
      equal(request4.result, null, "Record with key1 should have been deleted.");
    };

    tx4.oncomplete = tx4.onerror = function (e) {
      db.close();
      start();
    };
  }

  function testAddReadOnlyTransactionError(db) {
    expect();
    var tx = db.transaction([env.people], IDBTransaction.READ_ONLY);
    var people = tx.objectStore(env.people);
    try {
      people.add({ name : "Name2", age : 25}, "key1");
    }
    catch (ex) {
      ok(["ReadOnlyError", "READ_ONLY_ERR", "NS_ERROR_DOM_INDEXEDDB_READ_ONLY_ERR"].indexOf(ex.name) >= 0,
        "Read only error should be thrown");
    }
    tx.oncomplete = function (e) {
      db.close();
      start();
    };
  }

  function testAddDataError(db) {
    expect(7);
    var dataErrors = ["DataError", "NS_ERROR_DOM_INDEXEDDB_DATA_ERR", "DATA_ERR"];

    var tx = db.transaction([env.people, env.cars, env.specs], IDBTransaction.READ_WRITE);
    var people = tx.objectStore(env.people);
    var cars = tx.objectStore(env.cars);
    var specs = tx.objectStore(env.specs);

    try { cars.add({ number : "1", attr : "bla"}, "explicit_key"); }
    catch (ex) {
      ok(dataErrors.contains(ex.name), "DataError expected. " +
        "The object store uses in-line keys and the key parameter was provided.");
    }

    try { people.add({ name : "James", attr : "Bond", key : "007"}); }
    catch (ex) {
      ok(dataErrors.contains(ex.name), "DataError expected. " +
        "Out-of-line keys and no key generator and the key parameter was not provided.");
    }

    try {
      cars.add({ number : [3, [
        [],
        2
      ], { }], attr : "bla", key : "2"});
    }
    catch (ex) {
      ok(dataErrors.contains(ex.name), "DataError expected. " +
        "In-line keys and the result of evaluating the object store's key path yields a value " +
        "and that value is not a valid key.");
    }

    try { cars.add({ number : [3, [true, 4], '{}'], attr : "bla", key : "2"}); }
    catch (ex) {
      ok(dataErrors.contains(ex.name), "DataError expected. " +
        "In-line keys and the result of evaluating the object store's key path yields a value " +
        "and that value is not a valid key (array contains boolean).");
    }

    try { cars.add({ number : null, attr : "bla", key : "3"}); }
    catch (ex) {
      ok(dataErrors.contains(ex.name), "DataError expected. " +
        "In-line keys but no key generator and the result of evaluating the object store's " +
        "key path does not yield a value");
    }

    try { specs.add({ id : [2, [4, 'bla', []], ''], foo : { bar : false }}); }
    catch (ex) {
      ok(dataErrors.contains(ex.name), "DataError expected. " +
        "In-line array keys and the result of evaluating the object store's " +
        "key path does not yield a valid value");
    }

    try { people.add({ name : "James", attr : "Bond", key : "007"}, { invalidKey : "007" }); }
    catch (ex) {
      ok(dataErrors.contains(ex.name), "DataError expected. " +
        "The key parameter was provided but does not contain a valid key");
    }

    tx.oncomplete = function (e) {
      db.close();
      start();
    }
  }

  function testOutOfLineKey(db) {
    expect(4);
    var tx = db.transaction([env.people], IDBTransaction.READ_WRITE);
    var records = addRecords(tx.objectStore(env.people),
      [
        { key : 10, value : { name : "Adam", age : 31 } },
        { key : 14, value : { name : "Joel", age : 29 } }
      ]);

    tx.oncomplete = function (e) {
      var i = -1;
      var tx2 = db.transaction([env.people]).objectStore(env.people).openCursor().onsuccess = function (e) {
        var cursor = e.target.result;
        if (!cursor) {
          db.close();
          start();
          return;
        }
        equal(cursor.key, records[++i].key, "Keys should match");
        deepEqual(cursor.value, records[i].value, "Values should match");
        cursor.continue();
      }
    }
  }

  function testInlineStringKey(db) {
    expect(2);
    var tx = db.transaction([env.cars], IDBTransaction.READ_WRITE);
    var record = { name : "Peugeot", number : "FR4253" };
    tx.objectStore(env.cars).add(record);

    tx.oncomplete = function (e) {
      var tx2 = db.transaction([env.cars]).objectStore(env.cars).openCursor().onsuccess = function (e) {
        var cursor = e.target.result;
        if (!cursor) {
          db.close();
          start();
          return;
        }
        equal(cursor.key, record.number, "Keys should match");
        deepEqual(cursor.value, record, "Values should match");
        cursor.continue();
      }
    }
  }

  function testInlineArrayKey(db) {
    expect(2);
    var tx = db.transaction([env.specs], IDBTransaction.READ_WRITE);
    var record = { year : 1998, id : [2, ['#@$', [
      [],
      '{ }'
    ]], (new Date()).getDate()], foo : { bar : "abc", baz : 0 } };
    tx.objectStore(env.specs).add(record);

    tx.oncomplete = function (e) {
      var tx2 = db.transaction([env.specs]).objectStore(env.specs).openCursor().onsuccess = function (e) {
        var cursor = e.target.result;
        if (!cursor) {
          db.close();
          start();
          return;
        }
        deepEqual(cursor.key, [record.id, record.foo.bar], "Keys should match");
        deepEqual(cursor.value, record, "Values should match");
        cursor.continue();
      }
    }
  }

  function testOutOfLineKeyWithKeyGenerator(db) {
    expect(4);
    var tx = db.transaction([env.stores], IDBTransaction.READ_WRITE);
    var records = [
      { key : 8.3, value : { name : "Car store 1" } },
      { key : 9, value : { name : "Car store 2" } }
    ];
    var stores = tx.objectStore(env.stores);
    stores.add(records[0].value, records[0].key);
    stores.add(records[1].value);

    tx.oncomplete = function (e) {
      var i = -1;
      var tx2 = db.transaction([env.stores]).objectStore(env.stores).openCursor().onsuccess = function (e) {
        var cursor = e.target.result;
        if (!cursor) {
          db.close();
          start();
          return;
        }
        deepEqual(cursor.key, records[++i].key, "Keys should match");
        deepEqual(cursor.value, records[i].value, "Values should match");
        cursor.continue();
      }
    }
  }

  function testInlineKeyWithKeyGenerator(db) {
    expect(6);
    var tx = db.transaction([env.models], IDBTransaction.READ_WRITE);
    var records = [
      { value : { name : "Honda"}, expectedKey : 1,
        expectedValue : { name : "Honda", foo : { bar : { id : 1} } } },

      { value : { name : "Nissan", foo : { bar : { id : 5.7 } } }, expectedKey : 5.7,
        expectedValue : { name : "Nissan", foo : { bar : { id : 5.7 } } } },
      { value : { name : "Renault" }, expectedKey : 6,
        expectedValue : { name : "Renault", foo : { bar : { id : 6 } } } }
    ];

    var models = tx.objectStore(env.models);
    models.add(records[0].value);
    models.add(records[1].value);
    models.add(records[2].value);

    tx.oncomplete = function (e) {
      var i = -1;
      var tx2 = db.transaction([env.models]).objectStore(env.models).openCursor().onsuccess = function (e) {
        var cursor = e.target.result;
        if (!cursor) {
          db.close();
          start();
          return;
        }
        deepEqual(cursor.key, records[++i].expectedKey, "Keys ({0}) should match".
          format(records[i].expectedKey));
        deepEqual(cursor.value, records[i].expectedValue, "Values should match");
        cursor.continue();
      }
    }
  }

  // Utils
  function _test(name, fn) {
    QUnit.asyncTest(name, function () {
      var promise = util.initDBPromise(env.dbname, env.dbversion, function (db) {
        db.createObjectStore(env.people);
        db.createObjectStore(env.cars, { keyPath : "number" });
        db.createObjectStore(env.specs, { keyPath : ["id", "foo.bar"] });
        db.createObjectStore(env.models, { keyPath : "foo.bar.id", autoIncrement : true });
        db.createObjectStore(env.stores, { autoIncrement : true });
      });
      promise.fail(function (e) {
        ok(false, "Testing environment initialization failure.");
        console.warn(e);
        start();
      });
      promise.done(function (e) {
        var request = indexedDB.open(env.dbname);
        request.onsuccess = function (e) {
          try {
            var db = request.result;
            fn(db);
          }
          catch (ex) {
            db && db.close && db.close();
            console.warn(ex);
            ok(false, "Exception thrown. " + ex);
            start();
          }
        };
      });
    });
  }

  function addRecords(store, records) {
    for (var i = 0; i < records.length; i++) {
      store.add(records[i].value, records[i].key);
    }
    return records;
  }
});
