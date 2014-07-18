import Ember from 'ember';

export default Ember.Component.extend({
	tagName: 'section',
	classNameBindings: ['name', 'isClosed:closed:'],
	name: null,
	title: null,
	isClosed: false,
	actions: {
		toggleClosed: function() {
			this.toggleProperty('isClosed');
		}
	}
});