if (window.indexedDB.polyfill)
(function(window, util, undefined)
{
	var IDBKeyRange = util.IDBKeyRange = window.IDBKeyRange = function (lower, upper, lowerOpen, upperOpen)
	{
		this.lower = lower;
		this.upper = upper;
		this.lowerOpen = lowerOpen || false;
		this.upperOpen = upperOpen || false;
	};

	IDBKeyRange.only = function (value)
	{
		return new IDBKeyRange(value, value, false, false)
	};

	IDBKeyRange.lowerBound = function (lower, open)
	{
		return new IDBKeyRange(lower, undefined, open || false, true);
	};

	IDBKeyRange.upperBound = function (upper, open)
	{
		return new IDBKeyRange(undefined, upper, true, open || false);
	};

	IDBKeyRange.bound = function (lower, upper, lowerOpen, upperOpen)
	{
		return new IDBKeyRange(lower, upper, lowerOpen || false, upperOpen || false);
	};

	IDBKeyRange.ensureKeyRange = function (arg)
	{
		if (arg == null)
		{
			return util.IDBKeyRange.bound();
		}
		if ((arg instanceof util.IDBKeyRange))
		{
			return arg;
		}
		return util.IDBKeyRange.only(arg);
	}

}(window, window.indexedDB.util));
