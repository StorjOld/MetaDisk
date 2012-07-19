if (window.indexedDB.polyfill)
(function(window, util, undefined)
{
	var DEFAULT_DB_SIZE = 5 * 1024 * 1024;

	util.openDatabase = function (name)
	{
		return new Database(window.openDatabase(indexedDB.DB_PREFIX + name, "", "IndexedDB " + name, DEFAULT_DB_SIZE));
	};

	var Database_prototype =  function (db)
	{
		var db = db;

		this.version = db && db.version;

		this.transaction = function (callback, errorCallback, successCallback)
		{
			db.transaction(function (tx)
				{
					if (callback) callback(new Transaction(tx));
				},
				function (error)
				{
					if (errorCallback) errorCallback(error);
				},
				function ()
				{
					if (successCallback) successCallback();
				});
		};

		this.readTransaction =  function (callback, errorCallback, successCallback)
		{
			db.readTransaction(function (tx)
				{
					if (callback) callback(new Transaction(tx));
				},
				function (error)
				{
					if (errorCallback) errorCallback(error);
				},
				function ()
				{
					if (successCallback) successCallback();
				});
		};

		this.changeVersion = function (oldVersion, newVersion, callback, errorCallback, successCallback)
		{
			db.changeVersion(oldVersion, newVersion,
				function (tx)
				{
					if (callback) callback(new Transaction(tx));
				},
				function (error)
				{
					if (errorCallback) errorCallback(error);
				},
				function ()
				{
					if (successCallback) successCallback();
				});
		};
	};

	var Database = function (db)
	{
		Database_prototype.call(this, db);
	};
	Database.prototype = new Database_prototype();
	Database.prototype.constructor = Database;


	var Transaction_prototype = function (tx)
	{
		var tx = tx;

		this.executeSql = function (sql, args, callback, errorCallback)
		{
			console.log("[SQL]: %s; args: %o", sql, args);
			tx.executeSql(sql, args, callback,
				function (transaction, error)
				{
					console.error("[SQL Error]: ", error);
				   if (errorCallback) errorCallback(transaction, error);
				});
		}
	};

	var Transaction = function (tx)
	{
		Transaction_prototype.call(this, tx);
	};
	Transaction.prototype = new Transaction_prototype();
	Transaction.prototype.constructor = Transaction;

}(window, window.indexedDB.util));
