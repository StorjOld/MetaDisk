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
	maxFileSize: null,
	currentToken: null,
	currentFileList: function() {
		var listing =  this.get('store').findQuery('token', {token: this.get('currentToken')}).get('hashes');
		return listing ? listing : []; 
	}.property('currentToken'),
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
				syncFileSize: data.sync.blockchain_queue.size,
				maxFileSize: data.storage.max_file_size
			});
		}
	},

	actions: {
		notify: function(subject, body) {
			if (Notification && Notification.permission !== 'granted') {
				Notification.requestPermission(function(status) {
					if (Notification.permission !== status) {
						Notification.permission = status;
					}
				});
			} else if (Notification && Notification.permission === 'granted') {
				var notification = new Notification(subject, {body: body, icon: '/assets/images/storj.ico'});
				setTimeout(function(){ notification.close(); }, 4000);
			} else if (Notification && Notification.permission !== 'denied') {
				Notification.requestPermission(function(status) {
					if (Notification.permission !== status) {
						Notification.permission = status;
					}

					if (status === 'granted') {
						var notification = new Notification(subject, {body: body, icon: '/assets/images/storj.ico'});
						setTimeout(function(){ notification.close(); }, 4000);
					} else {
						alert(body);
					}
				})
			} else {
				alert(body);
			}
		}
	}
});