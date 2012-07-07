(function ()
{
	var files = [
		"lib/jquery-1.7.2.js",
		"indexedDB.init.js",
		"IDBRequest.js",
		"IDBFactory.js",
		"IDBDatabase.js",
		"IDBTransaction.js",
		"IDBObjectStore.js",
		"IDBCursor.js",
		"IDBKeyRange.js",
		"IDBIndex.js"
	];


	function loadScript(i)
	{
		var s = document.createElement('script');
		s.type = 'text/javascript';
		s.async = false;
		s.src = "/git/" + files[i];
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
		loadScript(i);
	}
}());
