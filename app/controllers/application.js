export default Ember.ObjectController.extend({
	baseUrl: 'http://node2.storj.io',
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
	currentTokenRecord: null,
	currentTokenBandwidth: 0,
	currentTokenStorage: 0,
	currentFileList: null,
	setCurrentTokenRecord: function() {
		this.store.find('token').then(function(records) {
			var record = records.filterProperty('token', this.get('currentToken'))[0];
			this.set('currentTokenRecord', record);
			this.set('currentTokenBandwidth', record.get('yourBandwidth'));
			this.set('currentTokenStorage', record.get('estimatedStorage'));
			this.set('currentFileList', record.get('files'));
		}.bind(this));
	}.observes('currentToken'),
	setupToken: function() {
		var model = this.get('model');

		if (model.get('length') === 0) {
			$.ajax(this.get('baseUrl') + '/accounts/token/new', {type: 'POST'})
				.fail(function() {
					this.send('notify', 'Uh-Oh', 'Metadisk was unable to generate your access token.');
				}.bind(this)
			).then(function(response) {
				var newRecord = this.store.createRecord('token', {token: response.token});
				newRecord.save();
				this.set('currentToken', response.token);
			}.bind(this));
		}
		if (!this.get('currentToken')) {
			this.set('currentToken', model.get('firstObject').get('token'));
		}
	}.observes('model'),
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
		updateCurrentToken: function(token) {
			this.set('currentToken', token);
		},
		generateToken: function() {
			$.ajax(this.get('baseUrl') + '/accounts/token/new', {type: 'POST'})
				.fail(function() {
					this.send('notify', 'Uh-Oh', 'Metadisk was unable to retrieve a new access token.');
				}.bind(this)
			).then(function(response) {
				var newRecord = this.store.createRecord('token', {token: response.token});
				newRecord.save();
				this.send('notify', 'Success', 'Metadisk retrieved a new access token.');
			}.bind(this));
		},
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
		},
		handleFiles: function(file) {
			//REMOVE BANDWIDTH CHECK HACK WHEN READY
			if (file.size > this.get('maxFileSize')) {
				this.send('notify', 'Uh-Oh', file.name + ' is too large to be uploaded to this node.');
			} else if (file.size === this.get('currentTokenBandwidth')) {
				this.send('notify', 'Uh-Oh', 'You do not have enough bandwidth to upload ' + file.name + ' to this node. Please purchase additional bandwidth.');
			} else {
				var reader = new FileReader();
				var xhr = new XMLHttpRequest();
				var fd = new FormData();
				var fileRecord = this.store.createRecord('file', {title: file.name, fileSize: file.size});
				this.get('currentTokenRecord').get('files').then(function(files){
					files.unshiftObject(fileRecord);
				});

				xhr.upload.addEventListener('progress', function(e) { 
					if (e.lengthComputable) {
						fileRecord.set('bytesUploaded', e.loaded);
					}
				}, false);

				xhr.upload.addEventListener('load', function(e) {
					fileRecord.set('bytesUploaded', file.size);
				}, false);

				xhr.open('POST', this.get('baseUrl') + '/api/upload', true);
				
				fd.append('token', this.get('currentToken'));
				fd.append('file', file);

				xhr.onreadystatechange = function() {
					if (xhr.readyState === 4) {
						var responseCode = xhr.status;
						var responseText = JSON.parse(xhr.responseText);

						if (responseCode === 402) {
							this.get('currentTokenRecord').get('files').removeObject(fileRecord);
							this.send('notify', 'Uh-Oh', file.name + ' could not be uploaded due to insufficient balance.');
						} else if (responseCode === 500) {
							this.get('currentTokenRecord').get('files').removeObject(fileRecord);
							this.send('notify', 'Uh-Oh', file.name + ' could not be uploaded due to a server error.');
						} else if (responseCode === 201) {
							fileRecord.set('hash', responseText.filehash);
							fileRecord.set('key', responseText.key);
							fileRecord.save().then(function() {
								this.get('currentTokenRecord').save();
							}.bind(this));

							this.send('notify', 'Success', file.name + ' was successfully uploaded.');
						}
					}
				}.bind(this);

				xhr.send(fd);
			}
		}
	}
});