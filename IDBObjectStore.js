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

		this._metaId = null;
		this._indexes = { };
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
		util.IDBTransaction._assertNotReadOnly(me.transaction);
		var validation = validateObjectStoreKey(me.keyPath, me.autoIncrement, value, key);
		var key = validation.key, strKey = validation.str;

		var request = new util.IDBRequest(me);
		me.transaction._enqueueRequest(function (sqlTx, nextRequestCallback)
		{
			var context = {
				request : request,
				sqlTx : sqlTx,
				nextRequestCallback : nextRequestCallback,
				noOverwrite : noOverwrite,
				value : value
			};
			runStepsForStoringRecord(context, key, strKey);
		});
		return request;
	}

	function validateObjectStoreKey(keyPath, autoIncrement, value, key)
	{
		var key = key, str;
		if (keyPath != null)
		{
			if (key != null) throw util.error("DataError");

			key = util.extractKeyFromValue(keyPath, value);
		}
		if (key == null)
		{
			if (!autoIncrement) throw util.error("DataError");
		}
		else
		{
			str = w_JSON.stringify(key);
			if (util.notValidKey(str)) throw util.error("DataError");
		}
		return { key : key, str : str };
	}

	function runStepsForStoringRecord(context, key, strKey)
	{
		var request = context.request;
		var me = request.source;
		request.readyState = util.IDBRequest.DONE;
		if (me.autoIncrement && (key == null || isPositiveFloat(key)))
		{
			context.sqlTx.executeSql("SELECT currentNo FROM " + indexedDB.SCHEMA_TABLE +
				" WHERE type='table' AND name = ?", [me.name],
				function (sqlTx, results)
				{
					if (results.rows.length != 1)
					{
						// error
					}
					var currentNo = results.rows.item(0).currentNo;
					if (key == null)
					{
						key = currentNo;
						strKey = key.toString();
						if (me.keyPath != null)
						{
							assignKeyToValue(context.value, me.keyPath, key);
						}
					}
					if (key >= currentNo)
					{
						incrementCurrentNumber(sqlTx, me.name, Math.floor(key + 1));
					}
					context.sqlTx = sqlTx;
					me._insertOrReplaceRecord(context, strKey);
				},
				function (_, sqlError)
				{
					request.error = sqlError;
					if (request.onerror) request.onerror(util.event("error", request));
					context.nextRequestCallback();
				});
		}
		else
		{
			me._insertOrReplaceRecord(context, strKey);
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
			function (sqlTx, sqlError)
			{
				// TODO: error
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

	function storeIndexes(context)
	{
		var request = context.request;
		var me = context.objectStore;
		var indexes = [], strKeys = [];
		for (var indexName in me._indexes)
		{
			var index = me._indexes[indexName];
			if (!index._ready) continue;

			var strKey = getValidIndexKeyString(index, context.value);
			if (strKey == null) continue;

			strKeys.push(strKey);
			indexes.push(index);
		}

		if (indexes.length == 0)
		{
			if (request.onsuccess) request.onsuccess(util.event("success", request));
			context.nextRequestCallback();
		}
		else
		{
			var lastIndex = indexes.length - 1;
			for (var i = 0; i < indexes.length; i++)
			{
				storeIndex(context, indexes[i], strKeys[i], i == lastIndex);
			}
		}
	}

	function getValidIndexKeyString(index, value)
	{
		var key = util.extractKeyFromValue(index.keyPath, value);
		if (key == null) return null;

		if (key instanceof Array)
		{
			if (key.length == 0) return null;
		}
		if (util.notValidKey(w_JSON.stringify(key))) return null;

		if (index.multiEntry && (key instanceof Array))
		{
			// clean-up
			var tmp = [], str;
			for (var i = 0; i < key.length; i++)
			{
				str = w_JSON.stringify(key[i]);
				if (tmp.indexOf(str) >= 0 || util.notValidKey(str)) continue;
				tmp.push(str);
			}
			if (tmp.length == 0) return null;
			return tmp;
		}
		return w_JSON.stringify(key);
	}

	function storeIndex(context, index, strKey, isLast)
	{
		var indexTable = util.indexTable(index.objectStore.name, index.name);

		var sql = ["INSERT INTO", indexTable, "(recordId, key, primaryKey)"];
		var args = [];
		if (index.multiEntry && (strKey instanceof Array))
		{
			var select = [];
			for (var i = 0; i < strKey.length; i++)
			{
				sql.push("SELECT ?, ?, ?");
				args.push(context.recordId, strKey[i], context.primaryKey);
			}
			sql.push(select.join(" UNION ALL "))
		}
		else
		{
			sql.push("VALUES (?, ?, ?)");
			args.push(context.recordId, strKey, context.primaryKey);
		}
		var request = context.request;
		context.sqlTx.executeSql(sql.join(" "), args,
			function (_, results)
			{
				if (!isLast) return;

				if (request.onsuccess) request.onsuccess(util.event("success", request));
				context.nextRequestCallback();
			},
			function (_, sqlError)
			{
				// TODO: proper error handling
				request.error = util.error("ConstraintError");
				//request.error = sqlError;
				if (request.onerror) request.onerror(util.event("error", request));
				context.nextRequestCallback();
			});
	}
	//endregion

	IDBObjectStore.prototype.delete = function (key)
	{
		util.IDBTransaction._assertNotReadOnly(this.transaction);
		key = util.validateKeyOrRange(key);
		var request = new util.IDBRequest(this);
		var me = this;
		this.transaction._enqueueRequest(function (sqlTx, nextRequestCallback)
		{
			me._deleteRecord(sqlTx, key,
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

	IDBObjectStore.prototype.get = function (key)
	{
		key = util.validateKeyOrRange(key);
		var request = new util.IDBRequest(this);
		var me = this;
		me.transaction._enqueueRequest(function (sqlTx, nextRequestCallback)
		{
			var where = "", args = [];
			if (key instanceof util.IDBKeyRange)
			{
				var filter = key._getSqlFilter();
				where = "WHERE " + filter.sql;
				args = filter.args;
			}
			else if (key != null)
			{
				where = "WHERE (key = ?)";
				args.push(key);
			}

			sqlTx.executeSql("SELECT [value] FROM [" + me.name + "] " + where +" LIMIT 1", args,
				function (_, results)
				{
					request.result = results.rows.length > 0 ? w_JSON.parse(results.rows.item(0).value) : undefined;
					if (request.onsuccess) request.onsuccess(util.event("success", request));
				},
				function (_, sqlError)
				{
					request.error = sqlError;
					if (request.onerror) request.onerror(util.event("error", request));
				});

			nextRequestCallback();
		});
		return request;
	};

	IDBObjectStore.prototype.clear = function ()
	{
		util.IDBTransaction._assertNotReadOnly(this.transaction);
		var request = new util.IDBRequest(this);
		var me = this;
		this.transaction._enqueueRequest(function (sqlTx, nextRequestCallback)
		{
			var errorCallback = function (_, sqlError)
			{
				request.error = sqlError;
				if (request.onerror) request.onerror(util.event("error", request));
			};
			for (var indexName in me._indexes)
			{
				var tableName = util.indexTable(me._indexes[indexName]);
				sqlTx.executeSql("DELETE FROM [" + tableName + "]", null, null, errorCallback);
			}
			sqlTx.executeSql("DELETE FROM [" + me.name + "]", null,
				function (_, results)
				{
					request.result = undefined;
					if (request.onsuccess) request.onsuccess(util.event("success", request));
				},
				errorCallback);
		});
		return request;
	};

	IDBObjectStore.prototype.openCursor = function (range, direction)
	{
		var request = new util.IDBRequest(this);
		var cursor = new util.IDBCursorWithValue(this, direction, request);
		cursor._range = util.IDBKeyRange._ensureKeyRange(range);
		cursor.continue();
		return request;
	};

	IDBObjectStore.prototype.createIndex = function (name, keyPath, optionalParameters)
	{
		util.IDBTransaction._assertVersionChange(this.transaction);
		if (this.indexNames.indexOf(name) >= 0)
		{
			throw util.error("ConstraintError");
		}
		var keyPath = util.validateKeyPath(keyPath);
		var params = optionalParameters || { };
		var unique = params.unique && params.unique != false || false;
		var multiEntry = params.multiEntry && params.multiEntry != false || false;

		if (keyPath instanceof Array && multiEntry)
		{
			throw util.error("NotSupportedError");
		}
		return createIndex(this, name, keyPath, unique, multiEntry);
	};

	IDBObjectStore.prototype.index = function (name)
	{
		if (!this.transaction._active)
		{
			throw util.error("InvalidStateError");
		}
		var index = this._indexes[name];
		if (index == null)
		{
			throw util.error("NotFoundError");
		}
		return index;
	};

	IDBObjectStore.prototype.deleteIndex = function (indexName)
	{
		util.IDBTransaction._assertVersionChange(this.transaction);
		if (this.indexNames.indexOf(indexName) == -1)
		{
			throw util.error("ConstraintError");
		}
		util.arrayRemove(this.indexNames, indexName);
		var index = this._indexes[indexName];
		delete this._indexes[indexName];
		var me = this;
		var errorCallback = function (_, sqlError)
		{
			me.indexNames.push(indexName);
			me._indexes[indexName] = index;
		};
		this.transaction._enqueueRequest(function (sqlTx, nextRequestCallback)
		{
			sqlTx.executeSql("DROP TABLE " + util.indexTable(me.name, indexName), null, null, errorCallback);

			sqlTx.executeSql("DELETE FROM " + indexedDB.SCHEMA_TABLE + " WHERE type = 'index' AND name = ?",
				[indexName], null, errorCallback);

			nextRequestCallback();
		});
	};

	IDBObjectStore.prototype.count = function (key)
	{
		key = util.validateKeyOrRange(key);
		var request = new util.IDBRequest(this);
		var me = this;
		this.transaction._enqueueRequest(function (sqlTx, nextRequestCallback)
		{
			var where = "", args = [];
			if (key instanceof util.IDBKeyRange)
			{
				var filter = key._getSqlFilter();
				where = "WHERE " + filter.sql;
				args = filter.args;
			}
			else if (key != null)
			{
				where = "WHERE (key = ?)";
				args.push(key);
			}
			sqlTx.executeSql("SELECT COUNT(id) AS 'count' FROM [" + me.name + "] " + where, args,
				function (_, results)
				{
					request.result = results.rows.item(0).count;
					if (request.onsuccess) request.onsuccess(util.event("success", request));
				},
				function (_, sqlError)
				{
					request.error = sqlError;
					if (request.onerror) request.onerror(util.event("error", request));
				});

			nextRequestCallback();
		});
		return request;
	};

	IDBObjectStore.prototype._deleteRecord = function (sqlTx, strKeyOrRange, onsuccess, onerror)
	{
		var objectStore = this;
		var sql, where, args = [];
		if (strKeyOrRange instanceof util.IDBKeyRange)
		{
			var filter = strKeyOrRange._getSqlFilter();
			where = "WHERE " + filter.sql;
			args = filter.args;
		}
		else
		{
			where = "WHERE (key = ?)";
			args.push(strKeyOrRange);
		}
		for (var indexName in objectStore._indexes)
		{
			var index = objectStore._indexes[indexName];
			sql = ["DELETE FROM [" + util.indexTable(objectStore.name, index.name) + "]"];
			if (args.length > 0)
			{
				sql.push("WHERE recordId IN (SELECT id FROM [" + objectStore.name + "]", where + ")");
			}
			sqlTx.executeSql(sql.join(" "), args, null, onerror);
		}
		sqlTx.executeSql("DELETE FROM [" + objectStore.name + "] " + where, args, onsuccess, onerror);
	};

	IDBObjectStore.prototype._insertOrReplaceRecord = function (context, strKey)
	{
		var request = context.request;
		if (!context.noOverwrite)
		{
			this._deleteRecord(context.sqlTx, strKey, null,
				function (_, sqlError)
				{
					request.error = sqlError;
					if (request.onerror) request.onerror(util.event("error", request));
					context.nextRequestCallback();
				});
		}
		var me = this;
		var strValue = w_JSON.stringify(context.value);
		context.sqlTx.executeSql("INSERT INTO [" + me.name + "] (key, value) VALUES (?, ?)",
			[strKey, strValue],
			function (sqlTx, results)
			{
				context.objectStore = me;
				context.sqlTx = sqlTx;
				context.primaryKey = strKey;
				context.recordId = results.insertId;
				storeIndexes(context);
			},
			function (sqlTx, sqlError)
			{
				// TODO: proper error handling
				request.error = util.error("ConstraintError");
				if (request.onerror) request.onerror(util.event("error", request));
				context.nextRequestCallback();
			});
	};

	// Utils
	var w_JSON = window.JSON;

	function isPositiveFloat(value)
	{
		return typeof value == "number" && value > 0;
	}

	function createIndex(me, name, keyPath, unique, multiEntry)
	{
		var index = new util.IDBIndex(me, name, keyPath, unique, multiEntry);
		index._ready = false;
		me.indexNames.push(name);
		me._indexes[name] = index;
		var errorCallback = function ()
		{
			util.arrayRemove(me.indexNames, name);
			delete me._indexes[name];
		};
		me.transaction._enqueueRequest(function (sqlTx, nextRequestCallback)
		{
			sqlTx.executeSql("CREATE TABLE " + util.indexTable(me.name, name) + " (recordId INTEGER, key TEXT" +
				(unique ? " UNIQUE" : "") + ", primaryKey TEXT)", null, null, errorCallback);

			sqlTx.executeSql("INSERT INTO " + indexedDB.SCHEMA_TABLE +
				" (name, type, keyPath, tableId, \"unique\", multiEntry) VALUES (?, 'index', ?, " +
				"(SELECT Id FROM " + indexedDB.SCHEMA_TABLE + " WHERE type = 'table' AND name = ?), ?, ?)",
				[name, w_JSON.stringify(keyPath), me.name, unique ? 1 : 0, multiEntry ? 1 : 0],
				null, errorCallback);

			sqlTx.executeSql("SELECT id, key, value FROM [" + me.name + "]", null,
				function (sqlTx, results)
				{
					if (results.rows.length == 0) return;

					var sql = ["INSERT INTO [" + util.indexTable(me.name, name) + "]"];
					var select = [], args = [];
					for (var i = 0; i < results.rows.length; i++)
					{
						var item = results.rows.item(i);
						var strKey = getValidIndexKeyString(index, w_JSON.parse(item.value));
						if (strKey == null) continue;

						if (index.multiEntry && (strKey instanceof Array))
						{
							for (var j = 0; j < strKey.length; j++)
							{
								select.push("SELECT ?, ?, ?");
								args.push(item.id, strKey[j], item.key);
							}
						}
						else
						{
							select.push("SELECT ?, ?, ?");
							args.push(item.id, strKey, item.key);
						}
					}
					sql.push(select.join(" UNION ALL "));
					sqlTx.executeSql(sql.join(" "), args, null,
						function (_, sqlError)
						{
							throw util.error("AbortError");
						});
				});

			index._ready = true;
			nextRequestCallback();
		});
		return index;
	}

}(window, window.indexedDB, window.indexedDB.util));
