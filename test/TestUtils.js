var TestUtils = new (function()
{
	this.deleteDBPromise = function (name)
	{
		var deferred = $.Deferred();
		var request = indexedDB.deleteDatabase(name);
		request.onsuccess = function (e)
		{
			console.debug("Init. Database '" + name + "' has been deleted successfully.");
			deferred.resolve(e);
		};
		var fn = function (e)
		{
			console.error("Init. Database '" + name + "'  deletion failed.", e);
			deferred.reject(e);
		};
		request.onupgradeneeded = fn;
		request.onerror = fn;
		request.onblocked = fn;
		return deferred.promise();
	};

	this.initDBPromise = function (name, version, upgradeCallback)
	{
		var deferred = $.Deferred();
		var deletePromise = TestUtils.deleteDBPromise(name);
		deletePromise.done(function (e)
		{
			var isNew = false;
			var request = indexedDB.open(name, version);
			request.onupgradeneeded = function (e)
			{
				console.debug("Init. Database '" + name + "' has been created successfully.");
				isNew = true;
				if (upgradeCallback) upgradeCallback(e.target.result);
			};
			request.onsuccess = function (e)
			{
				e.target.result.close();
				if (isNew) deferred.resolve(e);
				else deferred.reject(e);
			};
			request.onerror = deferred.reject;
			request.onblocked = deferred.reject;
		});
		deletePromise.fail(deferred.reject);
		return deferred.promise();
	};

	this.shouldNotReachHereCallback =  function (e)
	{
		console.error("Should not reach here. ", e);
		ok(false, "Should not reach here.");
		e.target.result && e.target.result.close && e.target.result.close();
		start();
	};

	// Extend environment
	Array.prototype.contains = function (item)
	{
		return this.indexOf(item) >= 0;
	}
	
	// Chrome indexedDB detection
	this.chromeIndexedDB = (function()
	{
		return (/chrome/.test(navigator.userAgent.toLowerCase())) && (webkitIDBDatabase != null);
	}());
	
	// Deferred Request Aggregator
	var RequestDeferred = function ()
	{
		this.add(arguments[0]);
	}
	RequestDeferred.prototype = (function()
	{
		var me = 
		{
			onsuccess : null,
			onerror : null
		};
		var masterDeferred = null;
		
		me.add = function ()
		{
			var args = arguments[0];
			for (var i = 0; i < args.length; i++)
			{
				var deferred = $.Deferred();
				var arg = args[i];
				if (typeof arg.onsuccess != "undefined")
					arg.onsuccess = deferred.resolve;
				if (typeof arg.oncomplete != "undefined")
					arg.oncomplete = function (e)
				{
					deferred.resolve(e);
				}
				
				arg.onerror = deferred.reject;
				masterDeferred = masterDeferred ? $.when(masterDeferred, deferred) : deferred;
			}
		}
		me.done = function (fn)
		{
			return masterDeferred.done(fn);
		}
		me.fail = function (fn)
		{
			return masterDeferred.fail(fn);
		}
		me.then = function (fn)
		{
			return masterDeferred.then(fn);
		}
		return me;
	}());
	RequestDeferred.prototype.constructor = RequestDeferred;
	
	this.deferred = function()
	{
		return new RequestDeferred(arguments);
	}

	// C#-like String.format
	String.prototype.format = function() {
		var s = this;
		for (var i = 0; i < arguments.length; i++) {
			var reg = new RegExp("\\{" + i + "\\}", "gm");
			s = s.replace(reg, arguments[i]);
		}
		return s;
	}
});
