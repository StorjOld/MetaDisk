export default DS.IndexedDBAdapter.extend({
  databaseName: 'metadisk',
  version: 7,
  smartSearch: true,
  migrations: function() {
    this.addModel('token');
    this.addModel('file');
  }
});