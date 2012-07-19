if (window.indexedDB.polyfill)
(function(window, indexedDB, util, undefined)
{
	var origin = { };

	indexedDB.open = function (name, version)
	{
		console.group
		if (arguments.length == 2 && version == undefined) throw util.error("TypeError");
		if (version !== undefined)
		{
			version = parseInt(version.valueOf());
			if (isNaN(version) || version <= 0)
				throw util.error("TypeError", "The method parameter is missing or invalid.");
		}
		var request = new util.IDBOpenDBRequest(null);
		util.async(function ()
		{
			request.readyState = util.IDBRequest.DONE;
			runStepsForOpeningDB(name, version, request);
		});
		return request;
	};

	function runStepsForOpeningDB(name, version, request)
	{
		var sqldb = util.openDatabase(name);
		if (sqldb.version !== "" && isNaN(parseInt(sqldb.version))) // sqldb.version is corrupt
		{
			request.error = util.error("VersionError");
			if (request.onerror) request.onerror(util.event("error", request));
			return;
		}

		var connection = new util.IDBDatabase(name, sqldb);
		var oldVersion = sqldb.version == "" ? 0 : parseInt(sqldb.version);
		connection.version = (version === undefined) ? (oldVersion === 0 ? 1 : oldVersion) : version;
		var database = getOriginDatabase(name);

		util.wait(function ()
			{
				// www.w3.org/TR/IndexedDB 4.1.3
				if (database.deletePending) return false;
				for (var i = 0; i < database.connections.length; i++)
				{
					if (database.connections[i]._versionChangeTransaction != null) return false;
				}
				return true;
			},
			function ()
			{
				if (oldVersion < connection.version)
				{
					runStepsForVersionChangeTransaction(request, connection, oldVersion);
				}
				else if (oldVersion == connection.version)
				{
					openVersionMatch(request, connection, sqldb);
				}
				else
				{
					request.error = util.error("VersionError");
					if (request.onerror) request.onerror(util.event("error", request));
				}
			});
	}

	function runStepsForVersionChangeTransaction(request, connection, oldVersion)
	{
		fireVersionChangeEvent(request, connection.name, oldVersion, connection.version);
		util.wait(function ()
			{
				return getOriginDatabase(name).connections.length == 0;
			},
			function ()
			{
				startVersionChangeTransaction(request, connection, oldVersion);
			});
	}

	function startVersionChangeTransaction(request, connection, oldVersion)
	{
		var database = getOriginDatabase(connection.name);
		database.connections.push(connection);
		var tx = new util.IDBTransaction(connection, [], util.IDBTransaction.VERSION_CHANGE);
		if (oldVersion == 0)
		{
			tx._queueOperation(function (sqlTx, nextRequestCallback)
			{
				sqlTx.executeSql("CREATE TABLE [" + indexedDB.SCHEMA_TABLE + "] (" +
					"id INTEGER PRIMARY KEY AUTOINCREMENT, " +
					"type TEXT NOT NULL, " +
					"name TEXT NOT NULL, " +
					"keyPath TEXT, " +
					"currentNo INTEGER NOT NULL DEFAULT 1, " +
					// specific to tables
					"autoInc BOOLEAN, " +
					// specific to indexes
					"tableId INTEGER, " +
					"[unique] BOOLEAN, " +
					"multiEntry BOOLEAN, " +
					"UNIQUE (type, name) ON CONFLICT ROLLBACK)");

				nextRequestCallback();
			});
		}
		tx._queueOperation(function (sqlTx, nextRequestCallback)
		{
			connection._loadObjectStores(sqlTx,
				function ()
				{
					request.result = connection;
					if (request.onupgradeneeded)
					{
						request.transaction = connection._versionChangeTransaction = tx;
						var e = new util.IDBVersionChangeEvent("onupgradeneeded",
							request, oldVersion, connection.version);
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
		tx.onabort = function (e)
		{
			request.transaction = connection._versionChangeTransaction = null;
			request.error = tx.error;
			if (request.onerror) request.onerror(util.event("abort", request));
		};
		tx.onerror = function (e)
		{
			// NOTE: All create/deleteObjectStore errors handled here, hence no need for
			// unnecessary generic handlers for each.
			request.transaction = connection._versionChangeTransaction = null;
			request.error = tx.error;
			if (request.onerror) request.onerror(util.event("error", request));
		};
		tx.oncomplete = function (e)
		{
			request.transaction = connection._versionChangeTransaction = null;
			if (request.onsuccess) request.onsuccess(util.event("success", request));
		};
	}

	function openVersionMatch(request, connection, sqldb)
	{
		sqldb.transaction(
			function (sqlTx)
			{
				connection._loadObjectStores(sqlTx);
			},
			function (sqlError)
			{
				request.error = sqlError;
				if (request.onerror) request.onerror(util.event("error", request));
			},
			function ()
			{
				request.result = connection;
				if (request.onsuccess) request.onsuccess(util.event("success", request));
			}
		);
	}

	// IDBFactory.deleteDatabase
	indexedDB.deleteDatabase = function (name)
	{
		console.groupCollapsed("indexedDB.deleteDatabase('%s')", name);
		// INFO: There is no way to delete database in Web SQL Database API.
		var database = getOriginDatabase(name);
		database.deletePending = true;
		var request = new util.IDBOpenDBRequest(null);
		util.async(function()
		{
			console.log("deleteDatabase async started.");
			request.readyState = util.IDBRequest.DONE;
			var sqldb = util.openDatabase(name);
			if (sqldb.version == "")
			{
				console.log("Database deleted succesfully. (No such database was found)");
				console.groupEnd();
				database.deletePending = false;
				if (request.onsuccess) request.onsuccess(util.event("success", request));
			}
			else
			{
				console.log("Deleting existing database");
				fireVersionChangeEvent(request, name, parseInt(sqldb.version), null);
				util.wait(function ()
					{
						console.log("Waiting %d connection to be closed", database.connections.length);
						return database.connections.length == 0;
					},
					function ()
					{
						deleteDatabase(request, sqldb, database);
					});
			}
		});
		return request;
	};

	// IDBFactory.cmp
	indexedDB.cmp = function (first, second)
	{
		first = util.encodeKey(first);
		second = util.encodeKey(second);
		return first > second ? 1 : (first == second ? 0 : -1);
	};

	indexedDB._notifyConnectionClosed = function (connection)
	{
		var database = getOriginDatabase(connection.name);
		var i = database.connections.indexOf(connection);
		if (i >= 0) database.connections.splice(i, 1);
	};

	// Utils
	function getOriginDatabase(name)
	{
		var db = origin[name];
		if (db == null)
		{
			db = {
				name : name,
				deletePending : false,
				connections : []    // openDatabases
			};
			origin[name] = db;
		}
		return db;
	}

	function fireVersionChangeEvent(request, name, oldVersion, newVersion)
	{
		var database = getOriginDatabase(name);
		var anyOpenConnection = false;
		for (var i = 0; i < database.connections.length; i++)
		{
			var conn = database.connections[i];
			if (conn._closePending) continue;

			console.log("Open connection found, firing versionchange event on them.");
			anyOpenConnection = true;
			var event = new util.IDBVersionChangeEvent("versionchange", request, oldVersion, newVersion);
			if (conn.onversionchange) conn.onversionchange(event);
		}
		if (anyOpenConnection)
		{
			console.log("Open connection found, firing onblocked event.");
			var event = new util.IDBVersionChangeEvent("blocked", request, oldVersion, newVersion);
			if (request.onblocked) request.onblocked(event);
		}
	}

	function deleteDatabase(request, sqldb, database)
	{
		console.log("Setting sql database version %d to empty.", sqldb.version);
		sqldb.changeVersion(sqldb.version, "",
			function (sqlTx)
			{
				console.log("Selecting all tables and indexes from schema table.");
				sqlTx.executeSql("SELECT a.type, a.name, b.name 'table' FROM " + indexedDB.SCHEMA_TABLE +
					" a LEFT JOIN " + indexedDB.SCHEMA_TABLE + " b ON a.type = 'index' AND a.tableId = b.Id",
					null,
					function (sqlTx, results)
					{
						var name;
						for (var i = 0; i < results.rows.length; i++)
						{
							var item = results.rows.item(i);
							name = item.type == 'table' ? item.name : util.indexTable(item.table, item.name);
							console.log("Dropping table %s.", name);
							sqlTx.executeSql("DROP TABLE [" + name + "]");
						}
						console.log("Dropping schema table.");
						sqlTx.executeSql("DROP TABLE " + indexedDB.SCHEMA_TABLE);
					});
			},
			function (sqlError)
			{
				console.error("Database (version %d) deletion failed.", sqldb.version, sqlError);
				database.deletePending = false;
				request.error = sqlError;
				if (request.onerror) request.onerror(util.event("error", request));
			},
			function ()
			{
				console.log("Database deleted successfully.");
				console.groupEnd();
				database.deletePending = false;
				if (request.onsuccess) request.onsuccess(util.event("success", request));
			});
	}

}(window, window.indexedDB, window.indexedDB.util));
