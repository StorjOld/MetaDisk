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
	downloadUrl: null,
	copyValue: null,
	baseUrl: null,
	currentToken: null,
	preparedDownloadUrl: function() {
		return this.get('baseUrl') + '/api/download/' + this.get('fileHash') + '?key=' + this.get('fileKey') + '?token=' + this.get('currentToken');
	}.property('hostName', 'fileHash', 'fileKey', 'currentToken'),
	hashAndKey: function() {
		return this.get('fileHash') + '?key=' + this.get('fileKey');
	}.property('fileHash', 'fileKey'),
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
			this.set('downloadUrl', this.get('preparedDownloadUrl'));
		}
	}
});

