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

var IDBObjectStoreIndexTests = new (function () {
  // Run
  this.run = function () {
    module("IDBObjectStore.createIndex, deleteIndex & index");
    _test("IndexNames list", testIndexNames);
    _test("Create/Delete index validation", testValidateCreateIndex);
  };

  // Environment
  var env =
  {
    dbname : "TestDatabase",
    dbversion : 10,
    // exists
    people : "People",
    nameIndex : "name"
  };

  // Tests
  function testIndexNames(request) {
    expect(2);
    request.onsuccess = function (e) {
      var db = e.target.result;
      var people = db.transaction([env.people]).objectStore(env.people);
      equal(people.indexNames.length, 1, "indexNames quantity should be 1");
      equal(people.indexNames[0], env.nameIndex, "Index name should be \"{0}\"".format(env.nameIndex));
      db.close();
      start();
    }
  }

  function testValidateCreateIndex(request) {
    expect(4);
    request.onupgradeneeded = function (e) {
      var people = e.target.transaction.objectStore(env.people);
      try { people.createIndex("name", "name"); }
      catch (ex) {
        ok(true, "Index with same name already exists");
      }
      try { people.deleteIndex("name1"); }
      catch (ex) {
        ok(true, "Delete non-existent index");
      }
    };
    request.onsuccess = function (e) {
      var db = e.target.result;
      var people = db.transaction([env.people], IDBTransaction.READ_WRITE).objectStore(env.people);
      try { people.deleteIndex("name"); }
      catch (ex) {
        ok(true, "Delete index outside of \"versionchange\" transaction");
      }
      try { people.createIndex("age", "age"); }
      catch (ex) {
        ok(true, "Create index outside of \"versionchange\" transaction");
      }
      db.close();
      start();
    }
  }

  // Utils
  function _test(name, fn) {
    QUnit.asyncTest(name, function () {
      var promise = util.initDBPromise(env.dbname, env.dbversion, function (db) {
        var people = db.createObjectStore(env.people);
        people.createIndex(env.nameIndex, "name");
      });
      promise.fail(function (e) {
        ok(false, "Testing environment initialization failure. ");
        console.warn(e);
        start();
      });
      promise.done(function (e) {
        try {
          var request = indexedDB.open(env.dbname, env.dbversion + 1);
          request.onerror = request.onblocked = util.shouldNotReachHereCallback;
          fn(request);
        }
        catch (ex) {
          console.warn(ex);
          ok(false, "Exception thrown. " + ex);
          start();
        }
      });
    });
  }
});
