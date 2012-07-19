(function ()
{
	var files = [
		"lib/jquery-1.7.2.js",
		"indexedDB.init.js",
		"webSql.js",
		"key.js",
		"IDBRequest.js",
		"IDBFactory.js",
		"IDBDatabase.js",
		"IDBTransaction.js",
		"IDBObjectStore.js",
		"IDBCursor.js",
		"IDBKeyRange.js",
		"IDBIndex.js"
	];


	function loadScript(source)
	{
		var s = document.createElement('script');
		s.type = 'text/javascript';
		s.async = false;
		s.src = source;
		var x = document.getElementsByTagName('script')[0];
		x.parentNode.insertBefore(s, x);
	}

	//loadScript(0);
	if (!(/Firefox[\/\s](\d+\.\d+)/.test(navigator.userAgent)))
	{
		window.indexedDB = { polyfill : true };
	}
	for (var i = 1; i < files.length; i++)
	{
		loadScript(files[i]);
	}
}());
