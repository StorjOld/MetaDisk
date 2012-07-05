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
		assertReadOnly(me.transaction);
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

			key = extractKeyFromValue(value, keyPath);
		}
		if (key == null)
		{
			if (!autoIncrement) throw util.error("DataError");
		}
		else
		{
			str = w_JSON.stringify(key);
			if (notValidKey(str)) throw util.error("DataError");
		}
		return { key : key, str : str };
	}

	function notValidKey(strKey)
	{
		// TODO: key validation according to spec
		if (strKey === "true" || strKey === "false") return true;

		if ((/[,[]{.*?}[,\]]/).test(strKey) ||
			(/^{.*?}$/).test(strKey) ||
			(/[,[](true|false)[,\]]/).test(strKey)) return true;

		return false;
	}

	function extractKeyFromValue(value, keyPath)
	{
		var key, i;
		if (keyPath instanceof Array)
		{
			key = [];
			for (i = 0; i < keyPath.length; i++)
			{
				key.push(extractKeyFromValue(value, keyPath[i]));
			}
		}
		else
		{
			if (keyPath === "") return value;

			key = value;
			var paths = keyPath.split(".");
			for (i = 0; i < paths.length; i++)
			{
				if (key == null) return null;
				key = key[paths[i]];
			}
		}
		return key;
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
					sqlInsertKeyValue(context, strKey);
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
			sqlInsertKeyValue(context, strKey);
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

	function sqlInsertKeyValue(context, strKey)
	{
		var request = context.request;
		var sql = (context.noOverwrite ? "INSERT" : "REPLACE") + " INTO \"" +
			request.source.name + "\" (key, value) VALUES (?, ?)";

		context.primaryKey = strKey;
		var strValue = w_JSON.stringify(context.value);
		context.sqlTx.executeSql(sql, [strKey, strValue],
			function (sqlTx, results)
			{
				context.sqlTx = sqlTx;
				context.recordId = results.insertId;
				storeIndexes(context);
			},
			function (sqlTx, sqlError)
			{
				request.error = sqlError;
				if (request.onerror) request.onerror(util.event("error", request));
				context.nextRequestCallback();
			});
	}

	function storeIndexes(context)
	{
		var request = context.request;
		var me = request.source;
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
		var key = extractKeyFromValue(value, index.keyPath);
		if (key == null) return null;

		if (key instanceof Array)
		{
			if (key.length == 0) return null;
		}
		else
		{
			if (notValidKey(w_JSON.stringify(key))) return null;
		}
		if (index.multiEntry && (key instanceof Array))
		{
			// clean-up
			var tmp = [], str;
			for (var i = 0; i < key.length; i++)
			{
				str = w_JSON.stringify(key[i]);
				if (tmp.indexOf(str) >= 0 || notValidKey(str)) continue;
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
				request.error = sqlError;
				if (request.onerror) request.onerror(util.event("error", request));
				context.nextRequestCallback();
			});
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
				function (_, results)
				{
					if (request.onsuccess) request.onsuccess(util.event("success", request));
					nextRequestCallback();
				},
				function (_, sqlError)
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

		cursor._range = util.IDBKeyRange.ensureKeyRange(range);
		cursor.continue();
		return request;
	};

	IDBObjectStore.prototype.createIndex = function (name, keyPath, optionalParameters)
	{
		validateVersionChangeTx(this.transaction);
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
		validateVersionChangeTx(this.transaction);
		if (this.indexNames.indexOf(indexName) == -1)
		{
			throw util.error("ConstraintError");
		}
		util.arrayRemove(this.indexNames, indexName);
		var index = this._indexes[indexName];
		delete this._indexes[indexName];
		var me = this;
		var errorCallback = function ()
		{
			me.indexNames.push(indexName);
			me._indexes[indexName] = index;
		};
		this.transaction._enqueueRequest(function (sqlTx, nextRequestCallback)
		{
			sqlTx.executeSql("DROP TABLE " + util.indexTable(me.name, indexName), null, null, errorCallback);

			sqlTx.executeSql("DELETE FROM " + indexedDB.SCHEMA_TABLE + " WHERE type = 'index', name = ?",
				[indexName], null, errorCallback);

			nextRequestCallback();
		});
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

	function validateVersionChangeTx(tx)
	{
		if (!tx || tx.mode !== util.IDBTransaction.VERSION_CHANGE)
		{
			throw util.error("InvalidStateError");
		}
	}

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
					sqlTx.executeSql(sql.join(" "), args);
				});

			index._ready = true;
			nextRequestCallback();
		});
		return index;
	}

}(window, window.indexedDB, window.indexedDB.util));
