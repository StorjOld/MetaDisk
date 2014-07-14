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
	isCompletelyUploaded: function() {
		return this.get('fileSize') === this.get('bytesUploaded');
	}.property('fileSize', 'bytesUploaded'),
	layout: Ember.Handlebars.compile('<h1 {{action "toggleClosed"}}>{{title}}</h1>{{#animated-unless condition=isCompletelyUploaded}}{{progress-bar max=fileSize toValue=bytesUploaded}}{{/animated-unless}}{{#animated-if condition=isCompletelyUploaded}}<fieldset><button></button><button></button><button></button></fieldset>{{/animated-if}}'),
	actions: {
		toggleClosed: function() {
			this.toggleProperty('isClosed');
		}
	}
});

