export default Ember.Component.extend({
	tagName: 'progress',
	attributeBindings: ['max', 'value'],
	max: null,
	value: null
});