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
    var IDBIndex = util.IDBIndex = window.IDBIndex = function (objectStore, name, keyPath, unique, multiEntry) {
      this.objectStore = objectStore;
      this.name = name;
      this.keyPath = keyPath;
      this.unique = unique;
      this.multiEntry = multiEntry;

      this._ready = true;
    };

    IDBIndex.prototype.openCursor = function (range, direction) {
      return performOpeningCursor(this, util.IDBCursorWithValue, range, direction);
    };

    IDBIndex.prototype.openKeyCursor = function (range, direction) {
      return performOpeningCursor(this, util.IDBCursor, range, direction);
    };

    IDBIndex.prototype.get = function (key) {
      var encodedKeyOrRange = util.validateKeyOrRange(key);
      var request = new util.IDBRequest(this);
      var me = this;
      this.objectStore.transaction._queueOperation(function (sqlTx, nextRequestCallback) {
        var sql = ["SELECT s.value FROM [" + util.indexTable(me) + "] AS i INNER JOIN"];
        sql.push("[" + me.objectStore.name + "] AS s ON s.id = i.recordId");
        if (encodedKeyOrRange instanceof util.IDBKeyRange) {
          sql.push("WHERE", encodedKeyOrRange._getSqlFilter("i.key"));
        }
        else if (encodedKeyOrRange != null) {
          sql.push("WHERE (i.key = X'" + encodedKeyOrRange + "')");
        }
        sql.push("ORDER BY i.key, i.primaryKey LIMIT 1");
        sqlTx.executeSql(sql.join(" "), null,
          function (_, results) {
            util.fireSuccessEvent(request, results.rows.length > 0 ?
              w_JSON.parse(results.rows.item(0).value) : undefined)
          },
          function (_, error) {
            util.fireErrorEvent(request, error);
          });

        nextRequestCallback();
      });
      return request;
    };

    IDBIndex.prototype.getKey = function (key) {
      var encodedKeyOrRange = util.validateKeyOrRange(key);
      var request = new util.IDBRequest(this);
      var me = this;
      this.objectStore.transaction._queueOperation(function (sqlTx, nextRequestCallback) {
        var sql = ["SELECT hex(primaryKey) 'primaryKey' FROM [" + util.indexTable(me) + "]"];
        if (encodedKeyOrRange instanceof util.IDBKeyRange) {
          sql.push("WHERE", encodedKeyOrRange._getSqlFilter());
        }
        else if (encodedKeyOrRange != null) {
          sql.push("WHERE (key = X'" + encodedKeyOrRange + "')");
        }
        sql.push("LIMIT 1");
        sqlTx.executeSql(sql.join(" "), null,
          function (_, results) {
            util.fireSuccessEvent(request, results.rows.length > 0 ?
              util.decodeKey(results.rows.item(0).primaryKey) : undefined);
          },
          function (_, error) {
            util.fireErrorEvent(request, error);
          });

        nextRequestCallback();
      });
      return request;
    };

    IDBIndex.prototype.count = function (key) {
      var encodedKeyOrRange = util.validateKeyOrRange(key);
      var request = new util.IDBRequest(this);
      var me = this;
      this.objectStore.transaction._queueOperation(function (sqlTx, nextRequestCallback) {
        var sql = ["SELECT COUNT(recordId) AS 'count' FROM [" + util.indexTable(me) + "]"];
        if (encodedKeyOrRange instanceof util.IDBKeyRange) {
          sql.push("WHERE", encodedKeyOrRange._getSqlFilter());
        }
        else if (encodedKeyOrRange != null) {
          sql.push("WHERE (key = X'" + encodedKeyOrRange + "')");
        }
        sqlTx.executeSql(sql.join(" "), null,
          function (_, results) {
            util.fireSuccessEvent(request, results.rows.item(0).count);
          },
          function (_, error) {
            util.fireErrorEvent(request, error);
          });

        nextRequestCallback();
      });
      return request;
    };

    // Utils
    var w_JSON = window.JSON;

    function performOpeningCursor(me, cursorType, range, direction) {
      var request = new util.IDBRequest(me);
      var cursor = new cursorType(me, direction, request);
      cursor._range = util.IDBKeyRange._ensureKeyRange(range);
      cursor.continue();
      return request;
    }

  }(window, window.indexedDB, window.indexedDB.util));
