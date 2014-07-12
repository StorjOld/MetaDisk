export default DS.IndexedDBAdapter.extend({
  databaseName: 'metadisk',
  version: 1,
  migrations: function() {
    this.addModel('token');
    this.addModel('hash-key');
  }
});