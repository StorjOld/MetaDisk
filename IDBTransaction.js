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
		db._activeTransactionCounter++;

		var txFn;
		if (mode === IDBTransaction.READ_ONLY) txFn = sqldb.readTransaction;
		else if (mode === IDBTransaction.READ_WRITE) txFn = sqldb.transaction;
		else if (mode === IDBTransaction.VERSION_CHANGE)
		{
			txFn = function (x, y, z) { sqldb.changeVersion(sqldb.version, db.version, x, y, z); };
		}

		var me = this;
		txFn && txFn.call(sqldb,
			function (sqlTx) { performOperation(me, sqlTx, 0); },
			function (sqlError)
			{
				db.close();

				db._transactionCompleted();

				me.error = util.error("AbortError", null, sqlError);
				if (me.onabort) me.onabort(util.event("abort", me));
			},
			function ()
			{
				db._transactionCompleted();

				if (me.oncomplete) me.oncomplete(util.event("success", me));
			});
	};

	function performOperation(me, sqlTx, operationIndex)
	{
		if (!me._active) return;

		if (operationIndex >= me._requests.length)
		{
			me._active = false;
			me._requests = [];
			/*for (var name in me.db._objectStores)
			{
				me.db._objectStores[name].transaction = null;
			}*/
			return;
		}
		me._requests[operationIndex](sqlTx, function ()
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
		if (!this._active) throw util.error("InvalidStateError");
		this._queueOperation(function (sqlTx, nextRequestCallback)
		{
			throw util.error("AbortError");
		});
	};

	IDBTransaction.prototype._queueOperation = function (sqlTxCallback)
	{
		validateActive(this);
		this._requests.push(sqlTxCallback);
	};

	IDBTransaction._assertNotReadOnly = function (tx)
	{
		if (tx.mode === util.IDBTransaction.READ_ONLY)
		{
			throw util.error("ReadOnlyError", "A mutation operation was attempted in a READ_ONLY transaction.");
		}
	};

	IDBTransaction._assertVersionChange = function (tx)
	{
		if (!tx || tx.mode !== util.IDBTransaction.VERSION_CHANGE)
		{
			throw util.error("InvalidStateError");
		}
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
