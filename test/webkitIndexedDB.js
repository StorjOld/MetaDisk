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

/**
 * Polyfill for Chrome 19 (and probably previous versions) to support latest IndexedDB API.
 * 1. Support for onupgradeneeded event;
 * 2. IDBObjectStore.openCursor key as range support;
 */

(function (indexedDB, window, undefined) {

  if (!indexedDB || !webkitIDBDatabase ||
    typeof webkitIDBDatabase.prototype.setVersion !== "function") return;

  var originalOpen = indexedDB.open;
  indexedDB.open = function (name, version) {
    if (version !== undefined) {
      version = w_parseInt(version);
      if (isNaN(version) || version <= 0) throw new window.Error("Invalid version");
    }

    var request =
    {
      result : null,
      onupgradeneeded : null,
      onsuccess : null,
      onerror : null,
      onblocked : null
    };

    var originalRequest = originalOpen.call(indexedDB, name);
    originalRequest.onerror = function (e) { if (request.onerror) request.onerror(e); };
    originalRequest.onsuccess = function (e) {
      var db = e.target.result;
      var dbVersion = db.version == "" ? 0 : w_parseInt(db.version);
      if (version === undefined) version = dbVersion === 0 ? 1 : dbVersion;

      if (dbVersion > version) {
        db.close();
        if (request.onerror) request.onerror(
          {
            type : "error",
            target : request,
            currentTarget : request,
            preventDefault : function () { }
          });
        return;
      }
      if (dbVersion == version) {
        request.result = db;
        if (request.onsuccess) request.onsuccess(e);
        return;
      }

      var versionRequest = db.setVersion(version);
      versionRequest.onsuccess = function (e2) {
        request.result = db;
        request.transaction = e2.target.transaction;
        if (request.onupgradeneeded) request.onupgradeneeded(
          {
            type : "onupgradeneeded",
            target : request,
            currentTarget : request,
            oldVersion : dbVersion,
            newVersion : version
          });

        w_setTimeout(function () {
          if (request.onsuccess) request.onsuccess(e);
        }, 0);
      };
      versionRequest.onblocked = function (e) {
        if (request.onblocked) request.onblocked(e);
      };
      versionRequest.onerror = request.onerror;
    };
    return request;
  };

  var origOpenCursor = webkitIDBObjectStore.prototype.openCursor;
  webkitIDBObjectStore.prototype.openCursor = function (range, direction) {
    range = range || null;
    direction = direction || null;
    if (!(range instanceof w_IDBKeyRange) && range != null) {
      range = w_IDBKeyRange.only(range);
    }
    return direction == null ? origOpenCursor.call(this, range) : origOpenCursor.call(this, range, direction);
  };


  // Cached
  var w_setTimeout = window.setTimeout;
  var w_IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange;
  var w_parseInt = window.parseInt;

}(window.webkitIndexedDB, window));
