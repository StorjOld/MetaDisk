import Ember from 'ember';
import config from '../config/environment';

export default Ember.ObjectController.extend({
	downloadUrl: null,
	copyValue: null,
	uploadBandwidth: null,
	uploadBandwidthTotal: null,
	downloadBandwidth: null,
	downloadBandwidthTotal: null,
	cacheUsed: null,
	cacheUsedTotal: null,
	cloudFileCount: null,
	cloudFileSize: null,
	maxFileSize: null,
	currentToken: null,
	currentTokenRecord: null,
	currentFileList: null,
	uploadsStarted: 0,
	uploadsCompleted: 0,
	searchValue: null,
	abortedFilename: '',
	accountsEnabled: function() {
		// Indicates whether accounts feature should be enabled or not
		// based upon ENV variable.
		return config.APP.ACCOUNTS_ENABLED;
	}.property(),

	baseUrl: function() {
		return EmberENV.environment === 'development' ? 'http://node3.metadisk.org' : 'http://' + window.location.hostname;
	}.on('init').property(),
	copiedFile: function() {
		var copyValue = this.get('copyValue');
		if (copyValue) {
			this.send('notify', 'Success', 'The ' + copyValue + ' was successfully copied.');
		}
		this.set('copyValue', null);
	}.observes('copyValue'),
	downloadFile: function() {
		var url = this.get('downloadUrl');
		$.ajax(url, {
			statusCode: {
				500: function() {
					this.send('notify', 'Uh-Oh', 'Metadisk was unable to download your file. Please wait for the file to sync to the cloud or try again later.');
				}.bind(this),
				404: function() {
					this.send('notify', 'Uh-Oh', 'A file with this specified key and/or hash was not found and could not be downloaded.');
				}.bind(this),
				402: function() {
					this.send('notify', 'Uh-Oh', 'You do not have sufficient balance to download this file. Please purchase additional bandwidth.');
				}.bind(this),
				200: function() {
					//201?
					this.send('updateBandwidth');
				}.bind(this)
			}
		});
	}.observes('downloadUrl'),
	notifyAccessGranted: function() {
		return Notification && Notification.permission === 'granted';
	}.on('init').property(),
	setCurrentTokenRecord: function() {
		this.store.filter('token', {token: this.get('currentToken')}, function(record) {
			this.set('currentTokenRecord', record);
		}.bind(this));
		this.send('updateBandwidth');
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
			this.send('updateBandwidth');
		}
	}.observes('model'),
	sockets: {
		status: function(data) {
			this.setProperties({
				uploadBandwidth: data.bandwidth.current.incoming,
				uploadBandwidthTotal: data.bandwidth.limits.incoming,
				downloadBandwidth: data.bandwidth.current.outgoing,
				downloadBandwidthTotal: data.bandwidth.limits.outgoing,
				cacheUsed: data.storage.used,
				cacheUsedTotal: data.storage.capacity,
				cloudFileCount: data.sync.cloud_queue.count,
				cloudFileSize: data.sync.cloud_queue.size,
				maxFileSize: data.storage.max_file_size
			});
		}
	},

	actions: {
		getFreeSpaceTemp: function() {
			var currentToken = this.get('currentToken');
			$.ajax({
				type:  'POST',
				 url:  this.get('baseUrl') + '/accounts/token/redeem/' + currentToken,
				 data: JSON.stringify({promocode:'PLEASE'}),
				 contentType: 'application/json; charset=UTF-8'
			}).done(function(){
				this.send('notify', 'Success', 'Metadisk has added 100MB of bandwidth to your current token on this node.');
			}.bind(this))
			.fail(function() {
				this.send('notify', 'Uh-Oh', 'Metadisk was unable to redeem your free space. Please remember that you can only ask for free space once per token.');
			}.bind(this));
		},
		updateCurrentToken: function(token) {
			this.set('currentToken', token);
		},
		updateBandwidth: function() {
			if (this.get('accountsEnabled')) {
				$.ajax(this.get('baseUrl') + '/accounts/token/balance/' + this.get('currentToken'))
				.fail(function() {
					this.send('notify', 'Uh-Oh', 'Metadisk was unable to sync your available bandwidth amount.');
				}.bind(this)
				).then(function(response) {
					var model = this.get('model').filterBy('token', this.get('currentToken'))[0];
					model.set('yourBandwidth', response.balance);
					model.save();
				}.bind(this));
			}	
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
			if (Notification && Notification.permission !== 'denied') {
				this.set('notifyAccessGranted', true);
			}

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
				});
			} else {
				alert(body);
			}
		},
		retrieveHashKey: function() {
			//searchValue
			var val = this.get('searchValue');
			var searchRegex = /[0-9a-zA-z]+\?key\=[0-9a-zA-z]+/;
			var searchHash = val.split('?key=')[0];
			var searchKey = val.split('?key=')[1];

			if (searchRegex.test(val)) {
				$.ajax(this.get('baseUrl') + '/api/find/' + searchHash)
					.fail(function() {
						this.send('notify', 'Uh-Oh', 'Metadisk was unable to find your file. Please be sure you typed your hash correctly.');
					}.bind(this)
				).then(function(response) {
					var newRecord = this.store.createRecord('file', {title: response.filename, hash: searchHash, key: searchKey, fileSize: response.filesize, bytesUploaded: response.filesize});
					this.get('currentTokenRecord.files').then(function(files) {
						files.unshiftObject(newRecord);
					}.bind(this));

					newRecord.save().then(function(){
						if (this.get('uploadsCompleted') === this.get('uploadsStarted')) {
							this.get('currentTokenRecord').save();
						}
					}.bind(this));
				}.bind(this));
			} else {
				this.send('notify', 'Uh-Oh', 'Your search query needs to be in the form [hash]?key=[key].');
			}

			this.set('searchValue', '');
		},
		handleFiles: function(file) {
			if (file.size > this.get('maxFileSize')) {
				this.send('notify', 'Uh-Oh', file.name + ' is too large to be uploaded to this node.');
			} else if (file.size > this.get('currentTokenRecord.yourBandwidth') && this.get('accountsEnabled')) {
				this.send('notify', 'Uh-Oh', 'You do not have enough bandwidth to upload ' + file.name + ' to this node. Please purchase additional bandwidth.');
			} else {
				var xhr = new XMLHttpRequest();
				var fd = new FormData();
				var fileRecord = this.store.createRecord('file', {title: file.name, fileSize: file.size});

				this.get('currentTokenRecord.files').then(function(files) {
					this.set('uploadsStarted', this.get('uploadsStarted') + 1);
					files.unshiftObject(fileRecord);
				}.bind(this));

				xhr.upload.addEventListener('progress', function(e) { 
					if (this.get('abortedFilename') === file.name) {
						xhr.abort();
					} else {
						if (e.lengthComputable) {
							fileRecord.set('bytesUploaded', e.loaded);
						}
					}
				}.bind(this), false);

				xhr.upload.addEventListener('load', function() {
					fileRecord.set('bytesUploaded', file.size);
				}, false);

				xhr.upload.addEventListener('abort', function() {
					this.set('abortedFilename', '');
					this.get('currentTokenRecord.files').removeObject(fileRecord);
					this.send('notify', 'Success', 'Upload of ' + file.name + ' has been cancelled.');
				}.bind(this), false);

				xhr.open('POST', this.get('baseUrl') + '/api/upload', true);
				
				fd.append('token', this.get('currentToken'));
				fd.append('file', file);

				xhr.onreadystatechange = function() {
					if (xhr.readyState === 4) {
						var responseCode = xhr.status;
						var responseText = JSON.parse(xhr.responseText);

						if (responseCode === 402) {
							this.get('currentTokenRecord.files').removeObject(fileRecord);
							this.send('updateBandwidth');
							this.send('notify', 'Uh-Oh', file.name + ' could not be uploaded due to insufficient balance.');
						} else if (responseCode === 500) {
							this.get('currentTokenRecord.files').removeObject(fileRecord);
							this.send('notify', 'Uh-Oh', file.name + ' could not be uploaded due to a server error.');
						} else if (responseCode === 201) {
							this.set('uploadsCompleted', this.get('uploadsCompleted') + 1);
							fileRecord.set('hash', responseText.filehash);
							fileRecord.set('key', responseText.key);
							fileRecord.save().then(function() {
								if (this.get('uploadsCompleted') === this.get('uploadsStarted')) {
									this.get('currentTokenRecord').save();
									this.set('uploadsCompleted', 0);
									this.set('uploadsStarted', 0);
									this.send('updateBandwidth');
								}
								
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