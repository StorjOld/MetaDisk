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
    var IDBDatabase = util.IDBDatabase = window.IDBDatabase = function (name, webdb) {
      this.name = name;
      this.version = null;
      this.objectStoreNames = new indexedDB.DOMStringList();
      this.onabort = null;
      this.onerror = null;
      this.onversionchange = null;

      this._webdb = webdb;
      this._objectStores = null;  // TODO: ObjectStores are specific to IDBTransaction
      this._closePending = false;
      this._activeTransactionCounter = 0;
      this._closed = false;
    };

    IDBDatabase.prototype.createObjectStore = function (name, optionalParameters) {
      IDBTransaction._assertVersionChange(this._versionChangeTransaction);
      // Validate existence of ObjectStore
      if (this.objectStoreNames.indexOf(name) >= 0) {
        throw util.error("ConstraintError");
      }

      var params = optionalParameters || { };
      var keyPath = util.validateKeyPath(params.keyPath);
      var autoIncrement = params.autoIncrement && params.autoIncrement != false || false;

      if (autoIncrement && (keyPath === "" || (keyPath instanceof Array))) {
        throw util.error("InvalidAccessError");
      }
      return createObjectStore(this, name, keyPath, autoIncrement);
    };

    IDBDatabase.prototype.deleteObjectStore = function (name) {
      var tx = this._versionChangeTransaction;
      IDBTransaction._assertVersionChange(tx);
      if (this.objectStoreNames.indexOf(name) == -1) {
        throw util.error("NotFoundError");
      }
      util.arrayRemove(this.objectStoreNames, name);
      var objectStore = this._objectStores[name];
      delete this._objectStores[name];
      var me = this;
      var errorCallback = function () {
        me.objectStoreNames.push(name);
        me._objectStores[name] = objectStore;
      };
      tx._queueOperation(function (sqlTx, nextRequestCallback) {
        sqlTx.executeSql("DROP TABLE [" + name + "]", null, null, errorCallback);
        sqlTx.executeSql("DELETE FROM " + indexedDB.SCHEMA_TABLE + " WHERE type = 'table' AND name = ?",
          [name], null, errorCallback);

        nextRequestCallback();
      });
    };

    IDBDatabase.prototype.transaction = function (storeNames, mode) {
      // TODO: 4.2.1. throw InvalidStateError if a transaction being creating within transaction callback
      if (storeNames instanceof Array || storeNames == null) {
        if (storeNames.length == 0) throw util.error("InvalidAccessError");
      }
      else {
        storeNames = [storeNames.toString()];
      }
      for (var i = 0; i < storeNames.length; i++) {
        if (!this.objectStoreNames.contains(storeNames[i])) throw util.error("NotFoundError");
      }
      if (this._closePending || this._closed) throw util.error("InvalidStateError");
      return new util.IDBTransaction(this, storeNames, mode || util.IDBTransaction.READ_ONLY);
    };

    IDBDatabase.prototype.close = function () {
      this._closePending = true;
      needDBClose(this);
    };

    IDBDatabase.prototype._loadObjectStores = function (sqlTx, successCallback, errorCallback) {
      var me = this;
      sqlTx.executeSql("SELECT * FROM " + indexedDB.SCHEMA_TABLE +
        " ORDER BY type DESC", null,
        function (sqlTx, resultSet) {
          me._objectStores = { };
          var item, objectStore;
          for (var i = 0; i < resultSet.rows.length; i++) {
            item = resultSet.rows.item(i);
            if (item.type == "table") {
              me.objectStoreNames.push(item.name);
              objectStore = new util.IDBObjectStore(item.name, w_JSON.parse(item.keyPath), item.autoInc);
              objectStore._metaId = item.id;
              me._objectStores[item.name] = objectStore;
            }
            else if (item.type == "index") {
              for (var name in me._objectStores) {
                objectStore = me._objectStores[name];
                if (objectStore._metaId == item.tableId) break;
              }
              objectStore.indexNames.push(item.name);
              objectStore._indexes[item.name] = new util.IDBIndex(objectStore,
                item.name, item.keyPath, item.unique, item.multiEntry)
            }
          }
          if (successCallback) successCallback();
        },
        function (_, error) {
          if (errorCallback) errorCallback(error);
        });
    };

    IDBDatabase.prototype._transactionCompleted = function () {
      this._activeTransactionCounter--;
      needDBClose(this);
    };

    // Utils
    var w_JSON = window.JSON;

    function createObjectStore(me, name, keyPath, autoIncrement) {
      var objectStore = new util.IDBObjectStore(name, keyPath, autoIncrement, me._versionChangeTransaction);
      me.objectStoreNames.push(name);
      me._objectStores[name] = objectStore;
      var errorCallback = function () {
        util.arrayRemove(me.objectStoreNames, name);
        delete me._objectStores[name];
      };
      me._versionChangeTransaction._queueOperation(function (sqlTx, nextRequestCallback) {
        sqlTx.executeSql("CREATE TABLE [" + name + "] (id INTEGER PRIMARY KEY AUTOINCREMENT, " +
          "key BLOB UNIQUE, value BLOB)", null, null, errorCallback);

        sqlTx.executeSql("CREATE INDEX INDEX_" + name + "_key ON [" + name + "] (key)", null, null, errorCallback);

        sqlTx.executeSql("INSERT INTO " + indexedDB.SCHEMA_TABLE +
          " (type, name, keyPath, autoInc) VALUES ('table', ?, ?, ?)",
          [name, w_JSON.stringify(keyPath), autoIncrement ? 1 : 0],
          function (sqlTx, results) {
            objectStore._metaId = results.insertId;
          },
          errorCallback);

        nextRequestCallback();
      });
      return objectStore;
    }

    function needDBClose(me) {
      if (me._closePending && me._activeTransactionCounter == 0) {
        me._closePending = false;
        me._closed = true;
        indexedDB._notifyConnectionClosed(me);
      }
    }

  }(window, window.indexedDB, window.indexedDB.util));
