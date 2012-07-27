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

if (window.indexedDB.polyfill)
  (function (window, indexedDB, util, undefined) {
    var origin = { };

    indexedDB.open = function (name, version) {
      if (arguments.length == 2 && version == undefined) throw util.error("TypeError");
      if (version !== undefined) {
        version = parseInt(version.valueOf());
        if (isNaN(version) || version <= 0)
          throw util.error("TypeError", "The method parameter is missing or invalid.");
      }
      var request = new util.IDBOpenDBRequest(null);
      util.async(function () {
        request.readyState = util.IDBRequest.DONE;
        runStepsForOpeningDB(name, version, request);
      });
      return request;
    };

    function runStepsForOpeningDB(name, version, request) {
      var sqldb = util.openDatabase(name);
      if (sqldb.version !== "" && isNaN(parseInt(sqldb.version))) // sqldb.version is corrupt
      {
        util.fireErrorEvent(request, util.error("VersionError"));
        return;
      }

      var connection = new util.IDBDatabase(name, sqldb);
      var oldVersion = sqldb.version == "" ? 0 : parseInt(sqldb.version);
      connection.version = (version === undefined) ? (oldVersion === 0 ? 1 : oldVersion) : version;
      var database = getOriginDatabase(name);

      util.wait(function () {
          // www.w3.org/TR/IndexedDB 4.1.3
          if (database.deletePending) return false;
          for (var i = 0; i < database.connections.length; i++) {
            if (database.connections[i]._versionChangeTransaction != null) return false;
          }
          return true;
        },
        function () {
          if (oldVersion < connection.version) {
            runStepsForVersionChangeTransaction(request, connection, oldVersion);
          }
          else if (oldVersion == connection.version) {
            openVersionMatch(request, connection, sqldb);
          }
          else {
            util.fireErrorEvent(request, util.error("VersionError"));
          }
        });
    }

    function runStepsForVersionChangeTransaction(request, connection, oldVersion) {
      fireVersionChangeEvent(request, connection.name, oldVersion, connection.version);
      util.wait(function () {
          return getOriginDatabase(name).connections.length == 0;
        },
        function () {
          startVersionChangeTransaction(request, connection, oldVersion);
        });
    }

    function startVersionChangeTransaction(request, connection, oldVersion) {
      var database = getOriginDatabase(connection.name);
      database.connections.push(connection);
      var tx = new util.IDBTransaction(connection, [], util.IDBTransaction.VERSION_CHANGE);
      if (oldVersion == 0) {
        tx._queueOperation(function (sqlTx, nextRequestCallback) {
          sqlTx.executeSql("CREATE TABLE [" + indexedDB.SCHEMA_TABLE + "] (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "type TEXT NOT NULL, " +
            "name TEXT NOT NULL, " +
            "keyPath TEXT, " +
            "currentNo INTEGER NOT NULL DEFAULT 1, " +
            // specific to tables
            "autoInc BOOLEAN, " +
            // specific to indexes
            "tableId INTEGER, " +
            "[unique] BOOLEAN, " +
            "multiEntry BOOLEAN, " +
            "UNIQUE (type, name) ON CONFLICT ROLLBACK)");

          nextRequestCallback();
        });
      }
      tx._queueOperation(function (sqlTx, nextRequestCallback) {
        connection._loadObjectStores(sqlTx,
          function () {
            request.result = connection;
            if (request.onupgradeneeded) {
              request.transaction = connection._versionChangeTransaction = tx;
              var e = new util.IDBVersionChangeEvent("onupgradeneeded",
                request, oldVersion, connection.version);
              request.onupgradeneeded(e);
            }
            nextRequestCallback();
          },
          function (error) {
            nextRequestCallback();
          });
      });
      tx.onabort = function (e) {
        request.error = tx.error;
        connection._versionChangeTransaction = null;
        if (request.onerror) request.onerror(util.event("abort", request));
      };
      tx.onerror = function (e) {
        request.transaction = connection._versionChangeTransaction = null;
        util.fireErrorEvent(request, tx.error);
      };
      tx.oncomplete = function (e) {
        request.transaction = connection._versionChangeTransaction = null;
        util.fireSuccessEvent(request);
      };
    }

    function openVersionMatch(request, connection, sqldb) {
      sqldb.transaction(
        function (sqlTx) {
          connection._loadObjectStores(sqlTx);
        },
        function (error) {
          util.fireErrorEvent(request, error);
        },
        function () {
          util.fireSuccessEvent(request, connection);
        }
      );
    }

    // IDBFactory.deleteDatabase
    indexedDB.deleteDatabase = function (name) {
      // INFO: There is no way to delete database in Web SQL Database API.
      var database = getOriginDatabase(name);
      database.deletePending = true;
      var request = new util.IDBOpenDBRequest(null);
      util.async(function () {
        request.readyState = util.IDBRequest.DONE;
        var sqldb = util.openDatabase(name);
        if (sqldb.version == "") {
          database.deletePending = false;
          util.fireSuccessEvent(request);
        }
        else {
          fireVersionChangeEvent(request, name, parseInt(sqldb.version), null);
          util.wait(function () {
              return database.connections.length == 0;
            },
            function () {
              deleteDatabase(request, sqldb, database);
            });
        }
      });
      return request;
    };

    // IDBFactory.cmp
    indexedDB.cmp = function (first, second) {
      first = util.encodeKey(first);
      second = util.encodeKey(second);
      return first > second ? 1 : (first == second ? 0 : -1);
    };

    indexedDB._notifyConnectionClosed = function (connection) {
      var database = getOriginDatabase(connection.name);
      var i = database.connections.indexOf(connection);
      if (i >= 0) database.connections.splice(i, 1);
    };

    // Utils
    function getOriginDatabase(name) {
      var db = origin[name];
      if (db == null) {
        db = {
          name : name,
          deletePending : false,
          connections : []    // openDatabases
        };
        origin[name] = db;
      }
      return db;
    }

    function fireVersionChangeEvent(request, name, oldVersion, newVersion) {
      var database = getOriginDatabase(name);
      var anyOpenConnection = false;
      for (var i = 0; i < database.connections.length; i++) {
        var conn = database.connections[i];
        if (conn._closePending) continue;

        anyOpenConnection = true;
        var event = new util.IDBVersionChangeEvent("versionchange", request, oldVersion, newVersion);
        if (conn.onversionchange) conn.onversionchange(event);
      }
      if (anyOpenConnection) {
        var event = new util.IDBVersionChangeEvent("blocked", request, oldVersion, newVersion);
        if (request.onblocked) request.onblocked(event);
      }
    }

    function deleteDatabase(request, sqldb, database) {
      sqldb.changeVersion(sqldb.version, "",
        function (sqlTx) {
          sqlTx.executeSql("SELECT a.type, a.name, b.name 'table' FROM " + indexedDB.SCHEMA_TABLE +
            " a LEFT JOIN " + indexedDB.SCHEMA_TABLE + " b ON a.type = 'index' AND a.tableId = b.Id",
            null,
            function (sqlTx, results) {
              var name;
              for (var i = 0; i < results.rows.length; i++) {
                var item = results.rows.item(i);
                name = item.type == 'table' ? item.name : util.indexTable(item.table, item.name);
                sqlTx.executeSql("DROP TABLE [" + name + "]");
              }
              sqlTx.executeSql("DROP TABLE " + indexedDB.SCHEMA_TABLE);
            });
        },
        function (error) {
          database.deletePending = false;
          util.fireErrorEvent(request, error);
        },
        function () {
          database.deletePending = false;
          util.fireSuccessEvent(request);
        });
    }

  }(window, window.indexedDB, window.indexedDB.util));
