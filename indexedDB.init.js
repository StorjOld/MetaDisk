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

(function (window, undefined) {
  var indexedDB = window.indexedDB = window.indexedDB || window.mozIndexedDB ||
    window.webkitIndexedDB || window.msIndexedDB || { polyfill : true };


  if (!indexedDB.polyfill) return;

  console.warn('This browser most likely does not support IndexedDB API. Initializing custom IndexedDB' +
    ' implementation using Web SQL Database API.');


  // Configuration
  indexedDB.SCHEMA_TABLE = "__IndexedDBSchemaInfo__";
  indexedDB.DB_PREFIX = "__IndexedDB__";
  //indexedDB.CURSOR_CHUNK_SIZE = 10;

  // Data types
  indexedDB.DOMStringList = function () { };
  indexedDB.DOMStringList.prototype = [];
  indexedDB.DOMStringList.constructor = indexedDB.DOMStringList;
  indexedDB.DOMStringList.prototype.contains = function (str) {
    return this.indexOf(str) >= 0;
  };

  // Util
  var util = indexedDB.util = new (function () {
    this.async = function (fn, async) {
      if (async == null || async) w_setTimeout(fn, 0);
      else fn();
    };

    this.error = function (name, message, innerError) {
      return {
        name : name,
        message : message,
        inner : innerError
      }
    };

    this.event = function (type, target) {
      return {
        type : type,
        target : target,
        currentTarget : target,
        preventDefault : function () { },
        stopPropagation : function () { }
      };
    };

    this.fireErrorEvent = function (request, error) {
      request.error = error;
      if (request.onerror == null) return;

      request.onerror(this.event("error", request));
    };

    this.fireSuccessEvent = function (request, result) {
      if (arguments.length === 2) request.result = result;
      if (request.onsuccess == null) return;

      request.onsuccess(this.event("success", request));
    };

    this.validateKeyPath = function (keyPath) {
      if (keyPath === "") return "";
      if (keyPath == null) return null;

      var r = /^([^\d\W]\w*\.)+$/i;
      if (keyPath instanceof Array) {
        var i = keyPath.length;
        if (i == 0) throw this.error("SyntaxError");

        while (i--) {
          if (!r.test(keyPath[i] + ".")) throw this.error("SyntaxError");
        }
        return keyPath;
      }
      if (!r.test(keyPath + ".")) throw this.error("SyntaxError");
      return keyPath;
    };

    this.arrayRemove = function (array, item) {
      var i = array.indexOf(item);
      if (i > -1) array.splice(i, 1);
    };

    this.indexTable = function (objectStoreName, name) {
      if (arguments.length == 1 && (objectStoreName instanceof this.IDBIndex)) {
        name = objectStoreName.name;
        objectStoreName = objectStoreName.objectStore.name;
      }
      return indexedDB.DB_PREFIX + "Index__" + objectStoreName + "__" + name;
    };

    this.extractKeyFromValue = function (keyPath, value) {
      var key;
      if (keyPath instanceof Array) {
        key = [];
        for (var i = 0; i < keyPath.length; i++) {
          key.push(this.extractKeyFromValue(keyPath[i], value));
        }
      }
      else {
        if (keyPath === "") return value;

        key = value;
        var paths = keyPath.split(".");
        for (var i = 0; i < paths.length; i++) {
          if (key == null) return null;
          key = key[paths[i]];
        }
      }
      return key;
    };

    this.validateKeyOrRange = function (key) {
      if (key == null) return null;
      if (!(key instanceof this.IDBKeyRange)) {
        key = this.encodeKey(key);
        if (key === null) throw this.error("DataError");
      }
      return key;
    };

    this.wait = function (conditionFunc, bodyFunc, async) {
      var me = this;
      this.async(function () {
          if (conditionFunc()) bodyFunc();
          else {
            w_setTimeout(function () {
              me.wait(conditionFunc, bodyFunc);
            }, 10);
          }
        },
        async);
    };
  });


  // Classes
  var IDBVersionChangeEvent = window.IDBVersionChangeEvent = indexedDB.util.IDBVersionChangeEvent =
    function (type, target, oldVersion, newVersion) {
      this.type = type;
      this.target = this.currentTarget = target;
      this.oldVersion = oldVersion;
      this.newVersion = newVersion;
    };

  var IDBDatabaseException = window.IDBDatabaseException = indexedDB.util.IDBDatabaseException =
  {
    ABORT_ERR : 8,
    CONSTRAINT_ERR : 4,
    DATA_ERR : 5,
    NON_TRANSIENT_ERR : 2,
    NOT_ALLOWED_ERR : 6,
    NOT_FOUND_ERR : 3,
    QUOTA_ERR : 11,
    READ_ONLY_ERR : 9,
    TIMEOUT_ERR : 10,
    TRANSACTION_INACTIVE_ERR : 7,
    UNKNOWN_ERR : 1,
    VERSION_ERR : 12
  };


  // Cached
  var w_setTimeout = window.setTimeout;

}(window));
