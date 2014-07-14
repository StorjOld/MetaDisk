export default Ember.Component.extend({
	tagName: 'progress',
	attributeBindings: ['max', 'value'],
	max: null,
	toValue: null,
	value: 0,
	animateValue: function() {
		var that = this;
		this.$({barValue: that.get('value'), that: that}).animate({barValue: that.get('toValue')}, {
			duration: 250,
			step: function() {
				this.that.set('value', this.barValue);
			}
		});
	}.observes('toValue')
});