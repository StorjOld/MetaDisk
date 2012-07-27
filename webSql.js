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
  (function (window, util, undefined) {
    var DEFAULT_DB_SIZE = 5 * 1024 * 1024;

    util.openDatabase = function (name) {
      return new Database(window.openDatabase(indexedDB.DB_PREFIX + name, "", "IndexedDB " + name, DEFAULT_DB_SIZE));
    };

    var Database_prototype = function (db) {
      var db = db;

      this.version = db && db.version;

      this.transaction = function (callback, errorCallback, successCallback) {
        db.transaction(function (tx) {
            if (callback) callback(new Transaction(tx));
          },
          function (error) {
            if (errorCallback) errorCallback(wrapSqlError(error));
          },
          function () {
            if (successCallback) successCallback();
          });
      };

      this.readTransaction = function (callback, errorCallback, successCallback) {
        db.readTransaction(function (tx) {
            if (callback) callback(new Transaction(tx));
          },
          function (error) {
            if (errorCallback) errorCallback(wrapSqlError(error));
          },
          function () {
            if (successCallback) successCallback();
          });
      };

      this.changeVersion = function (oldVersion, newVersion, callback, errorCallback, successCallback) {
        db.changeVersion(oldVersion, newVersion,
          function (tx) {
            if (callback) callback(new Transaction(tx));
          },
          function (error) {
            if (errorCallback) errorCallback(wrapSqlError(error));
          },
          function () {
            if (successCallback) successCallback();
          });
      };
    };

    var Database = function (db) {
      Database_prototype.call(this, db);
    };
    Database.prototype = new Database_prototype();
    Database.prototype.constructor = Database;


    var Transaction_prototype = function (tx) {
      var tx = tx;

      this.executeSql = function (sql, args, callback, errorCallback) {
        //console.log("[SQL]: %s; args: %o", sql, args);
        tx.executeSql(sql, args,
          function (tx, resultSet) {
            if (callback) callback(new Transaction(tx), resultSet);
          },
          function (tx, error) {
            console.error("[SQL Error]: ", error);
            if (errorCallback) errorCallback(new Transaction(tx), wrapSqlError(error));
          });
      }
    };

    var Transaction = function (tx) {
      Transaction_prototype.call(this, tx);
    };
    Transaction.prototype = new Transaction_prototype();
    Transaction.prototype.constructor = Transaction;

    // Utils
    function wrapSqlError(error) {
      // UnknownError
      if (error == null || error.message == null) return util.error("UnknownError", undefined, error);

      var msg = error.message.toLowerCase();

      // ConstraintError
      if (msg.indexOf("constraint failed") >= 0 || msg.indexOf("is not unique")) {
        return util.error("ConstraintError");
      }
    }

  }(window, window.indexedDB.util));
