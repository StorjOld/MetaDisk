Archived Repo
=============
**This is an archived project and is no longer supported or updated by Facebook. Please do not file issues or pull-requests against this repo. If you wish to continue to develop this code yourself, we recommend you fork it.**

**Proceed and be bold!**


IndexedDB Polyfill
==================

### Contents
1. Introduction
2. Using the library
3. Unit Tests
4. Performance Tests
5. Open issues
6. License
7. References

### 1. Introduction
Indexed Database API, or IndexedDB API, on its own is an API for browsers to support client-side storages. This API is implemented on Mozilla Firefox (since version 4), and Google Chrome (since version 11), and should be implemented in Internet Explorer in the next release version 10 [\[1\]][1]. However it is unknown whether it will be implemented by other browsers, as you can see from the link.

[Polyfilling] [polyfill-wiki] fills that gap by relying on the other capabilities of a browser. So "IndexedDB polyfill" is just a project that is intended to make other browsers "mimic" IndexedDB API. It uses Web SQL Database API, which is another client-side storage API, as a back-end.

The core design of IndexedDB API is databases with key-value tables, which are called ObjectStores. However unlike basic localStorage (sessionStorage), caching and other "key-value" alike storage APIs, it supports Indexing, Cursors, Key Generators, and Transactions. The IndexedDB API documentation[\[2\]][2] describes both synchronous and asynchronous API, but only the second one is implemented in Mozilla and Chrome. In general, the API is pretty flexible.

Documentation: <http://www.w3.org/TR/IndexedDB>


### 2. Using the library
All you have to do is to include _indexeddb.polyfill.js_ file into your web page:

> `<`script type="text/javascript" src="indexedDB.polyfill.js">`<`/script>

If the target browser does not support IndexedDB, the polyfill automatically creates _indexedDB_ global object and thus exposes its functionality. So you do not have to modify anything in your existing project with IndexedDB code. If the target browser has native implementation of IndexedDB, the polyfill will not interfere with it.

To force using polyfill append the following script before including the polyfill:

>window.indexedDB = { polyfill : true };

###3. Unit Tests

To run unit tests open _index.html_ in target browser. To verify unit tests against Firefox's native implementation of IndexedDB API, open the same page through web (http) server. Because, otherwise Firefox does not let to create IndexedDB databases under localhost origin.

The project also includes tests imported from [W3C-tests.org] [3] (see References section)

### 4. Performance Tests
All the database related routines, such as adding, deleting, clearing, creating indexes, cursors, can be tested for performance benchmarks using _test/benchmark.html_ tool.

### 5. Open issues

Currently, the project has lack of JavaScript Date Object support when storing and reading it from ObjectStore. This is because values (not keys) are encoded and decoded using JSON serialization which does not parse date back to JavaScript Date Object.


### 6. License

The software is distributed under [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0.txt)

### 7. Rerencess
1. Test suits <http://w3c-test.org/webapps/IndexedDB/>;
2. Mozilla IndexedDB implementation: <http://hg.mozilla.org/mozilla-central/file/895e12563245/dom/indexedDB/>;


[1]: http://caniuse.com/indexeddb
[polyfill-wiki]: http://en.wikipedia.org/wiki/Polyfill
[2]: http://www.w3.org/TR/IndexedDB/
[3]: w3c-test.org/webapps/IndexedDB/tests/submissions/
