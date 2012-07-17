var IDBFactoryTests = new (function ()
{
	// Run
	this.run = function ()
	{
		/*
		 * 1. If !version && !database => set database version to 1 (Chrome: '', Firefox: 1);
		 * 2. If version && !database => set database version to 0 (Chrome: '', Firefox: version);
		 * 3. If !version && database => use the current database version;
		 * 4. If version && database =>
		 * 		a. if (version < db.version) => error;
		 * 		b. if (version > db.version) => VERSION_CHANGE;
		 * 		c. otherwise, just open;
		 */
		module("IDBFactory.open");
		_test("Create database with no version specified", testCreateDatabase);
		_test("Create database with version", testCreateDatabaseWithVersion);
		_test("Open existing database with no version specified", testOpenExistingDatabase);
		_test("Open existing database with lower version", testOpenExistingDatabaseWithLowerVersion);
		_test("Open existing database with higher version", testOpenExistingDatabaseWithHigherVersion);
		_test("Open existing database with same version", testOpenExistingDatabaseWithSameVersion);

		module("IDBFactory.deleteDatabase");

		module("IDBFactory.cmp");
		test("cmp", testCmp);
	};

	// Environment
	var env =
	{
		// Created
		db : {
			name : "TestDatabase",
			version : 20
		},

		// Not created
		db2 : {
			name : "TestDatabase2",
			version : 10
		}
	};

	// Tests
	function testCreateDatabase()
	{
		expect(8);
		var request = indexedDB.open(env.db2.name);
		notEqual(request, null, "IDBOpenDBRequest object is null.");

		request.onupgradeneeded = function (e)
		{
			ok(true, "Triggered onupgradeneeded.");
			var db = e.currentTarget.result;
			notEqual(db, null, "Database connection is null.");
			equal(e.oldVersion, 0, "oldVersion is 0.");
			equal(e.newVersion, 1, "newVersion is 1.");
			equal(db.version, 1, "Database version mismatch.");
		};
		request.onsuccess = function (e)
		{
			ok(true, "Triggered onsuccess.");
			equal(request.result.version, 1, "Database version mismatch.");
			request.result.close();
			start();
		};
		request.onerror = request.onblocked = TestUtils.shouldNotReachHereCallback;
	}

	function testCreateDatabaseWithVersion()
	{
		expect(6);
		var request = indexedDB.open(env.db2.name, 3);
		notEqual(request, null, "IDBOpenDBRequest object is null.");

		request.onupgradeneeded = function (e) {
			ok(true, "Triggered onupgradeneeded.");
			var db = e.currentTarget.result;
			notEqual(db, null, "Database connection is null.");
			equal(e.oldVersion, 0, "oldVersion is 0.");
			equal(e.newVersion, 3, "newVersion is 3.");
		};
		request.onsuccess = function (e) {
			ok(true, "Triggered onsuccess.");
			request.result.close();
			start();
		};
		request.onerror = request.onblocked = TestUtils.shouldNotReachHereCallback;
	}

	function testOpenExistingDatabase()
	{
		expect(4);
		var request = indexedDB.open(env.db.name);
		notEqual(request, null, "IDBOpenDBRequest object is null.");
		request.onsuccess = function (e)
		{
			ok(true, "Triggered onsuccess.");
			var db = request.result;
			notEqual(db, null, "Database connection is null.");
			equal(db.version, env.db.version, "Version mismatch.");
			request.result.close();
			start();
		};
		request.onupgradeneeded = request.onerror = request.onblocked = TestUtils.shouldNotReachHereCallback;
	}

	function testOpenExistingDatabaseWithLowerVersion()
	{
		expect(8);
		var request = indexedDB.open(env.db.name, env.db.version + 2);
		notEqual(request, null, "IDBOpenDBRequest object is null.");

		request.onupgradeneeded = function (e)
		{
			ok(true, "Triggered onupgradeneeded.");
			var db = e.currentTarget.result;
			notEqual(db, null, "Database connection is null.");
			equal(e.oldVersion, env.db.version, "oldVersion mismatch.");
			equal(e.newVersion, env.db.version + 2, "newVersion mismatch.");
			equal(db.version, env.db.version + 2, "Database version mismatch.");
		};
		request.onsuccess = function (e) {
			ok(true, "Triggered onsuccess.");
			equal(request.result.version, env.db.version + 2, "Database version mismatch.");
			request.result.close();
			start();
		};
		request.onerror = request.onblocked = TestUtils.shouldNotReachHereCallback;
	}

	function testOpenExistingDatabaseWithSameVersion()
	{
		expect(4);
		var request = indexedDB.open(env.db.name, env.db.version);
		notEqual(request, null, "IDBOpenDBRequest object is null.");

		request.onsuccess = function (e) {
			ok(true, "Triggered onsuccess.");
			var db = e.currentTarget.result;
			notEqual(db, null, "Database connection is null.");
			equal(db.version, env.db.version, "Version mismatch.");
			request.result.close();
			start();
		};
		request.onupgradeneeded = request.onerror = request.onblocked = TestUtils.shouldNotReachHereCallback;
	}

	function testOpenExistingDatabaseWithHigherVersion()
	{
		expect(3);
		var request = indexedDB.open(env.db.name, env.db.version - 2);
		notEqual(request, null, "IDBOpenDBRequest object is null.");

		request.onerror = function (e)
		{
			e.preventDefault();
			ok(true, "Triggered onerror.");
			equal(request.result, null, "Database connection should be null.");
			start();
		};
		request.onupgradeneeded = request.onsuccess = request.onblocked = TestUtils.shouldNotReachHereCallback;
	}

	function testCmp()
	{
		ok(indexedDB.cmp(10, 2.57) == 1);
		ok(indexedDB.cmp(3.5, 3.7) == -1);
		ok(indexedDB.cmp(-46.31, 31.7) == -1);
		ok(indexedDB.cmp(26.31, -31.7) == 1);
		ok(indexedDB.cmp(26.31, -11.7) == 1);
		ok(indexedDB.cmp(-26.31, -11.7) == -1);

		var r = function (o) { return indexedDB.util.decodeKey(indexedDB.util.encodeKey(o)); };
		var t = function (o) { return JSON.stringify(r(o)); };
		var myok = function (o) { ok(t(o) == JSON.stringify(o), "Actual " + t(o)+", expected " + JSON.stringify(o))};
		myok(-4.35);
		myok(0);
		myok([]);
		myok([[[]]]);
		myok([[[[]]]]);
		myok([[2],1]);
		myok([[[[[[[[[[],0],1],2],3],4],5],6],7],8]);
	}

	// Utils
	function _test(name, fn)
	{
		QUnit.asyncTest(name, function ()
		{
			var promise = $.when(
				TestUtils.deleteDBPromise(env.db2.name),
				TestUtils.initDBPromise(env.db.name, env.db.version));

			promise.fail(function (e)
			{
				ok(false, "Testing environment initialization failure. ");
				console.warn(e);
				start();
			});
			promise.done(function (e)
			{
				try { fn(); }
				catch (ex)
				{
					console.warn(ex);
					ok(false, "Exception thrown. " + ex);
					start();
				}
			});
		});
	}
});
