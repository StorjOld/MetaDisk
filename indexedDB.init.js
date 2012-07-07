(function(window, undefined)
{
	var indexedDB = window.indexedDB = window.indexedDB || window.mozIndexedDB ||
		window.webkitIndexedDB || window.msIndexedDB || { polyfill : true };

	window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction;
	window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange;
	window.IDBCursor = window.IDBCursor || window.webkitIDBCursor;

	if (!indexedDB.polyfill) return;

	console.warn('This browser most likely does not support IndexedDB technology. Initializing custom IndexedDB' +
		' implementation using Web SQL Database technology.');


	// Configuration
	indexedDB.SCHEMA_TABLE = "__IndexedDBSchemaInfo__";
	indexedDB.DB_PREFIX = "__IndexedDB__";
	indexedDB.DB_DESCRIPTION = "IndexedDB ";
	indexedDB.DEFAULT_DB_SIZE = 5 * 1024 * 1024;
	indexedDB.CURSOR_CHUNK_SIZE = 10;

	// Data types
	indexedDB.DOMStringList = function () { };
	indexedDB.DOMStringList.prototype = [];
	indexedDB.DOMStringList.constructor = indexedDB.DOMStringList;
	indexedDB.DOMStringList.prototype.contains = function (str)
	{
		return this.indexOf(str) >= 0;
	};


	indexedDB.util = new (function ()
	{
		this.async = function (fn) { w_setTimeout(fn, 0); };

		this.error = function (name, message, innerError)
		{
			return {
				name : name,
				message : message,
				inner : innerError
			}
		};

		this.event = function (type, target)
		{
			return {
				type : type,
				target : target,
				currentTarget : target,
				preventDefault : function () { }
			};
		};

		this.validateKeyPath = function (keyPath)
		{
			if (keyPath === "") return "";
			if (keyPath == null) return null;

			var r = /^([^\d\W]\w*\.)+$/i;
			if (keyPath instanceof Array)
			{
				var i = keyPath.length;
				if (i == 0) throw this.error("SyntaxError");

				while (i--)
				{
					if (!r.test(keyPath[i] + ".")) throw this.error("SyntaxError");
				}
				return keyPath;
			}
			if (!r.test(keyPath + ".")) throw this.error("SyntaxError");
			return keyPath;
		};

		this.arrayRemove = function (array, item)
		{
			var i = array.indexOf(item);
			if (i > -1) array.splice(i, 1);
		};

		this.indexTable = function (objectStoreName, name)
		{
			return indexedDB.DB_PREFIX + "Index__" + objectStoreName + "__" + name;
		};

		this.extractKeyFromValue = function (keyPath, value)
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
	});

	/*
	IDBVersionChangeEvent.prototype = new Event(null);
	IDBVersionChangeEvent.prototype.constructor = IDBVersionChangeEvent;
	function IDBVersionChangeEvent ()
	{
		this.oldVersoin = null;
		this.newVersion = null;
	}
	*/

	var IDBDatabaseException = window.IDBDatabaseException = indexedDB.util.IDBDatabaseException =
	{
		ABORT_ERR : 8,
		CONSTRAINT_ERR : 4,
		DATA_ERR : 5,
		NON_TRANSIENT_ERR : 2,
		NOT_ALLOWED_ERR : 6,
		NOT_FOUND_ERR : 3,
		QUOTA_ERR : 11,
		READ_ONLY_ERR : 9,
		TIMEOUT_ERR : 10,
		TRANSACTION_INACTIVE_ERR : 7,
		UNKNOWN_ERR : 1,
		VERSION_ERR : 12
	};

	// Cached
	var w_setTimeout = window.setTimeout;

}(window));
