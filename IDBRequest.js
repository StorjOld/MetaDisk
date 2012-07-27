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
    var IDBRequest = util.IDBRequest = window.IDBRequest = function (source) {
      this.result = undefined;
      this.error = null;
      this.source = source;
      this.transaction = null;
      this.readyState = util.IDBRequest.LOADING;
      this.onsuccess = null;
      this.onerror = null;
    };
    IDBRequest.LOADING = "pending";
    IDBRequest.DONE = "done";

    var IDBOpenDBRequest = util.IDBOpenDBRequest = window.IDBOpenDBRequest = function (source) {
      IDBRequest.apply(this, arguments);
      this.onblocked = null;
      this.onupgradeneeded = null;
    };
    IDBOpenDBRequest.prototype = new IDBRequest();
    IDBOpenDBRequest.prototype.constructor = IDBOpenDBRequest;

  }(window, window.indexedDB.util));
