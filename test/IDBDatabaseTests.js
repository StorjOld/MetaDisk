var IDBDatabaseTests = new (function ()
{
	// Run
	this.run = function ()
	{
		module("IDBDatabase.createObjectStore");
		_test("Simple create and delete object stores", testSimpleCreateObjectStores);
		_test("Create and delete ObjectStore outside a transaction", testCreateDeleteObjectStoreOutsideTransaction);
		_test("Create ObjectStore exceptions", testCreateObjectStoreErrors);
	};

	// Environment
	var env =
	{
		dbname : "TestDatabase",
		dbversion : 10,
		// exists
		people : "People",
		cars : "Cars",
		// to delete
		insects : "Insects",
		// to add
		models : "Models"
	};
	var db = null;


	// Tests
	function testSimpleCreateObjectStores()
	{
		expect(6);
		var request = indexedDB.open(env.dbname, env.dbversion + 1);
		request.onupgradeneeded = function(e)
		{
			db = request.result;
			db.createObjectStore(env.models, { });
			equal(db.objectStoreNames.length, 4, "Number of object stores should be 4");

			db.deleteObjectStore(env.insects);
			equal(db.objectStoreNames.length, 3, "Number of object stores is again should be 3");
		};
		request.onsuccess = function (e)
		{
			request.result.close();

			var request2 = indexedDB.open(env.dbname);
			request2.onsuccess = function (e)
			{
				var stores = request2.result.objectStoreNames;
				equal(stores.length, 3, "There must be 3 object stores");
				ok(stores.contains(env.people), "'" + env.people + "' object store is absent");
				ok(stores.contains(env.cars), "'" + env.cars + "' object store is absent");
				ok(stores.contains(env.models), "'" + env.models + "' object store is absent");
				request2.result.close();
				start();
			};
			request2.onerror = request2.onblocked = request2.onupgradeneeded = TestUtils.shouldNotReachHereCallback;
		};
		request.onerror = request.onblocked = TestUtils.shouldNotReachHereCallback;
	}

	function testCreateDeleteObjectStoreOutsideTransaction()
	{
		expect();
		indexedDB.open(env.dbname).onsuccess = function (e)
		{
			var db = e.target.result;

			try { db.createObjectStore(env.models); }
			catch (ex)
			{
				ok(true, "Create ObjectStore outside of 'versionchange' transaction");
			}

			try { db.deleteObjectStore(env.cars); }
			catch (ex)
			{
				ok(true, "Delete ObjectStore outside of 'versionchange' transaction");
			}
			db.close();
			start();
		};
	}

	function testCreateObjectStoreErrors()
	{
		expect(7);
		var request = indexedDB.open(env.dbname, env.dbversion + 1);
		var storeCount = 0;
		request.onupgradeneeded = function(e)
		{
			db = request.result;
			storeCount = db.objectStoreNames.length;
			try { db.createObjectStore(env.people); }
			catch (ex)
			{
				ok(true, "ConstraintError. ObjectStore already exists");
			}
			try { db.createObjectStore("store", { keyPath : { random : "object" }}); }
			catch (ex)
			{
				ok(true, "SyntaxError. keyPath is not string or array");
			}
			try { db.createObjectStore("store2", { keyPath : "prop1._prop2.3_invalidprop"}); }
			catch (ex)
			{
				ok(true, "SyntaxError. keyPath has illegal identifier");
			}
			try { db.createObjectStore("store3", { keyPath : ["prop1", "2"]}); }
			catch (ex)
			{
				ok(true, "SyntaxError. keyPath is array, but has illegal identifier");
			}
			try { db.createObjectStore("store4", { keyPath : ["prop1", "prop2.sub"], autoIncrement : true }); }
			catch (ex)
			{
				ok(true, "InvalidAccessError. AutoIncrementing can be applied to keyPathes with primitive types");
			}
			
			if (TestUtils.chromeIndexedDB)
			{
				ok(true, "Chrome browser. Skipped test \"AutoIncrementing cannot be applied to empty keyPath\"");
				db.createObjectStore("store", { keyPath :  ["prop1"]});
			}
			else
			{
				try { db.createObjectStore("store5", { keyPath : "", autoIncrement : true }); }
				catch (ex)
				{
					ok(true, "InvalidAccessError. AutoIncrementing cannot be applied to empty keyPath");
				}
				db.createObjectStore("store", { keyPath :  ["prop1", "prop2.sub21.sub23", "prop3.sub3"]});				
			}
			db.createObjectStore("store2", { keyPath : "prop.sub", autoIncrement : true });
		};
		request.onsuccess = function (e)
		{
			e.target.result.close();
			var request2 = indexedDB.open(env.dbname);
			request2.onsuccess = function (e2)
			{
				var count = e2.target.result.objectStoreNames.length;
				equal(count, storeCount + 2, "Number ObjectStores should increment by 2");
				e2.target.result.close();
				start();
			};
			request2.onerror = request2.onblocked = request2.onupgradeneeded = TestUtils.shouldNotReachHereCallback;
		};
		request.onerror = request.onblocked = TestUtils.shouldNotReachHereCallback;
	}



	// Utils
	function _test(name, fn)
	{
		QUnit.asyncTest(name, function ()
		{
			var promise = TestUtils.initDBPromise(env.dbname, env.dbversion, function (db)
			{
				db.createObjectStore(env.cars);
				db.createObjectStore(env.people, { });
				db.createObjectStore(env.insects);
			});
			promise.fail(function (e)
			{
				ok(false, "Testing environment initialization failure. ", e);
				start();
			});
			promise.done(function (e) { fn(); });
		});

	}
});
