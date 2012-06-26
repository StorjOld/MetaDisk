var IDBCursorTests = new (function ()
{
	// Run
	this.run = function ()
	{
		module("IDBCursor");
		_test("Simple iteration", testIterateCursor);
	};

	// Environment
	var env =
	{
		dbname : "TestDatabase",
		dbversion : 10,
		// exists
		people :
		{
			name : "People",
			records :
			[
				{ key : 2, value : { name : "Adam", age : 32} },
				{ key : 5, value : { name : "Brad", age : 28} },
				{ key : 8, value : { name : "John", age : 53} },
				{ key : 9, value : { name : "Mark", age : 21} }
			]
		}
	};

	// Tests
	function testIterateCursor(db)
	{
		expect(9);
		var tx = db.transaction([env.people.name]);
		var people = tx.objectStore(env.people.name);

		var first = [];
		people.openCursor(IDBKeyRange.lowerBound(6)).onsuccess = function (e)
		{
			var cursor = e.target.result;
			if (!cursor)
			{
				equal(first.length, 2, "keyRange [6;∞]. Two items should be iterated");
				equal(first[0].value.name, env.people.records[2].value.name, "keyRange [6;∞]. Name mismatch");
				equal(first[1].value.name, env.people.records[3].value.name, "keyRange [6;∞]. Name mismatch");
				return;
			}
			first.push({ key : cursor.key, value : cursor.value });
			cursor.continue();
		};

		var second = [];
		people.openCursor(IDBKeyRange.bound(2, 8, true, false), IDBCursor.PREV).onsuccess = function (e)
		{
			var cursor = e.target.result;
			if (!cursor)
			{
				equal(second.length, 2, "keyRange [8;2). Two items should be iterated");
				equal(second[0].value.name, env.people.records[2].value.name, "keyRange [8;2). Name mismatch");
				equal(second[1].value.name, env.people.records[1].value.name, "keyRange [8;2). Name mismatch");
				return;
			}
			second.push({ key : cursor.key, value : cursor.value });
			cursor.continue();
		};

		var third = [];
		people.openCursor(2, IDBCursor.PREV).onsuccess = function (e)
		{
			var cursor = e.target.result;
			if (!cursor)
			{
				equal(third.length, 1, "key = 2. One item should be iterated");
				equal(third[0].value.name, env.people.records[0].value.name, "key = 2. Name mismatch");
				return;
			}
			third.push({ key : cursor.key, value : cursor.value });
			cursor.continue();
		};

		var forth = [];
		people.openCursor().onsuccess = function (e)
		{
			var cursor = e.target.result;
			if (!cursor)
			{
				var n = env.people.records.length;
				equal(forth.length, n, "No keyRange. " + n +" items should be iterated");
				return;
			}
			forth.push({ key : cursor.key, value : cursor.value });
			cursor.continue();
		}
	}

	// Utils

	function _test(name, fn)
	{
		QUnit.asyncTest(name, function ()
		{
			var promise = TestUtils.initDBPromise(env.dbname, env.dbversion, function (db)
			{
				var people = db.createObjectStore(env.people.name, { });
				for (var i = 0; i < env.people.records.length; i++)
				{
					var record = env.people.records[i];
					people.add(record.value, record.key)
				}
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
					db.close();
					setTimeout(start, 0);
				};
			});
		});
	}
});
