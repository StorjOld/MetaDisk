if (window.indexedDB.polyfill)
(function(window, indexedDB, util, undefined)
{
	var IDBCursor = util.IDBCursor = window.IDBCursor = function (source, direction, request)
	{
		this.source = source;
		this.direction = direction || IDBCursor.NEXT;
		this.key = null;
		this.primaryKey = null; // position, effective key

		this._request = request;
		this._range = null;
		this._gotValue = true;
		this._objectStorePosition = null; // used for indexes
	};

	IDBCursor.prototype.update = function (value)
	{

	};

	IDBCursor.prototype.advance = function (count)
	{

	};

	IDBCursor.prototype.continue = function (key)
	{
		if (!this._gotValue) throw util.exception("InvalidStateError");

		var range = this._range;
		var filter = util.IDBKeyRange.bound(range.lower, range.upper, range.lowerOpen, range.upperOpen);
		if (key)
		{
			if (isAsc(this))
			{
				if (key <= this.primaryKey) throw util.exception("DataError");
				filter.lower = key;
				filter.lowerOpen = false;
			}
			else
			{
				if (key >= this.primaryKey) throw util.exception("DataError");
				filter.upper = key;
				filter.upperOpen = false;
			}
		}
		else if (this.primaryKey)
		{
			if (isAsc(this))
			{
				filter.lower = this.primaryKey;
				filter.lowerOpen = true;
			}
			else
			{
				filter.upper = this.primaryKey;
				filter.upperOpen = true;
			}
		}
		iterateCursor(this, filter);
		this._gotValue = false;
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
			var sql = ["SELECT key, value FROM \"" + me.source.name + "\" WHERE (0 = 0)"];
			var args = [];
			if (filter.lower)
			{
				sql.push("AND (key >" + (filter.lowerOpen ? "" : "="), "?)");
				args.push(w_JSON.stringify(filter.lower));
			}
			if (filter.upper)
			{
				sql.push("AND (key <" + (filter.upperOpen ? "" : "="), "?)");
				args.push(w_JSON.stringify(filter.upper));
			}

			sql.push("ORDER BY key");
			if (!isAsc(me)) sql.push("DESC");
			sql.push("LIMIT 1");

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
						var found = found = results.rows.item(0);
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
					var request = m._request;
					request.error = sqlError;
					if (request.onerror) request.onerror(util.event("error", request));
					nextRequestCallback();
				});
		});
	}

	// Utils
	var w_JSON = window.JSON;

	function isAsc(cursor)
	{
		return [IDBCursor.NEXT, IDBCursor.NEXT_NO_DUPLICATE].indexOf(cursor.direction) >= 0;
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
