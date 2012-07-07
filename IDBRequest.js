if (window.indexedDB.polyfill)
(function(window, indexedDB, util, undefined)
{
	var IDBRequest = util.IDBRequest = window.IDBRequest = function(source)
	{
		this.result = undefined;
		this.error = null;
		this.source = source;
		this.transaction = null;
		this.readyState = util.IDBRequest.LOADING;
		this.onsuccess = null;
		this.onerror = null;
	};
	IDBRequest.LOADING = "pending";
	IDBRequest.DONE = "done";

	var IDBOpenDBRequest = util.IDBOpenDBRequest = window.IDBOpenDBRequest = function(source)
	{
		IDBRequest.apply(this, arguments);
		this.onblocked = null;
		this.onupgradeneeded = null;
	};
	IDBOpenDBRequest.prototype = new IDBRequest();
	IDBOpenDBRequest.prototype.constructor = IDBOpenDBRequest;

}(window, window.indexedDB, window.indexedDB.util));
