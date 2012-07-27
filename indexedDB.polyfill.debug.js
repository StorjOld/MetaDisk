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

(function () {
  // NOTE: If the path is not indicated then use relative path "/git"
  if (typeof INDEXEDDB_POLYFILL_DEBUG_SOURCE_PATH === "undefined") {
    INDEXEDDB_POLYFILL_DEBUG_SOURCE_PATH = "/git/";
  }

  var files = [
    "lib/jquery-1.7.2.js",
    "indexedDB.init.js",
    "webSql.js",
    "key.js",
    "IDBRequest.js",
    "IDBFactory.js",
    "IDBDatabase.js",
    "IDBTransaction.js",
    "IDBObjectStore.js",
    "IDBCursor.js",
    "IDBKeyRange.js",
    "IDBIndex.js"
  ];

  function loadScript(source) {
    var s = document.createElement('script');
    s.type = 'text/javascript';
    s.async = false;
    s.src = typeof INDEXEDDB_POLYFILL_DEBUG_SOURCE_PATH === "undefined" ? source :
      INDEXEDDB_POLYFILL_DEBUG_SOURCE_PATH + source;

    var x = document.getElementsByTagName('script')[0];
    x.parentNode.insertBefore(s, x);
  }

  if (!(/Firefox[\/\s](\d+\.\d+)/.test(navigator.userAgent))) {
    window.indexedDB = { polyfill : true };
  }
  for (var i = 1; i < files.length; i++) {
    loadScript(files[i]);
  }
}());
