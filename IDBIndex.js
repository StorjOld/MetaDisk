if (window.indexedDB.polyfill)
(function(window, indexedDB, util, undefined)
{
	var IDBIndex = util.IDBIndex = window.IDBIndex = function(source)
	{
		this.name = null;
		this.objectStore = null;
		this.keyPath = null;
		this.multiEntry = null;
		this.unique = null;
	};

	IDBIndex.prototype.openCursor = function (range, direction)
	{

	}

	IDBIndex.prototype.openKeyCursor = function (range, direction)
	{

	}

	IDBIndex.prototype.get = function (key)
	{

	}

	IDBIndex.prototype.getKey = function (key)
	{

	}

	IDBIndex.prototype.count = function (key)
	{

	}

}(window, window.indexedDB, window.indexedDB.util));
