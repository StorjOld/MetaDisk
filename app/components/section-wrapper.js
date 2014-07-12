export default Ember.Component.extend({
	tagName: 'section',
	classNameBindings: ['name', 'isClosed:closed:'],
	name: null,
	title: null,
	isClosed: false,
	layout: Ember.Handlebars.compile('<h1><span>{{title}}</span><aside></aside></h1>{{yield}}'),
	click: function() {
		this.toggleProperty('isClosed');
	}
});