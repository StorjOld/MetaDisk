if (window.indexedDB.polyfill)
(function(window, indexedDB, util, undefined)
{
	var IDBCursor = util.IDBCursor = window.IDBCursor = function (source, direction, request)
	{
		this.source = source;
		this.direction = direction || IDBCursor.NEXT;
		this.key = null;        // position
		this.primaryKey = null; // effective key

		this._request = request;
		this._range = null;
		this._gotValue = true;
		this._effectiveKey = null;
	};

	IDBCursor.prototype.update = function (value)
	{
		var objectStore = getObjectStore(this);
		IDBTransaction._assertNotReadOnly(objectStore.transaction);
		if (!(this instanceof util.IDBCursorWithValue) || !this._gotValue) throw util.error("InvalidStateError");
		if (objectStore.keyPath != null)
		{
			var key = util.extractKeyFromValue(objectStore.keyPath, value);
			if (key != this.primaryKey) throw util.error("DataError");
		}
		var request = new util.IDBRequest(this);
		var me = this;
		objectStore.transaction._enqueueRequest(function (sqlTx, nextRequestCallback)
		{
			objectStore._insertOrReplaceRecord(
			{
				request : request,
				sqlTx : sqlTx,
				nextRequestCallback : nextRequestCallback,
				noOverwrite : false,
				value : value
			},
			me._effectiveKey);
		});
		return request;
	};

	IDBCursor.prototype.advance = function (count)
	{
		count = parseInt(count);
		if (isNaN(count) || count <= 0) throw util.error("TypeError");

		advanceOrContinue(this, count, null);
	};

	IDBCursor.prototype.continue = function (key)
	{
		advanceOrContinue(this, 1, key);
	};

	IDBCursor.prototype.delete = function ()
	{
		var objectStore = getObjectStore(this);
		IDBTransaction._assertNotReadOnly(objectStore.transaction);
		if (!(this instanceof util.IDBCursorWithValue) || !this._gotValue) throw util.error("InvalidStateError");

		var request = new util.IDBRequest(this);
		var me = this;
		objectStore.transaction._enqueueRequest(function (sqlTx, nextRequestCallback)
		{
			objectStore._deleteRecord(sqlTx, me._effectiveKey,
				function ()
				{
					if (request.onsuccess) request.onsuccess(util.event("success", request));
					nextRequestCallback();
				},
				function (_, sqlError)
				{
					request.error = sqlError;
					if (request.onerror) request.onerror(util.event("error", request));
					nextRequestCallback();
				});
		});
		return request;
	};

	// Internal methods
	function advanceOrContinue(me, count, key)
	{
		if (!me._gotValue) throw util.error("InvalidStateError");
		me._gotValue = false;

		var filter = util.IDBKeyRange._clone(me._range);
		filter.count = count;
		var isSourceIndex = me.source instanceof util.IDBIndex;
		var position = me.key;
		var noDuplicate = [IDBCursor.PREV_NO_DUPLICATE, IDBCursor.NEXT_NO_DUPLICATE].indexOf(me.direction) >= 0;
		if (key != null)
		{
			if (isDesc(me))
			{
				if ((isSourceIndex && key > position) || key >= position) throw util.error("DataError");
				filter.upper = key;
				filter.upperOpen = false;
			}
			else
			{
				if ((isSourceIndex && key < position) || key <= position) throw util.error("DataError");
				filter.lower = key;
				filter.lowerOpen = false;
			}
		}
		else if (position != null)
		{
			var open = !isSourceIndex || noDuplicate;
			if (isDesc(me))
			{
				filter.upper = position;
				filter.upperOpen = open;
			}
			else
			{
				filter.lower = position;
				filter.lowerOpen = open;
			}
		}
		if (isSourceIndex) iterateIndexCursor(me, filter);
		else iterateCursor(me, filter);
	}

	function iterateCursor(me, filter)
	{
		var tx = me.source.transaction;
		me._request.readyState = util.IDBRequest.LOADING;
		tx._enqueueRequest(function (sqlTx, nextRequestCallback)
		{
			var sql = ["SELECT key, value FROM [" + me.source.name + "]"];
			var where = [];
			var args = [];
			if (filter.lower != null)
			{
				where.push("(key >" + (filter.lowerOpen ? "" : "=") + " ?)");
				args.push(w_JSON.stringify(filter.lower));
			}
			if (filter.upper != null)
			{
				where.push("(key <" + (filter.upperOpen ? "" : "=") + " ?)");
				args.push(w_JSON.stringify(filter.upper));
			}
			if (where.length > 0)
			{
				sql.push("WHERE", where.join(" AND "))
			}
			sql.push("ORDER BY key" + (isDesc(me) ? " DESC" : ""));
			sql.push("LIMIT", filter.count);

			sqlTx.executeSql(sql.join(" "), args,
				function (tx, results)
				{
					var request = me._request;
					request.readyState = util.IDBRequest.DONE;
					if (results.rows.length < filter.count)
					{
						me.key = me.primaryKey = me._effectiveKey = undefined;
						if (typeof me.value !== "undefined") me.value = undefined;
						request.result = null;
					}
					else
					{
						var found = results.rows.item(filter.count - 1);
						me._effectiveKey = found.key;
						me.key = me.primaryKey = w_JSON.parse(found.key);
						if (typeof me.value !== "undefined") me.value = w_JSON.parse(found.value);
						me._gotValue = true;
						request.result = me;
					}
					if (request.onsuccess) request.onsuccess(util.event("success", request));
					nextRequestCallback();
				},
				function (tx, sqlError)
				{
					var request = me._request;
					request.error = sqlError;
					if (request.onerror) request.onerror(util.event("error", request));
					nextRequestCallback();
				});
		});
	}

	function iterateIndexCursor(me, filter)
	{
		var tx = me.source.objectStore.transaction;
		me._request.readyState = util.IDBRequest.LOADING;
		tx._enqueueRequest(function (sqlTx, nextRequestCallback)
		{
			var withValue = me instanceof IDBCursorWithValue;
			var desc = isDesc(me);
			var objectStoreName = me.source.objectStore.name;
			var tableName = util.indexTable(objectStoreName, me.source.name);
			var sql = ["SELECT i.key, i.primaryKey" + (withValue ? ", t.value" : ""),
				"FROM [" + tableName + "] as i"];

			if (withValue)
			{
				sql.push("LEFT JOIN [" + objectStoreName + "] as t ON t.Id = i.recordId");
			}
			var where = [], args = [];
			if (filter.lower != null)
			{
				var strLower = w_JSON.stringify(filter.lower);
				args.push(strLower);
				if (filter.lowerOpen)
				{
					where.push("(i.key > ?)");
				}
				else
				{
					if (me._effectiveKey == null || desc)
					{
						where.push("(i.key >= ?)");
					}
					else
					{
						where.push("((i.key > ?) OR (i.key = ? AND i.primaryKey > ?))");
						args.push(strLower, me._effectiveKey);
					}
				}
			}
			if (filter.upper != null)
			{
				var strUpper = w_JSON.stringify(filter.upper);
				args.push(strUpper);
				if (filter.upperOpen)
				{
					where.push("(i.key < ?)");
				}
				else
				{
					if (me._effectiveKey == null || !desc)
					{
						where.push("(i.key <= ?)");
					}
					else
					{
						where.push("((i.key < ?) OR (i.key = ? AND i.primaryKey < ?))");
						args.push(strUpper, me._effectiveKey);
					}
				}
			}
			if (where.length > 0)
			{
				sql.push("WHERE", where.join(" AND "))
			}
			var sDesc = desc ? " DESC" : "";
			sql.push("ORDER BY i.key" + sDesc + ", i.primaryKey" + sDesc);
			sql.push("LIMIT", filter.count);

			sqlTx.executeSql(sql.join(" "), args,
				function (tx, results)
				{
					var request = me._request;
					request.readyState = util.IDBRequest.DONE;
					if (results.rows.length < filter.count)
					{
						me.key = me.primaryKey = me._effectiveKey = undefined;
						if (typeof me.value !== "undefined") me.value = undefined;
						request.result = null;
					}
					else
					{
						var found = results.rows.item(filter.count - 1);
						me.key = w_JSON.parse(found.key);
						me._effectiveKey = found.primaryKey;
						me.primaryKey = w_JSON.parse(found.primaryKey);
						if (typeof me.value !== "undefined") me.value = w_JSON.parse(found.value);
						me._gotValue = true;
						request.result = me;
					}
					if (request.onsuccess) request.onsuccess(util.event("success", request));
					nextRequestCallback();
				},
				function (tx, sqlError)
				{
					var request = me._request;
					request.error = sqlError;
					if (request.onerror) request.onerror(util.event("error", request));
					nextRequestCallback();
				});
		});
	}

	// Utils
	var w_JSON = window.JSON;

	function isDesc(cursor)
	{
		return [IDBCursor.PREV, IDBCursor.PREV_NO_DUPLICATE].indexOf(cursor.direction) >= 0;
	}

	function getObjectStore(cursor)
	{
		if (cursor.source instanceof util.IDBObjectStore)
		{
			return cursor.source;
		}
		else if (cursor.source instanceof util.IDBIndex)
		{
			return cursor.source.objectStore;
		}
		return null;
	}

	IDBCursor.NEXT = "next";
	IDBCursor.NEXT_NO_DUPLICATE = "nextunique";
	IDBCursor.PREV = "prev";
	IDBCursor.PREV_NO_DUPLICATE = "prevunique";

	var IDBCursorWithValue = function (source, direction, request)
	{
		IDBCursor.apply(this, arguments);
		this.value = null;
	};
	IDBCursorWithValue.prototype = new IDBCursor();
	IDBCursorWithValue.prototype.constructor = IDBCursorWithValue;
	util.IDBCursorWithValue = window.IDBCursorWithValue = IDBCursorWithValue;

}(window, window.indexedDB, window.indexedDB.util));
