export default Ember.Component.extend({
	tagName: 'section',
	classNames: ['file'],
	classNameBindings: ['isClosed:closed:'],
	title: null,
	fileHash: null,
	fileKey: null,
	fileUri: null,
	fileSize: null,
	bytesUploaded: null,
	isClosed: false,
	downloadUri: null,
	uploadedPercent: function() {
		return Math.min(100, Math.floor(this.get('bytesUploaded')/this.get('fileSize') * 100));
	}.property('bytesUploaded', 'fileSize'),
	isCompletelyUploaded: function() {
		return this.get('fileSize') === this.get('bytesUploaded');
	}.property('fileSize', 'bytesUploaded'),
	actions: {
		toggleClosed: function() {
			this.toggleProperty('isClosed');
		},
		downloadFile: function() {
			this.set('downloadUri', '/api/download/' + this.get('fileHash') + '?key=' + this.get('fileKey') + '?token=');
		}
	}
});

