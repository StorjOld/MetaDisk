if (window.indexedDB.polyfill)
(function(window, indexedDB, util, undefined)
{
	var IDBDatabase = util.IDBDatabase = window.IDBDatabase = function (name, webdb)
	{
		this.name = name;
		this.version = null;
		this.objectStoreNames = new indexedDB.DOMStringList();
		this.onabort = null;
		this.onerror = null;
		this.onversionchange = null

		this._webdb = webdb;
		this._objectStores = null;
	};

	IDBDatabase.prototype.createObjectStore = function (name, optionalParameters)
	{
		validateVersionChangeTx(this._versionChangeTx);

		// Validate existence of ObjectStore
		if (this.objectStoreNames.indexOf(name) >= 0)
		{
			throw util.error("ConstraintError");
		}

		var op = optionalParameters || { };
		var keyPath = op.keyPath || null;
		var autoIncrement = op.autoIncrement && op.autoIncrement != false || false;
		if (autoIncrement && (keyPath == "" || (keyPath instanceof Array)))
		{
			throw util.error("InvalidAccessError");
		}
		if (keyPath != null) keyPath = validateKeyPath(keyPath);

		return createObjectStore(this, name, keyPath, autoIncrement);
	};

	IDBDatabase.prototype.deleteObjectStore = function (name)
	{
		validateVersionChangeTx(this._versionChangeTx);
		if (this.objectStoreNames.indexOf(name) == -1)
		{
			throw util.error("NotFoundError");
		}
		var i = this.objectStoreNames.indexOf(name);
		if (i > -1) this.objectStoreNames.splice(i, 1);
		var me = this;
		this._versionChangeTx._enqueueRequest(function (sqlTx, nextRequestCallback)
		{
			sqlTx.executeSql("DROP TABLE \"" + name + "\"", [], null,
				function (tx, sqlError) { me.objectStoreNames.push(name); }
			);
			sqlTx.executeSql("DELETE FROM " + indexedDB.SCHEMA_TABLE + " WHERE type = 'table' AND name = ?", [name]);
			nextRequestCallback();
		});
	};

	IDBDatabase.prototype.transaction = function (storeNames, mode)
	{
		return new util.IDBTransaction(this, storeNames, mode || util.IDBTransaction.READ_ONLY);
	};

	IDBDatabase.prototype.close = function ()
	{
		return null;
	};

	IDBDatabase.prototype._loadObjectStores = function (sqlTx, successCallback, errorCallback)
	{
		var me = this;
		sqlTx.executeSql("SELECT name, keyPath, autoInc FROM " + indexedDB.SCHEMA_TABLE +
			" WHERE type='table'", null,
			function (sqlTx, resultSet)
			{
				me._objectStores = { };
				var item = null;
				for (var i = 0; i < resultSet.rows.length; i++)
				{
					var item = resultSet.rows.item(i);

					me.objectStoreNames.push(item.name);
					me._objectStores[item.name] = new util.IDBObjectStore(
						item.name, w_JSON.parse(item.keyPath), item.autoInc);
				}
				if (successCallback) successCallback();
			},
			function (sqlTx, sqlError)
			{
				if (errorCallback) errorCallback(sqlError);
			});
	}

	// Utils
	var w_JSON = window.JSON;

	function validateVersionChangeTx(tx)
	{
		if (!tx || tx.mode !== util.IDBTransaction.VERSION_CHANGE)
		{
			throw util.error("InvalidStateError");
		}
	}

	function validateKeyPath(keyPath)
	{
		if (keyPath === "") return "";

		var r = /^([^\d\W]\w*\.)+$/i;
		if (keyPath instanceof Array)
		{
			var i = keyPath.length;
			if (i == 0) throw util.error("SyntaxError");

			while (i--)
			{
				if (!r.test(keyPath[i] + ".")) throw util.error("SyntaxError");
			}
			return keyPath;
		}
		if (!r.test(keyPath + ".")) throw util.error("SyntaxError");
		return keyPath;
	}

	function createObjectStore(me, name, keyPath, autoIncrement)
	{
		var objectStore = new util.IDBObjectStore(name, keyPath, autoIncrement, me._versionChangeTx);
		me._objectStores[name] = objectStore;
		me.objectStoreNames.push(name);
		me._versionChangeTx._enqueueRequest(function (sqlTx, nextRequestCallback)
		{
			sqlTx.executeSql("CREATE TABLE \"" + name + "\" (id INTEGER PRIMARY KEY AUTOINCREMENT, " +
				"key TEXT, value BLOB)", [], null,
				function (tx, sqlError)
				{
					var i = me.objectStoreNames.indexOf(name);
					if (i > -1) me.objectStoreNames.splice(i, 1);

					delete me._objectStores[name];
				}
			);
			sqlTx.executeSql("CREATE INDEX Index_" + name + "_key ON \"" + name + "\" (key)");

			sqlTx.executeSql("INSERT INTO " + indexedDB.SCHEMA_TABLE +
				" (type, name, keyPath, autoInc) VALUES ('table', ?, ?, ?)",
				[name, w_JSON.stringify(keyPath), autoIncrement ? 1 : 0]);
			nextRequestCallback();
		});
		return objectStore;
	}

}(window, window.indexedDB, window.indexedDB.util));
