if (window.indexedDB.polyfill)
(function(window, indexedDB, util, undefined)
{
	indexedDB.open = function (name, version)
	{
		if (version !== undefined)
		{
			version = parseInt(version);
			if (isNaN(version) || version <= 0) throw util.error("TypeError",
				"The method parameter is missing or invalid.");
		}
		var request = new util.IDBOpenDBRequest();
		request.source = null;
		request.readyState = util.IDBRequest.LOADING;
		util.async(function ()
		{
			request.readyState = util.IDBRequest.DONE;
			runStepsForOpeningDB(name, version, request);
		});
		return request;
	};

	function runStepsForOpeningDB(name, version, request)
	{
		var sqldb = openSqlDB(name);
		if (sqldb.version !== "" && isNaN(parseInt(sqldb.version))) // sqldb.version is corrupt
		{
			request.errorCode = util.IDBDatabaseException.VERSION_ERR;
			if (request.onerror) request.onerror(util.event("error", request));
			return;
		}
		var db = new util.IDBDatabase(name, sqldb);
		var sqldbVersion = sqldb.version == "" ? 0 : parseInt(sqldb.version);
		db.version = (version === undefined) ?
			(sqldbVersion === 0 ? 1 : sqldbVersion) :
			version;

		if (sqldbVersion < db.version)
		{
			openLowerVersion(request, db, sqldbVersion);
		}
		else if (sqldbVersion == db.version)
		{
			openVersionMatch(request, db, sqldb);
		}
		else
		{
			request.error = util.error("VersionError");
			if (request.onerror) request.onerror(util.event("error", request));
		}
	}

	function openLowerVersion(request, db, sqldbVersion)
	{
		var tx = new util.IDBTransaction(db, [], util.IDBTransaction.VERSION_CHANGE);
		if (sqldbVersion == 0)
		{
			tx._enqueueRequest(function (sqlTx, nextRequestCallback)
			{
				sqlTx.executeSql("CREATE TABLE '" + indexedDB.SCHEMA_TABLE + "' (" +
				"id INTEGER PRIMARY KEY AUTOINCREMENT, " +
				"type TEXT NOT NULL, " +
				"name TEXT NOT NULL, " +
				"keyPath TEXT, " +
				"currentNo INTEGER NOT NULL DEFAULT 1, " +
				// specific to tables
				"autoInc BOOLEAN, " +
				// specific to indexes
				"tableId INTEGER, " +
				"\"unique\" BOOLEAN, " +
				"multiEntry BOOLEAN, " +
				"UNIQUE (type, name) ON CONFLICT ROLLBACK)");

				nextRequestCallback();
			});
		}
		tx._enqueueRequest(function (sqlTx, nextRequestCallback)
		{
			db._loadObjectStores(sqlTx,
				function ()
				{
					request.result = db;
					if (request.onupgradeneeded)
					{
						request.transaction = db._versionChangeTx = tx;
						var e = util.event("onupgradeneeded", request);
						e.oldVersion = sqldbVersion;
						e.newVersion = db.version;
						request.onupgradeneeded(e);
					}
					nextRequestCallback();
				},
				function (sqlError)
				{
					console.log(sqlError);
					nextRequestCallback();
				});
		});
		tx.onerror = function (e)
		{
			// NOTE: All create/deleteObjectStore errors handled here, hence no need for
			// unnecessary generic handlers for each.
			request.transaction = db._versionChangeTx = null;
			request.error = tx.error;
			if (request.onerror) request.onerror(util.event("error", request));
		};
		tx.oncomplete = function (e)
		{
			request.transaction = db._versionChangeTx = null;
			if (request.onsuccess) request.onsuccess(util.event("success", request));
		};
	}

	function openVersionMatch(request, db, sqldb)
	{
		sqldb.transaction(
			function (sqlTx)
			{
				db._loadObjectStores(sqlTx);
			},
			function (sqlError)
			{
				request.error = sqlError;
				if (request.onerror) request.onerror(util.event("error", request));
			},
			function ()
			{
				request.result = db;
				if (request.onsuccess) request.onsuccess(util.event("success", request));
			}
		);
	}

	// IDBFactory.deleteDatabase
	indexedDB.deleteDatabase = function (name)
	{
		// INFO: There is no way to delete database in Web SQL Database API.
		var request = new util.IDBOpenDBRequest();
		request.readyState = util.IDBRequest.LOADING;
		indexedDB.util.async(function()
		{
			request.readyState = util.IDBRequest.DONE;
			var sqldb = openSqlDB(name);
			if (sqldb.version == "")
			{
				if (request.onsuccess) request.onsuccess(null);
			}
			else
			{
				sqldb.changeVersion(sqldb.version, "",
					function (tx)
					{

						tx.executeSql("SELECT a.type, a.name, b.name 'table' FROM " + indexedDB.SCHEMA_TABLE +
							" a LEFT JOIN " + indexedDB.SCHEMA_TABLE + " b ON a.type = 'index' AND a.tableId = b.Id",
							null,
							function (tx, results)
							{
								var name;
								for (var i = 0; i < results.rows.length; i++)
								{
									var item = results.rows.item(i);
									name = item.type == 'table' ? item.name : util.indexTable(item.table, item.name);
									tx.executeSql("DROP TABLE [" + name + "]");
								}
								tx.executeSql("DROP TABLE " + indexedDB.SCHEMA_TABLE);
							});
					},
					function (e)
					{
						if (request.onerror) request.onerror(e);
					},
					function ()
					{
						if (request.onsuccess) request.onsuccess(null);
					});
			}
		});
		return request;
	};

	// IDBFactory.cmp
	indexedDB.cmp = function (first, second)
	{
		// TODO: Compare according to doc
		return first > second ? 1 : (first == second ? 0 : -1);
	};

	// Utils
	function openSqlDB(name)
	{
		return window.openDatabase(
			indexedDB.DB_PREFIX + name, "",
			indexedDB.DB_DESCRIPTION + name,
			indexedDB.DEFAULT_DB_SIZE);
	}

}(window, window.indexedDB, window.indexedDB.util));
