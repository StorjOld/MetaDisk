if (window.indexedDB.polyfill)
(function(window, indexedDB, util, undefined)
{
	var IDBRequest = util.IDBRequest = window.IDBRequest = function(source)
	{
		this.result = null;
		this.error = null;
		this.source = source;
		this.transaction = null;
		this.readyState = null;
		this.onsuccess = null;
		this.onerror = null;
	};
	IDBRequest.LOADING = "pending";
	IDBRequest.DONE = "done";

	var IDBOpenDBRequest = util.IDBOpenDBRequest = window.IDBOpenDBRequest = function(source)
	{
		IDBRequest.call(this, arguments);
		this.onblocked = null;
		this.onupgradeneeded = null;
	};
	IDBOpenDBRequest.prototype = new IDBRequest();
	IDBOpenDBRequest.prototype.constructor = IDBOpenDBRequest;

}(window, window.indexedDB, window.indexedDB.util));
