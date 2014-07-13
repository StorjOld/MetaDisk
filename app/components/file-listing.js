export default Ember.Component.extend({
	tagName: 'section',
	classNames: ['file'],
	classNameBindings: ['isClosed:closed:'],
	title: null,
	fileHash: null,
	fileKey: null,
	fileUri: null,
	fileSize: 9283408,
	bytesUploaded: 9000000,
	isClosed: false,
	isCompletelyUploaded: function() {
		return this.get('fileSize') === this.get('bytesUploaded');
	}.property('fileSize', 'bytesUploaded'),
	layout: Ember.Handlebars.compile('<h1 {{action "toggleClosed"}}>{{title}}</h1>{{#animated-if condition=isCompletelyUploaded}}<fieldset><button></button><button></button><button></button></fieldset>{{/animated-if}}{{#animated-unless condition=isCompleteyUploaded}}{{progress-bar max=fileSize toValue=bytesUploaded}}{{/animated-unless}}'),
	actions: {
		toggleClosed: function() {
			this.toggleProperty('isClosed');
		}
	}
});

