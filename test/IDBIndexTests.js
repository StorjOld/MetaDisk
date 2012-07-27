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

var IDBIndexTests = new (function () {
  // Run
  this.run = function () {
    module("IDBIndex");
    _test("openKeyCursor", testOpenKeyCursor);
    _test("openCursor", testOpenCursor);
    _test("Unique index constraint error", testUniqueIndexConstraintError);
    _test("MultiEntry enabled", testArrayKeyPath);
  };

  // Environment
  var env =
  {
    dbname : "TestDatabase",
    dbversion : 10,
    people : {
      name : "PeopleObjectStore",
      records : [
        { value : { name : 'n2', id : 20, email : "e1" }, key : 5},
        { value : { name : 'n1', id : 10, email : "e5" }, key : 1},
        { value : { name : 'n4', id : 40, email : "e2" }, key : 4},
        { value : { name : 'n2', id : 50, email : "e4" }, key : 2},
        { value : { name : 'n3', id : 30, email : "e3" }, key : 3},
        { value : { name : ['n6', 'n5', 'n6'], id : 60, email : "e6" }, key : 6}
      ]
    },
    nameIndex : "name",
    multiNameIndex : "name2",
    uniqueEmailIndex : "email"
  };

  // Tests
  function testOpenKeyCursor(db) {
    expect(6);
    var people = db.transaction([env.people.name]).objectStore(env.people.name);
    var request = people.index(env.nameIndex).openKeyCursor(IDBKeyRange.upperBound("n3", true), IDBCursor.PREV);
    request.onerror = util.shouldNotReachHereCallback;
    var i = -1, ii = [0, 3, 1];
    request.onsuccess = function (e) {
      var cursor = e.target.result;
      if (cursor == null) {
        db.close();
        start();
        return;
      }
      var rec = env.people.records[ii[++i]];
      deepEqual(cursor.key, rec.value.name, "Keys should match");
      deepEqual(cursor.primaryKey, rec.key, "Values should match");
      cursor.continue();
    }
  }

  function testOpenCursor(db) {
    expect(6);
    var tx = db.transaction([env.people.name]);
    tx.error = util.shouldNotReachHereCallback;
    tx.oncomplete = function (e) {
      db.close();
      start();
    };
    var people = tx.objectStore(env.people.name);
    var range = IDBKeyRange.bound("n1", "n4", true);
    var request = people.index(env.nameIndex).openCursor(range, IDBCursor.NEXT_NO_DUPLICATE);
    request.onerror = util.shouldNotReachHereCallback;
    var i = -1, ii = [3, 4, 2];
    request.onsuccess = function (e) {
      var cursor = e.target.result;
      if (!cursor) return;

      var rec = env.people.records[ii[++i]];
      deepEqual(cursor.key, rec.value.name, "Keys should match");
      deepEqual(cursor.value, rec.value, "Values should match");
      cursor.continue();
    }
  }

  function testArrayKeyPath(db) {
    expect(4);
    var tx = db.transaction([env.people.name]);
    tx.onerror = util.shouldNotReachHereCallback;
    tx.oncomplete = function (e) {
      db.close();
      start();
    };

    var ix = tx.objectStore(env.people.name).index(env.multiNameIndex);
    var request = ix.openCursor(IDBKeyRange.bound("n5", "n6"));
    request.onerror = util.shouldNotReachHereCallback;
    var rec = env.people.records[5].value;
    var names = ["n5", "n6"];
    var i = -1;
    request.onsuccess = function (e) {
      var cursor = e.target.result;
      if (!cursor) return;

      deepEqual(cursor.key, names[++i], "Keys should match");
      deepEqual(cursor.value, rec, "Values should match");
      cursor.continue();
    }
  }

  function testUniqueIndexConstraintError(db) {
    expect(1);
    db.close();
    var request = indexedDB.open(env.dbname, env.dbversion + 1);
    request.onupgradeneeded = function (e) {
      var db = e.target.result;
      var tx = e.target.transaction;
      tx.objectStore(env.people.name).createIndex("name2", "name", { unique : true });
    };
    request.onerror = function (e) {
      ok(true, "It should fail index creating with unique = true");
      start();
    }
  }

  // Utils
  function _test(name, fn) {
    QUnit.asyncTest(name, function () {
      var promise = util.initDBPromise(env.dbname, env.dbversion, function (db) {
        var rec;
        var people = db.createObjectStore(env.people.name);
        for (var i = 0; i < env.people.records.length; i++) {
          rec = env.people.records[i];
          people.add(rec.value, rec.key);
        }
        people.createIndex(env.nameIndex, "name");
        people.createIndex(env.multiNameIndex, "name", { multiEntry : true });
        //people.createIndex(env.uniqueEmailIndex, "email", { unique : true, multiEntry : true });
      });
      promise.fail(function (e) {
        ok(false, "Testing environment initialization failure.");
        console.warn(e);
        start();
      });
      promise.done(function (e) {
        var request = indexedDB.open(env.dbname);
        request.onerror = request.onblocked = util.shouldNotReachHereCallback;
        request.onsuccess = function (e) {
          var db = e.target.result;
          try { fn(db); }
          catch (ex) {
            db && db.close && db.close();
            console.warn(ex);
            ok(false, "Exception thrown. " + ex);
            start();
          }
        }
      });
    });
  }
});
