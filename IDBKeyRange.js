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
    var IDBKeyRange = util.IDBKeyRange = window.IDBKeyRange = function (lower, upper, lowerOpen, upperOpen) {
      this.lower = lower;
      this.upper = upper;
      this.lowerOpen = lowerOpen || false;
      this.upperOpen = upperOpen || false;
    };

    IDBKeyRange.only = function (value) {
      return new IDBKeyRange(value, value, false, false)
    };

    IDBKeyRange.lowerBound = function (lower, open) {
      return new IDBKeyRange(lower, undefined, open || false, true);
    };

    IDBKeyRange.upperBound = function (upper, open) {
      return new IDBKeyRange(undefined, upper, true, open || false);
    };

    IDBKeyRange.bound = function (lower, upper, lowerOpen, upperOpen) {
      return new IDBKeyRange(lower, upper, lowerOpen || false, upperOpen || false);
    };

    IDBKeyRange._ensureKeyRange = function (arg) {
      if (arg == null) {
        return util.IDBKeyRange.bound();
      }
      if ((arg instanceof util.IDBKeyRange)) {
        return arg;
      }
      return util.IDBKeyRange.only(arg);
    };

    IDBKeyRange._clone = function (range) {
      return util.IDBKeyRange.bound(range.lower, range.upper, range.lowerOpen, range.upperOpen);
    };

    IDBKeyRange.prototype._getSqlFilter = function (keyColumnName) {
      if (keyColumnName == undefined) keyColumnName = "key";
      var sql = [], hasLower = this.lower != null, hasUpper = this.upper != null;
      if (this.lower == this.upper) {
        sql.push("(" + keyColumnName + " = X'" + util.encodeKey(this.lower) + "')");
      }
      else {
        if (hasLower) {
          sql.push("(X'" + util.encodeKey(this.lower) + "' <" +
            (this.lowerOpen ? "" : "=") + " " + keyColumnName + ")");
        }
        if (hasUpper) {
          sql.push("(" + keyColumnName + " <" +
            (this.upperOpen ? "" : "=") + " X'" + util.encodeKey(this.upper) + "')");
        }
      }
      return sql.join(" AND ");
    };

  }(window, window.indexedDB.util));
