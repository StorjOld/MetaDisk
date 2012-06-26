if (window.indexedDB.polyfill)
(function (window, indexedDB, util, undefined)
{
	var IDBObjectStore = util.IDBObjectStore = window.IDBObjectStore = function (name, keyPath, autoIncrement, tx)
	{
		this.name = name;
		this.keyPath = keyPath;
		this.indexNames = new indexedDB.DOMStringList();
		this.transaction = tx;
		this.autoIncrement = autoIncrement == true;
	};

	IDBObjectStore.prototype.put = function (value, key)
	{
		return storeRecord(this, value, key, false);
	};

	IDBObjectStore.prototype.add = function (value, key)
	{
		return storeRecord(this, value, key, true);
	};

	//region add & put helper functions
	function storeRecord(me, value, key, noOverwrite)
	{
		assertReadOnly(me.transaction);

		var validation = validateKey(me, value, key);
		var key = validation.key, strKey = validation.str;

		var request = new util.IDBRequest();
		request.readyState = util.IDBRequest.LOADING;
		request.source = me;
		me.transaction._enqueueRequest(function (sqlTx, nextRequestCallback)
		{
			runStepsForStoringRecord(request, sqlTx, nextRequestCallback, noOverwrite, value, key, strKey);
		});
		return request;
	}

	function validateKey(me, value, key)
	{
		var key = key, str;
		if (me.keyPath != null)
		{
			if (key != null) throw util.error("DataError");

			key = extractKeyFromValue(value, me.keyPath);
		}
		if (key == null)
		{
			if (!me.autoIncrement) throw util.error("DataError");
		}
		else
		{
			// NOTE: key validation
			str = w_JSON.stringify(key);
			if (typeof key == "boolean") throw util.error("DataError");

			if ((/[,[]{.*?}[,\]]/).test(str) ||
				(/^{.*?}$/).test(str) ||
				(/[,[](true|false)[,\]]/).test(str)) throw util.error("DataError");
		}
		return { key : key, str : str };
	}

	function extractKeyFromValue(value, keyPath)
	{
		var key;
		if (keyPath instanceof Array)
		{
			key = [];
			for (var i = 0; i < keyPath.length; i++)
			{
				key.push(extractKeyFromValue(value, keyPath[i]));
			}
		}
		else
		{
			if (keyPath === "") return value;

			key = value;
			var paths = keyPath.split(".");
			for (var i = 0; i < paths.length; i++)
			{
				if (key == null) return null;
				key = key[paths[i]];
			}
		}
		return key;
	}


	function runStepsForStoringRecord(request, sqlTx, nextRequestCallback, noOverwrite, value, key, strKey)
	{
		var me = request.source;
		request.readyState = util.IDBRequest.DONE;
		if (me.autoIncrement && (key == null || isPositiveFloat(key)))
		{
			sqlTx.executeSql("SELECT currentNo FROM " + indexedDB.SCHEMA_TABLE +
				" WHERE type='table' AND name = ?", [me.name],
				function (sqlTx, resultSet)
				{
					if (resultSet.rows.length != 1)
					{
						// error
					}
					var currentNo = resultSet.rows.item(0).currentNo;
					if (key == null)
					{
						key = currentNo;
						strKey = key.toString();
						if (me.keyPath != null)
						{
							assignKeyToValue(value, me.keyPath, key);
						}
					}
					if (key >= currentNo)
					{
						incrementCurrentNumber(sqlTx, me.name, Math.floor(key + 1));
					}
					sqlInsertKeyValue(request, sqlTx, nextRequestCallback, noOverwrite, strKey, value);
				},
				function (tx, sqlError)
				{
					// error
				});
		}
		else
		{
			sqlInsertKeyValue(request, sqlTx, nextRequestCallback, noOverwrite, strKey, value);
		}
	}

	function incrementCurrentNumber(sqlTx, tableName, currentNo)
	{
		sqlTx.executeSql("UPDATE " + indexedDB.SCHEMA_TABLE + " SET currentNo = ? " +
			"WHERE type='table' AND name = ?", [currentNo, tableName],
			function (sqlTx, resultSet)
			{
				if (resultSet.rowsAffected != 1)
				{
					// TODO: error
				}
			},
			function (tx, sqlError)
			{
				// TODO: error
			});
	}

	function sqlInsertKeyValue(request, sqlTx, nextRequestCallback, noOverwrite, strKey, value)
	{
		var tableName = request.source.name;
		var sql = (noOverwrite ? "INSERT" : "REPLACE") + " INTO \"" + tableName + "\" (key, value) VALUES (?, ?)";
		var strValue = w_JSON.stringify(value);
		sqlTx.executeSql(sql, [strKey, strValue],
			function (tx, resultSet)
			{
				if (request.onsuccess) request.onsuccess(util.event("success", request));
				nextRequestCallback();
			},
			function (tx, sqlError)
			{
				request.error = sqlError;
				if (request.onerror) request.onerror(util.event("error", request));
				nextRequestCallback();
			});
	}

	function assignKeyToValue(value, keyPath, key)
	{
		if (!(value instanceof Object) && !(value instanceof Array)) throw util.error("DataError");

		var path = keyPath.split(".");
		var attr = null;
		for (var i = 0; i < path.length - 1; i++)
		{
			attr = path[i];
			if (value[attr] == null) value[attr] = { };
			value = value[attr];
		}
		value[path[path.length - 1]] = key;

	}
	//endregion

	IDBObjectStore.prototype.delete = function (key)
	{
		assertReadOnly(this.transaction);

		var request = new util.IDBRequest();
		request.source = this;
		var me = this;
		this.transaction._enqueueRequest(function (sqlTx, nextRequestCallback)
		{
			var strKey = w_JSON.stringify(key);
			sqlTx.executeSql("DELETE FROM \"" + me.name + "\" WHERE key = ?", [strKey],
				function (tx, resultSet)
				{
					if (request.onsuccess) request.onsuccess(util.event("success", request));
					nextRequestCallback();
				},
				function (tx, sqlError)
				{
					if (request.onerror) request.onerror(sqlError);
					nextRequestCallback();
				});
		});
		return request;
	};

	IDBObjectStore.prototype.get = function (key)
	{
		var request = new util.IDBRequest();
		var me = this;
		request.source = me;
		me.transaction._enqueueRequest(function (sqlTx, nextRequestCallback)
		{
			var strKey = w_JSON.stringify(key);
			sqlTx.executeSql("SELECT value FROM \"" + me.name + "\" WHERE key = ?", [strKey],
				function (tx, resultSet)
				{
					if (resultSet.rows.length > 0)
					{
						var strValue = resultSet.rows.item(0).value;
						request.result = w_JSON.parse(strValue);
					}
					if (request.onsuccess) request.onsuccess(util.event("success", request));
					nextRequestCallback();
				},
				function (tx, sqlError)
				{
					request.error = sqlError;
					if (request.onerror) request.onerror(util.event("error", request));
					nextRequestCallback();
				});
		});
		return request;
	};

	IDBObjectStore.prototype.clear = function ()
	{
	};

	IDBObjectStore.prototype.openCursor = function (range, direction)
	{
		var request = new util.IDBRequest(this);
		request.readyState = util.IDBRequest.LOADING;
		var cursor = new util.IDBCursorWithValue(this, direction, request);

		if (range == null)
		{
			range = util.IDBKeyRange.bound();
		}
		else if (!(range instanceof util.IDBKeyRange))
		{
			range = util.IDBKeyRange.only(range);
		}
		cursor._range = range;
		cursor.continue();
		return request;
	};

	IDBObjectStore.prototype.createIndex = function (name, keyPath, optionalParameters)
	{
	};

	IDBObjectStore.prototype.index = function (name)
	{
	};

	IDBObjectStore.prototype.deleteIndex = function (indexName)
	{
	};

	IDBObjectStore.prototype.count = function (key)
	{
	};

	// Utils
	var w_JSON = window.JSON;

	function assertReadOnly(tx)
	{
		if (tx.mode === util.IDBTransaction.READ_ONLY)
		{
			throw util.error("ReadOnlyError", "A mutation operation was attempted in a READ_ONLY transaction.");
		}
	}

	function isPositiveFloat(value)
	{
		return typeof value == "number" && value > 0;
	}

}(window, window.indexedDB, window.indexedDB.util));
