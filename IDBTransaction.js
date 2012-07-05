if (window.indexedDB.polyfill)
(function(window, util, undefined)
{
	var IDBTransaction = util.IDBTransaction = window.IDBTransaction = function(db, storeNames, mode)
	{
		this.db = db;
		this.mode = mode;
		this.onabort = null;
		this.oncomplete = null;
		this.onerror = null;

		this._active = true;
		this._requests = [];
		var sqldb = this.db._webdb;

		// Main
		var txFn;
		if (mode === IDBTransaction.READ_ONLY) txFn = sqldb.readTransaction;
		else if (mode === IDBTransaction.READ_WRITE) txFn = sqldb.transaction;
		else if (mode === IDBTransaction.VERSION_CHANGE)
		{
			txFn = function (x, y, z) { sqldb.changeVersion(sqldb.version, db.version, x, y, z); };
		}

		var me = this;
		txFn && txFn.call(sqldb,
			function (sqlTx) {
				performOperation(me, sqlTx, 0); },
			function (sqlError) {
				me.error = sqlError;
				if (me.onerror) me.onerror(util.event("error", me)); },
			function () {
				if (me.oncomplete) me.oncomplete(util.event("success", me));
			});
	};

	function performOperation(me, sqlTx, operationIndex)
	{
		if (operationIndex >= me._requests.length)
		{
			me._active = false;
			me._requests = [];
			for (var name in me.db._objectStores)
			{
				me.db._objectStores[name].transaction = null;
			}
			return;
		}
		operation =  me._requests[operationIndex];
		operation(sqlTx, function ()
		{
			performOperation(me, sqlTx, operationIndex + 1);
		});
	}

	IDBTransaction.prototype.objectStore = function (name)
	{
		validateActive(this);
		var objectStore = this.db._objectStores[name];
		if (objectStore)
		{
			objectStore.transaction = this;
			return objectStore;
		}
		else
		{
			throw util.error("NotFoundError");
		}
	};

	IDBTransaction.prototype.abort = function ()
	{

	};

	IDBTransaction.prototype._enqueueRequest = function (sqlTxCallback)
	{
		validateActive(this);
		this._requests.push(sqlTxCallback);
	};

	IDBTransaction.READ_ONLY = "readonly";
	IDBTransaction.READ_WRITE = "readwrite";
	IDBTransaction.VERSION_CHANGE = "versionchange";

	// Utils
	function validateActive(me)
	{
		if (!me._active) throw new util.error("TransactionInactiveError");
	}

}(window, window.indexedDB.util));
