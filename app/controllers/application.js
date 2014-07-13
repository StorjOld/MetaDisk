export default Ember.ObjectController.extend({
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
	setupToken: function() {
		var model = this.get('model');

		if (model.get('length') === 0) {
			$.ajax('http://node2.storj.io/accounts/token/new', {type: 'POST'})
				.fail(function() {
					this.send('notify', 'Uh-Oh', 'Metadisk was unable to retrieve a new access token.');
				}.bind(this))
				.then(function(response) {
					var newToken = response.token;
					var newRecord = this.store.createRecord('token', {token: newToken});
					newRecord.save();
					this.set('currentToken', newToken);
				}.bind(this));
		}

		if (!this.get('currentToken')) {
			this.set('currentToken', model.get('firstObject').get('token'));
		}
	}.observes('model'),
	currentFileList: function() {
		var currentToken = this.get('currentToken');
		var listing = this.store.find('token', {token: currentToken});
		return listing ? listing.get('hashes') : []; 
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
				setTimeout(function(){ notification.close(); }, 6000);
			} else if (Notification && Notification.permission !== 'denied') {
				Notification.requestPermission(function(status) {
					if (Notification.permission !== status) {
						Notification.permission = status;
					}

					if (status === 'granted') {
						var notification = new Notification(subject, {body: body, icon: '/assets/images/storj.ico'});
						setTimeout(function(){ notification.close(); }, 6000);
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