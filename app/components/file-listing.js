import Ember from 'ember';

export default Ember.Component.extend({
	tagName: 'section',
	classNames: ['file'],
	classNameBindings: ['isClosed:closed:'],
	title: null,
	fileHash: null,
	fileKey: null,
	fileUri: null,
	fileSize: null,
	bytesUploaded: 0,
	lastBytesUploaded: 0,
	isClosed: false,
	downloadUrl: null,
	copyValue: null,
	baseUrl: null,
	currentToken: null,
	uploadSpeed: 0,
	abortedFilename: null,
	preparedDownloadUrl: function() {
		return this.get('baseUrl') + '/api/download/' + this.get('fileHash') + '?key=' + this.get('fileKey') + '?token=' + this.get('currentToken');
	}.property('hostName', 'fileHash', 'fileKey', 'currentToken'),
	hashAndKey: function() {
		return this.get('fileHash') + '?key=' + this.get('fileKey');
	}.property('fileHash', 'fileKey'),
	uploadedPercent: function() {
		return Math.min(100, Math.floor(this.get('bytesUploaded')/this.get('fileSize') * 100));
	}.property('bytesUploaded', 'fileSize'),
	startPolling: function() {
		Ember.run.later(this, function() {
			this.set('uploadSpeed', this.get('bytesUploaded') - this.get('lastBytesUploaded'));

			this.set('lastBytesUploaded', this.get('bytesUploaded'));
			if (this.get('uploadedPercent') < 99) {
				this.startPolling();
			}
		}, 500);
	}.on('didInsertElement'),
	formattedUploadSpeed: function() {
		var speed = this.get('uploadSpeed');
		if (speed < 1000) {
			return speed + ' B/s';
		} else if (speed >= 1000 && speed < 1000000) {
			return (speed/1000).toFixed(2) + ' kB/s';
		} else if (speed >= 1000000 && speed < 1000000000) {
			return (speed/1000000).toFixed(2) + ' MB/s';
		} else {
			return (speed/1000000000).toFixed(2) + ' GB/s';
		}
	}.property('uploadSpeed'),
	uploadTimeRemaining: function() {
		var fileSize = this.get('fileSize');
		var uploadedSoFar = this.get('bytesUploaded');
		var uploadSpeed = this.get('uploadSpeed');
		var timeRemaining = ((fileSize - uploadedSoFar) / uploadSpeed) || 0;
		var hours = Math.floor(timeRemaining / 3600);
		var minutes = Math.floor((timeRemaining - (hours * 3600)) / 60);
		var seconds = Math.floor(timeRemaining - (hours * 3600) - (minutes * 60));

		return (hours < 10 ? '0' + hours : hours) + ':' + (minutes < 10 ? '0' + minutes : minutes)  + ':' + (seconds < 10 ? '0' + seconds : seconds);
	}.property('uploadSpeed'),
	isCompletelyUploaded: function() {
		return this.get('fileSize') === this.get('bytesUploaded');
	}.property('fileSize', 'bytesUploaded'),
	actions: {
		toggleClosed: function() {
			this.toggleProperty('isClosed');
		},
		downloadFile: function() {
			this.set('downloadUrl', this.get('preparedDownloadUrl'));
		},
		cancelUpload: function() {
			this.set('abortedFilename', this.get('title'));
		}
	}
});

