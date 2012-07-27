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

var BenchmarkTests = new (function () {
  var DB_NAME = "benchmarkDB";
  var OBJECT_STORE = "objectStore";
  var LOOP_SIZE = 1;

  this.run = function (attempts, recordsScale, skipAttempts, callback, onstatus) {
    var tests = new TestChain();
    tests.attempts = attempts;
    tests.recordsScale = recordsScale;
    tests.skipAttempts = skipAttempts;
    tests.onstatus = onstatus;

    commonTests(tests, 0);

    tests.createTest("ObjecStore.count",
      function (db, numberOfRecords) {
        var objectStore = db.createObjectStore(OBJECT_STORE);
        for (var i = 0; i < numberOfRecords; i++) {
          objectStore.add(createRecord(1), i);
        }
      },
      function (objectStore) {
        objectStore.count();
        objectStore.count(IDBKeyRange.bound(10, LOOP_SIZE));
      });

    tests.createTest("ObjecStore.get",
      function (db, numberOfRecords) {
        var objectStore = db.createObjectStore(OBJECT_STORE);
        for (var i = 0; i < numberOfRecords; i++) {
          objectStore.add(createRecord(1), i);
        }
      },
      function (objectStore, numberOfRecords) {
        for (var i = 0; i < LOOP_SIZE; i++) {
          objectStore.get(util.randomInt(0, numberOfRecords));
        }
      });

    tests.createTest("ObjectStore IDBCursor.continue",
      function (db, numberOfRecords) {
        var objectStore = db.createObjectStore(OBJECT_STORE);
        for (var i = 0; i < numberOfRecords; i++) {
          objectStore.add(createRecord(1), i);
        }
      },
      function (objectStore) {
        var counter = LOOP_SIZE;
        objectStore.openCursor().onsuccess = function (e) {
          var cursor = e.target.result;
          if (cursor == null || !--counter) return;
          cursor.continue();
        }
      });

    tests.createTest("ObjectStore IDBCursor.advance",
      function (db, numberOfRecords) {
        var objectStore = db.createObjectStore(OBJECT_STORE);
        for (var i = 0; i < numberOfRecords; i++) {
          objectStore.add(createRecord(1), i);
        }
      },
      function (objectStore) {
        var counter = LOOP_SIZE;
        objectStore.openCursor().onsuccess = function (e) {
          var cursor = e.target.result;
          if (cursor == null || !--counter) return;
          cursor.advance(5);
        }
      });

    tests.createTest("ObjecStore.createIndex",
      function (db, numberOfRecords) {
        var objectStore = db.createObjectStore(OBJECT_STORE);
        for (var i = 0; i < numberOfRecords; i++) {
          objectStore.add({ foo : { bar : util.randomStr(4, 5)}, baz : util.randomInt(0, 100)}, i);
        }
      },
      function (objectStore) {
        objectStore.createIndex("Index", "foo.bar");
      },
      IDBTransaction.VERSION_CHANGE);

    tests.createTest("ObjecStore.deleteIndex",
      function (db, numberOfRecords) {
        var objectStore = db.createObjectStore(OBJECT_STORE);
        for (var i = 0; i < numberOfRecords; i++) {
          objectStore.add({ foo : { bar : util.randomStr(4, 5)}, baz : util.randomInt(0, 100)}, i);
        }
        objectStore.createIndex("Index", "foo.bar");
      },
      function (objectStore) {
        objectStore.deleteIndex("Index");
      },
      IDBTransaction.VERSION_CHANGE);

    tests.createTest("Index.get",
      function (db, numberOfRecords) {
        var objectStore = db.createObjectStore(OBJECT_STORE);
        objectStore.createIndex("Index", "foo.bar");
        for (var i = 0; i < numberOfRecords; i++) {
          var value = createRecord(1);
          value.foo = { bar : i };
          objectStore.add(value, i);
        }
      },
      function (objectStore, numberOfRecords) {
        var index = objectStore.index("Index");
        for (var i = 0; i < LOOP_SIZE; i++) {
          index.get(util.randomInt(0, numberOfRecords));
        }
      });

    tests.createTest("Index.getKey",
      function (db, numberOfRecords) {
        var objectStore = db.createObjectStore(OBJECT_STORE);
        objectStore.createIndex("Index", "foo.bar");
        for (var i = 0; i < numberOfRecords; i++) {
          var value = createRecord(1);
          value.foo = { bar : i };
          objectStore.add(value, i);
        }
      },
      function (objectStore, numberOfRecords) {
        var index = objectStore.index("Index");
        for (var i = 0; i < LOOP_SIZE; i++) {
          index.getKey(util.randomInt(0, numberOfRecords));
        }
      });

    tests.createTest("Index.count",
      function (db, numberOfRecords) {
        var objectStore = db.createObjectStore(OBJECT_STORE);
        objectStore.createIndex("Index", "foo.bar");
        for (var i = 0; i < numberOfRecords; i++) {
          var value = createRecord(1);
          value.foo = { bar : i };
          objectStore.add(value, i);
        }
      },
      function (objectStore, numberOfRecords) {
        var index = objectStore.index("Index");
        index.count();
        index.count(IDBKeyRange.bound(0, util.randomInt(0, numberOfRecords)));
      });

    tests.createTest("Index IDBCursor.continue",
      function (db, numberOfRecords) {
        var objectStore = db.createObjectStore(OBJECT_STORE);
        objectStore.createIndex("Index", "foo.bar");
        for (var i = 0; i < numberOfRecords; i++) {
          var value = createRecord(1);
          value.foo = { bar : util.randomStr(2, 5) };
          objectStore.add(value, i);
        }
      },
      function (objectStore) {
        var counter = LOOP_SIZE;
        objectStore.index("Index").openCursor().onsuccess = function (e) {
          var cursor = e.target.result;
          if (cursor == null || !--counter) return;
          cursor.continue();
        }
      });

    tests.createTest("Index IDBCursor.advance",
      function (db, numberOfRecords) {
        var objectStore = db.createObjectStore(OBJECT_STORE);
        objectStore.createIndex("Index", "foo.bar");
        for (var i = 0; i < numberOfRecords; i++) {
          var value = createRecord(1);
          value.foo = { bar : util.randomStr(2, 5) };
          objectStore.add(value, i);
        }
      },
      function (objectStore) {
        var counter = LOOP_SIZE;
        objectStore.index("Index").openCursor().onsuccess = function (e) {
          var cursor = e.target.result;
          if (cursor == null || !--counter) return;
          cursor.advance(5);
        }
      });

    commonTests(tests, 4);

    tests.runAll(function (resultsText) {
      if (callback) callback(resultsText);
    });
  };

  function commonTests(tests, numberOfIndexes) {
    var initIndexes = function (objectStore) {
      for (var i = 0; i < numberOfIndexes; i++) {
        objectStore.createIndex("Index" + i, "prop" + i);
      }
    };
    var testNamePrefix = numberOfIndexes ? "ObjectStore with " + numberOfIndexes + " indexes. " : "";

    tests.createTest(testNamePrefix + "ObjecStore.add out-of-line key without a key generator",
      function (db, numberOfRecords) {
        var objectStore = db.createObjectStore(OBJECT_STORE);
        initIndexes(objectStore);
        for (var i = 0; i < numberOfRecords; i++) {
          objectStore.add(createRecord(numberOfIndexes), i + util.randomStr(2, 5));
        }
      },
      function (objectStore, numberOfIndexes) {
        for (var i = 0; i < LOOP_SIZE; i++) {
          objectStore.add(createRecord(numberOfIndexes), "0" + i + util.randomStr(2, 5));
        }
      });

    tests.createTest(testNamePrefix + "ObjecStore.add out-of-line key with a key generator",
      function (db, numberOfRecords) {
        var objectStore = db.createObjectStore(OBJECT_STORE, { autoIncrement : true });
        initIndexes(objectStore);
        for (var i = 0; i < numberOfRecords; i++) {
          objectStore.add(createRecord(numberOfIndexes));
        }
      },
      function (objectStore, numberOfIndexes) {
        for (var i = 0; i < LOOP_SIZE; i++) {
          objectStore.add(createRecord(numberOfIndexes));
        }
      });

    tests.createTest(testNamePrefix + "ObjecStore.add in-line key without a key generator",
      function (db, numberOfRecords) {
        var objectStore = db.createObjectStore(OBJECT_STORE, { keyPath : "foo.bar.baz" });
        initIndexes(objectStore);
        for (var i = 0; i < numberOfRecords; i++) {
          var value = createRecord(numberOfIndexes);
          value.foo = { bar : { baz : i + util.randomStr(2, 5) }};
          objectStore.add(value);
        }
      },
      function (objectStore, numberOfIndexes) {
        for (var i = 0; i < LOOP_SIZE; i++) {
          var value = createRecord(numberOfIndexes);
          value.foo = { bar : { baz : "0" + i + util.randomStr(2, 5) }};
          objectStore.add(value);
        }
      });

    tests.createTest(testNamePrefix + "ObjecStore.add in-line key with a key generator",
      function (db, numberOfRecords) {
        var objectStore = db.createObjectStore(OBJECT_STORE, { keyPath : "foo.bar.baz" });
        initIndexes(objectStore);
        for (var i = 0; i < numberOfRecords; i++) {
          objectStore.add(createRecord(numberOfIndexes));
        }
      },
      function (objectStore, numberOfIndexes) {
        for (var i = 0; i < LOOP_SIZE; i++) {
          objectStore.add(createRecord(numberOfIndexes));
        }
      });

    tests.createTest(testNamePrefix + "ObjecStore.clear",
      function (db, numberOfRecords) {
        var objectStore = db.createObjectStore(OBJECT_STORE, { autoIncrement : true });
        initIndexes(objectStore);
        for (var i = 0; i < numberOfRecords; i++) {
          objectStore.add(createRecord(numberOfIndexes));
        }
      },
      function (objectStore) {
        objectStore.clear();
      });

    tests.createTest(testNamePrefix + "ObjecStore.delete",
      function (db, numberOfRecords) {
        var objectStore = db.createObjectStore(OBJECT_STORE, { autoIncrement : true });
        initIndexes(objectStore);
        for (var i = 0; i < numberOfRecords; i++) {
          objectStore.add(createRecord(numberOfIndexes));
        }
      },
      function (objectStore, numberOfRecords) {
        for (var i = 0; i < LOOP_SIZE; i++) {
          objectStore.delete(util.randomInt(0, numberOfRecords));
        }
      });

    tests.createTest(testNamePrefix + "ObjectStore IDBCursor.update",
      function (db, numberOfRecords) {
        var objectStore = db.createObjectStore(OBJECT_STORE);
        initIndexes(objectStore);
        for (var i = 0; i < numberOfRecords; i++) {
          objectStore.add(createRecord(numberOfIndexes), i);
        }
      },
      function (objectStore, numberOfIndexes) {
        var counter = LOOP_SIZE;
        objectStore.openCursor().onsuccess = function (e) {
          var cursor = e.target.result;
          if (cursor == null || !--counter) return;
          cursor.update(createRecord(numberOfIndexes));
        }
      });

    tests.createTest(testNamePrefix + "ObjectStore IDBCursor.delete",
      function (db, numberOfRecords) {
        var objectStore = db.createObjectStore(OBJECT_STORE);
        initIndexes(objectStore);
        for (var i = 0; i < numberOfRecords; i++) {
          objectStore.add(createRecord(numberOfIndexes), i);
        }
      },
      function (objectStore) {
        var counter = LOOP_SIZE;
        objectStore.openCursor().onsuccess = function (e) {
          var cursor = e.target.result;
          if (cursor == null || !--counter) return;
          cursor.delete();
        }
      });

    tests.createTest("Index IDBCursor.update",
      function (db, numberOfRecords) {
        var objectStore = db.createObjectStore(OBJECT_STORE);
        initIndexes(objectStore);
        objectStore.createIndex("Index", "foo.bar");
        for (var i = 0; i < numberOfRecords; i++) {
          var value = createRecord(numberOfIndexes);
          value.foo = { bar : util.randomStr(2, 5) };
          objectStore.add(value, i);
        }
      },
      function (objectStore) {
        var counter = LOOP_SIZE;
        objectStore.index("Index").openCursor().onsuccess = function (e) {
          var cursor = e.target.result;
          if (cursor == null || !--counter) return;

          cursor.value.foo.bar = util.randomStr(2, 5);
          cursor.update(cursor.value);
        }
      });

    tests.createTest("Index IDBCursor.delete",
      function (db, numberOfRecords) {
        var objectStore = db.createObjectStore(OBJECT_STORE);
        initIndexes(objectStore);
        objectStore.createIndex("Index", "foo.bar");
        for (var i = 0; i < numberOfRecords; i++) {
          var value = createRecord(numberOfIndexes);
          value.foo = { bar : util.randomStr(2, 5) };
          objectStore.add(value, i);
        }
      },
      function (objectStore) {
        var counter = LOOP_SIZE;
        objectStore.index("Index").openCursor().onsuccess = function (e) {
          var cursor = e.target.result;
          if (cursor == null || !--counter) return;
          cursor.delete();
        }
      });
  }

  // Internal
  var TestChain = function () {
    this._tests = [];
  };

  TestChain.prototype = new (function () {
    this.attempts = 6;
    this.recordsScale = null;
    this.ontestdone = null;

    this.createTest = function (name, initDataCallback, testCallback, transactionMode, doneCallback) {
      var testCase = new TestCase();
      testCase.name = name;
      testCase.transactionMode = transactionMode;
      testCase.init(this, initDataCallback, testCallback, doneCallback);
      this._tests.push(testCase);
      return testCase;
    };

    this.runAll = function (callback) {
      var resultText = [], testIndex = 0;

      this.ontestdone = function (test, results) {
        var tmp;
        if (results && results.error) {
          resultText.push(test.name +
            ". Number of records: (" + test.getRecordsScale() +
            "), attempts: " + test.getAttempts() +
            ", error: " + results.error.comment);
        }
        else {
          resultText.push("<span style='color: #00008b;'>• " + test.name + "</span>");
          for (var scale in results) {
            tmp = results[scale];
            resultText.push("Number of records: " + scale +
              ", attempts: " + test.getAttempts() +
              " (" + tmp +
              "), average time spent: " + avg(tmp) + " ms");
          }
        }
        run(testIndex++);
      };
      this.reportStatus = function (percentage) {
        var numberOfTests = this._tests.length;
        if (testIndex >= numberOfTests) return;

        if (this.onstatus) this.onstatus(
          Math.floor((testIndex + percentage) / numberOfTests * 100),
          this._tests[testIndex].name);
      };

      var me = this;

      function run(index) {
        if (index >= me._tests.length) {
          callback(resultText.join("<br />"));
          resultText = [];
          if (me.onstatus) me.onstatus(100, "Complete");
          return;
        }
        var _test = me._tests[index];

        _test.run();
      }

      run(testIndex);
    };

    var TestCase = function () {
      this.name = null;
      this.attempts = null;
      this.skipAttempts = null;
      this.recordsScale = null;
      this.transactionMode = null;
    };
    TestCase.prototype = new (function () {
      var _testChain, _initDataCallback, _testCallback, _doneCallback;

      this.getAttempts = function () {
        return this.attempts || (_testChain && _testChain.attempts);
      };
      this.getRecordsScale = function () {
        return this.recordsScale || (_testChain && _testChain.recordsScale);
      };
      this.getSkipAttempts = function () {
        return this.skipAttempts || (_testChain && _testChain.skipAttempts);
      };

      function onDone(testCase, results) {
        if (_doneCallback) _doneCallback(results);
        _testChain && _testChain.ontestdone && _testChain.ontestdone(testCase, results);
      }

      this.init = function (testChain, initDataCallback, testCallback, doneCallback) {
        this.transactionMode = this.transactionMode || IDBTransaction.READ_WRITE;
        _testChain = testChain;
        _initDataCallback = initDataCallback;
        _testCallback = testCallback;
        _doneCallback = doneCallback;
      };

      this.run = function () {
        var skipAttempts = this.getSkipAttempts(), recordsScale = this.getRecordsScale();
        var times = this.getAttempts() + skipAttempts, total = recordsScale.length * times;

        var me = this;
        if (!(recordsScale instanceof Array)) {
          recordsScale = [recordsScale];
        }
        var results = { };
        var recurseRun = function (counter, scaleIndex, result) {
          _testChain && _testChain.reportStatus((counter + scaleIndex * times) / total);

          if (result && result.error) {
            onDone(me, result);
            return;
          }
          var scale = parseInt(recordsScale[scaleIndex]);
          if (counter === 0) {
            results[scale] = [];
          }
          else if (counter > skipAttempts) {
            results[scale].push(result);
          }
          if (counter >= times) {
            if (scaleIndex + 1 >= recordsScale.length) {
              onDone(me, results);
              return;
            }
            counter = 0;
            scaleIndex++;
            scale = parseInt(recordsScale[scaleIndex]);
            results[scale] = [];
          }
          run(me, scale, function (result) {
            recurseRun(counter + 1, scaleIndex, result);
          });
        };
        recurseRun(0, 0);
      };

      function run(me, recordsScale, callback) {
        var r = indexedDB.deleteDatabase(DB_NAME);
        r.onblocked = r.onerror = function (e) {
          callback({ error : true, comment : "Failed to delete database" });
        };
        r.onsuccess = function (e) {
          r = indexedDB.open(DB_NAME);
          r.onupgradeneeded = function (e) {
            _initDataCallback(e.target.result, recordsScale);
          };
          r.onsuccess = function (e) {
            var startTime = new Date();
            var db = e.target.result;
            if (me.transactionMode === IDBTransaction.VERSION_CHANGE) {
              db.close();
              var r2 = indexedDB.open(DB_NAME, 2);
              r2.onupgradeneeded = function (e) {
                var tx = e.target.transaction;
                var startTime = new Date();
                _testCallback(tx.objectStore(OBJECT_STORE), recordsScale);
              };
              r2.onsuccess = function (e) {
                e.target.result.close();
                var endTime = new Date();
                callback(endTime - startTime);
              };
              r2.onerror = function (e) {
                callback({ error : true, comment : "Error: " + e.target.error });
              }
            }
            else {
              var tx = db.transaction([OBJECT_STORE], me.transactionMode);
              _testCallback(tx.objectStore(OBJECT_STORE), recordsScale);
              tx.oncomplete = function (e) {
                db.close();
                var endTime = new Date();
                callback(endTime - startTime);
              };
              tx.onabort = function (e) {
                callback({ error : true, comment : "Transaction AbortError: " + tx.error });
              }
            }
          }
        }
      }
    });
  });

  function avg(array) {
    var sum = 0, i = array.length;
    while (i--) sum += array[i];
    return Math.floor(sum / array.length);
  }

  function createRecord(numberOfProperties) {
    var record = { defaultProp : util.randomStr(2, 4) };
    for (var i = 0; i < numberOfProperties; i++) {
      record["prop" + i] = util.randomStr(2, 10);
    }
    return record;
  }
});
