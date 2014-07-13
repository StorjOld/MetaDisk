export default Ember.Component.extend({
	tagName: 'section',
	classNames: ['file'],
	classNameBindings: ['isClosed:closed:'],
	title: null,
	isClosed: false,
	layout: Ember.Handlebars.compile('<h1 {{action "toggleClosed"}}>{{title}}</h1><fieldset><button></button><button></button><button></button</fieldset>'),
	actions: {
		toggleClosed: function() {
			this.toggleProperty('isClosed');
		}
	}
});