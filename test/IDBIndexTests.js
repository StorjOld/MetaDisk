var IDBIndexTests = new (function ()
{
	// Run
	this.run = function ()
	{
		module("IDBIndex.");
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


	// Tests



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
