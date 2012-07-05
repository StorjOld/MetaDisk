if (window.indexedDB.polyfill)
(function(window, indexedDB, util, undefined)
{
	var IDBCursor = util.IDBCursor = window.IDBCursor = function (source, direction, request)
	{
		this.source = source;
		this.direction = direction || IDBCursor.NEXT;
		this.key = null;        // position
		this.primaryKey = null; // effective key, object store position

		this._request = request;
		this._range = null;
		this._gotValue = true;
	};

	IDBCursor.prototype.update = function (value)
	{

	};

	IDBCursor.prototype.advance = function (count)
	{

	};

	IDBCursor.prototype.continue = function (key)
	{
		if (!this._gotValue) throw util.error("InvalidStateError");
		this._gotValue = false;

		var range = this._range;
		var filter = util.IDBKeyRange.bound(range.lower, range.upper, range.lowerOpen, range.upperOpen);
		var isIndex = this.source instanceof util.IDBIndex;
		var position = this.key;
		var noDuplicate = [IDBCursor.PREV_NO_DUPLICATE, IDBCursor.NEXT_NO_DUPLICATE].indexOf(this.direction) >= 0;
		if (key != null)
		{
			if (isDesc(this))
			{
				if ((isIndex && key > position) || key >= position) throw util.error("DataError");
				filter.upper = key;
				filter.upperOpen = false;
			}
			else
			{
				if ((isIndex && key < position) || key <= position) throw util.error("DataError");
				filter.lower = key;
				filter.lowerOpen = false;
			}
		}
		else if (position != null)
		{
			var open = !isIndex || noDuplicate;
			if (isDesc(this))
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
		if (isIndex)
		{
			iterateIndexCursor(this, filter);
		}
		else
		{
			iterateCursor(this, filter);
		}
	};

	IDBCursor.prototype.delete = function ()
	{

	};

	// Internal methods
	function iterateCursor(me, filter)
	{
		var tx = me.source.transaction;
		me._request.readyState = util.IDBRequest.LOADING;
		tx._enqueueRequest(function (sqlTx, nextRequestCallback)
		{
			var sql = ["SELECT key, value FROM [" + me.source.name + "]"];
			var where = [];
			var args = [];
			if (filter.lower)
			{
				where.push("(key >" + (filter.lowerOpen ? "" : "=") + " ?)");
				args.push(w_JSON.stringify(filter.lower));
			}
			if (filter.upper)
			{
				where.push("(key <" + (filter.upperOpen ? "" : "=") + " ?)");
				args.push(w_JSON.stringify(filter.upper));
			}
			if (where.length > 0)
			{
				sql.push("WHERE", where.join(" AND "))
			}
			sql.push("ORDER BY key" + (isDesc(me) ? " DESC" : ""), "LIMIT 1");

			sqlTx.executeSql(sql.join(" "), args,
				function (tx, results)
				{
					var request = me._request;
					request.readyState = util.IDBRequest.DONE;
					if (results.rows.length == 0)
					{
						me.key = me.primaryKey = undefined;
						if (typeof me.value !== "undefined") me.value = undefined;
						request.result = null;
					}
					else
					{
						var found = results.rows.item(0);
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
			var where = [], args = [], strPrimaryKey = null;
			if (filter.lower)
			{
				var strLower = w_JSON.stringify(filter.lower);
				args.push(strLower);
				if (filter.lowerOpen)
				{
					where.push("(i.key > ?)");
				}
				else
				{
					if (me.primaryKey == null || desc)
					{
						where.push("(i.key >= ?)");
					}
					else
					{
						where.push("((i.key > ?) OR (i.key = ? AND i.primaryKey > ?))");
						strPrimaryKey = w_JSON.stringify(me.primaryKey);
						args.push(strLower, strPrimaryKey);
					}
				}
			}
			if (filter.upper)
			{
				var strUpper = w_JSON.stringify(filter.upper);
				args.push(strUpper);
				if (filter.upperOpen)
				{
					where.push("(i.key < ?)");
				}
				else
				{
					if (me.primaryKey == null || !desc)
					{
						where.push("(i.key <= ?)");
					}
					else
					{
						where.push("((i.key < ?) OR (i.key = ? AND i.primaryKey < ?))");
						args.push(strUpper, strPrimaryKey || w_JSON.stringify(me.primaryKey));
					}
				}
			}
			if (where.length > 0)
			{
				sql.push("WHERE", where.join(" AND "))
			}
			var sDesc = desc ? " DESC" : "";
			sql.push("ORDER BY i.key" + sDesc + ", i.primaryKey" + sDesc + " LIMIT 1");

			sqlTx.executeSql(sql.join(" "), args,
				function (tx, results)
				{
					var request = me._request;
					request.readyState = util.IDBRequest.DONE;
					if (results.rows.length == 0)
					{
						me.key = me.primaryKey = undefined;
						if (typeof me.value !== "undefined") me.value = undefined;
						request.result = null;
					}
					else
					{
						var found = results.rows.item(0);
						me.key = w_JSON.parse(found.key);
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
