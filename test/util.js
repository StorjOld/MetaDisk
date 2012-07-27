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

var util = new (function () {
  this.deleteDBPromise = function (name) {
    var deferred = $.Deferred();
    var request = indexedDB.deleteDatabase(name);
    request.onsuccess = function (e) {
      console.debug("Init. Database '" + name + "' has been deleted successfully.");
      deferred.resolve(e);
    };
    var fn = function (e) {
      console.error("Init. Database '" + name + "'  deletion failed.", e);
      deferred.reject(e);
    };
    request.onupgradeneeded = fn;
    request.onerror = fn;
    request.onblocked = fn;
    return deferred.promise();
  };

  this.initDBPromise = function (name, version, upgradeCallback) {
    var deferred = $.Deferred();
    var deletePromise = util.deleteDBPromise(name);
    deletePromise.done(function (e) {
      var isNew = false;
      var request = indexedDB.open(name, version);
      request.onupgradeneeded = function (e) {
        console.debug("Init. Database '" + name + "' has been created successfully.");
        isNew = true;
        try {
          if (upgradeCallback) upgradeCallback(e.target.result);
        }
        catch (ex) {
          deferred.reject(ex);
        }
      };
      request.onsuccess = function (e) {
        e.target.result.close();
        if (isNew) deferred.resolve(e);
        else deferred.reject(e);
      };
      request.onerror = deferred.reject;
      request.onblocked = deferred.reject;
    });
    deletePromise.fail(deferred.reject);
    return deferred.promise();
  };

  this.shouldNotReachHereCallback = function (e) {
    console.error("Should not reach here. ", e);
    ok(false, "Should not reach here.");
    e.target.result && e.target.result.close && e.target.result.close();
    start();
  };

  // Extend environment
  Array.prototype.contains = function (item) {
    return this.indexOf(item) >= 0;
  };

  // Chrome indexedDB detection
  this.chromeIndexedDB = (function () {
    return (/chrome/.test(navigator.userAgent.toLowerCase())) && (webkitIDBDatabase != null);
  }());

  // C#-like String.format
  String.prototype.format = function () {
    var s = this;
    for (var i = 0; i < arguments.length; i++) {
      var reg = new RegExp("\\{" + i + "\\}", "gm");
      s = s.replace(reg, arguments[i]);
    }
    return s;
  };

  // Randomization
  var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
  this.randomStr = function (lower, notGreaterThan) {
    var length = Math.floor(Math.random() * (notGreaterThan - lower)) + lower;
    var result = '';
    for (var i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  };

  this.randomInt = function (lower, notGreaterThan) {
    return Math.floor(Math.random() * (notGreaterThan - lower)) + lower;
  }
});
