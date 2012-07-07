if (window.indexedDB.polyfill)
(function(window, indexedDB, util, undefined)
{
	var IDBIndex = util.IDBIndex = window.IDBIndex = function (objectStore, name, keyPath, unique, multiEntry)
	{
		this.objectStore = objectStore;
		this.name = name;
		this.keyPath = keyPath;
		this.unique = unique;
		this.multiEntry = multiEntry;

		this._ready = true;
	};

	IDBIndex.prototype.openCursor = function (range, direction)
	{
		var request = new util.IDBRequest(this);
		request.readyState = util.IDBRequest.LOADING;
		var cursor = new util.IDBCursorWithValue(this, direction, request);
		cursor._range = util.IDBKeyRange._ensureKeyRange(range);
		cursor.continue();
		return request;
	};

	IDBIndex.prototype.openKeyCursor = function (range, direction)
	{
		var request = new util.IDBRequest(this);
		request.readyState = util.IDBRequest.LOADING;
		var cursor = new util.IDBCursor(this, direction, request);
		cursor._range = util.IDBKeyRange._ensureKeyRange(range);
		cursor.continue();
		return request;
	};

	IDBIndex.prototype.get = function (key)
	{

	};

	IDBIndex.prototype.getKey = function (key)
	{

	};

	IDBIndex.prototype.count = function (key)
	{

	}

}(window, window.indexedDB, window.indexedDB.util));
