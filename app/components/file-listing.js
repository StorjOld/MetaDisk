export default Ember.Component.extend({
	tagName: 'section',
	classNames: ['file'],
	title: null,
	layout: Ember.Handlebars.compile('<h1>{{title}}</h1><fieldset><button></button><button></button><button></button</fieldset>')
});