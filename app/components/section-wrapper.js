export default Ember.Component.extend({
	tagName: 'section',
	classNameBindings: ['name', 'isClosed:closed:'],
	name: null,
	title: null,
	isClosed: false,
	layout: Ember.Handlebars.compile('<h1><span>{{title}}</span><aside {{action "toggleClosed"}}></aside></h1>{{yield}}'),
	actions: {
		toggleClosed: function() {
			this.toggleProperty('isClosed');
		}
	}
});