export default Ember.Controller.extend({
	uploadBandwidth: null,
	uploadBandwidthTotal: null,
	downloadBandwidth: null,
	downloadBandwidthTotal: null,
	cacheUsed: null,
	cacheUsedTotal: null,
	cloudFileCount: null,
	cloudFileSize: null,
	syncFileCount: null,
	syncFileSize: null,
	datacoinAddress: null,
	datacoinBalance: null,
	sockets: {
		status: function(data) {
			this.setProperties({
				datacoinAddress: data.datacoin.address,
				datacoinBalance: data.datacoin.balance,
				uploadBandwidth: data.bandwidth.current.incoming,
				uploadBandwidthTotal: data.bandwidth.total.incoming,
				downloadBandwidth: data.bandwidth.current.outgoing,
				downloadBandwidthTotal: data.bandwidth.total.outgoing,
				cacheUsed: data.storage.used,
				cacheUsedTotal: data.storage.capacity,
				cloudFileCount: data.sync.cloud_queue.count,
				cloudFileSize: data.sync.cloud_queue.size,
				syncFileCount: data.sync.blockchain_queue.count,
				syncFileSize: data.sync.blockchain_queue.size
			});
			console.log(data);
		}
	}
})