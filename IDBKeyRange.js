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

	IDBKeyRange._ensureKeyRange = function (arg)
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
	};

	IDBKeyRange._clone = function (range)
	{
		return util.IDBKeyRange.bound(range.lower, range.upper, range.lowerOpen, range.upperOpen);
	};

	IDBKeyRange.prototype._getSqlFilter = function (keyColumnName)
	{
		if (keyColumnName == undefined) keyColumnName = "key";

		var sql = [], args = [];
		var hasLower = this.lower != null, hasUpper = this.upper != null;

		if (hasLower && hasUpper && !this.lowerOpen && !this.upperOpen)
		{
			sql.push("(key = ?)");
			args = [this.lower];
		}
		else
		{
			if (hasLower)
			{
				sql.push("(key >" + (this.lowerOpen ? "" : "=") + " ?)");
				args.push(w_JSON.stringify(this.lower));
			}
			if (hasUpper)
			{
				sql.push("(key <" + (this.upperOpen ? "" : "=") + " ?)");
				args.push(w_JSON.stringify(this.upper));
			}
		}
		return { sql : sql.join(" AND "), args : args };
	};

	// Utils
	var w_JSON = window.JSON;

}(window, window.indexedDB.util));
