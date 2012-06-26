var PerformanceTests = new (function ()
{
	// Run
	this.run = function ()
	{
		module("Performance Tests");
		_test("Data adding", testDataAdding);
		//asyncTest("Cursor reading", testPrevCursor);
	};

	// Env
	var env =
	{
		dbname : "TestDatabase",
		dbversion : 10,
		// exists
		people : "People"
	};

	// Tests
	function testDataAdding(db)
	{
		var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
		function randomStr(lower, upper)
		{
			var length = Math.floor(Math.random() * (upper - lower)) + lower;
			var result = '';
			for (var i = 0; i < length; i++)
			{
				result += chars[Math.floor(Math.random() * chars.length)];
			}
			return result;
		}

		var startTime = new Date();
		var count = 100000;
		var tx = db.transaction([env.people], IDBTransaction.READ_WRITE);
		tx.oncomplete = function ()
		{
			var time = (new Date() - startTime);
			ok(true, "Time elapsed: " + time + "ms");
			db.close();
			start();
		};

		var people = tx.objectStore(env.people);

		while (count-- > 0)
		{
			var addr = people.add({
					name : randomStr(10, 25),
					country : randomStr(4, 15),
					another_property : randomStr(1, 11),
					and_other_property : randomStr(3, 8)
				},
				randomStr(3, 5) + count);
			addr.onerror = function (e)
			{
				console.log(e);
			}
		}
		ok(true, "Finished");
	}

	function testPrevCursor()
	{
		indexedDB.open(env.dbname).onsuccess = function (openEvent)
		{
			var db = openEvent.target.result;
			var startTime = new Date();
			var count = 0;
			var tx = db.transaction([env.people], IDBTransaction.READ_ONLY);
			var txcomplete = false;
			tx.oncomplete = function ()
			{
				var time = (new Date() - startTime);
				ok(true, "Time elapsed: " + time + "ms. " + count + " records have been read.");
				txcomplete = true;
				db.close();
				start();
			};

			var people = tx.objectStore(env.people);
			var request = people.openCursor();
			request.onsuccess = function (e)
			{
				var cursor = e.target.result;
				if (!cursor) return;

				var key = cursor.key;
				var value = cursor.value;
				count++;
				if (txcomplete) ok(true, "Tx is complete, but records keep being iterated");
				cursor.continue();
			};
			request.onerror = function (e)
			{
				console.log(e);
				start();
			};
		};
	}



	// Utils
	function _test(name, fn)
	{
		QUnit.asyncTest(name, function ()
		{
			var promise = TestUtils.initDBPromise(env.dbname, env.dbversion, function (db)
			{
				db.createObjectStore(env.people, { });
			});
			promise.fail(function (e)
			{
				ok(false, "Testing environment initialization failure. ", e);
				start();
			});
			promise.done(function (e)
			{
				var request = indexedDB.open(env.dbname);
				request.onsuccess = function (e)
				{
					var db = request.result;
					fn(db);
				};
			});
		});
	}
});
