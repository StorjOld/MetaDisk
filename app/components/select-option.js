export default Ember.Component.extend({
	tagName: 'select',
	options: null,
	action: 'updateCurrentToken',
	layout: Ember.Handlebars.compile('{{#each options}}<option {{bind-attr value=token}}>{{token}}</option>{{/each}}'),
	change: function() {
		this.sendAction('action', this.$().val());
	}
});