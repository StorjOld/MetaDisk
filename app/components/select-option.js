export default Ember.Component.extend({
	tagName: 'select',
	options: null,
	action: 'updateCurrentToken',
	change: function() {
		this.sendAction('action', this.$().val());
	}
});