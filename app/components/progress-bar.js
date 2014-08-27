import Ember from 'ember';

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
				try {
					this.that.set('value', this.barValue);
				} catch(err) { 
					// This should ultimately be replaced with something 
					// cleaner. Ember's willDestroyElement and willClearRender 
					// hooks in combination with this.$().finish() or 
					// this.$().stop(true, true) seem to have no effect.
				}
			}
		});	
	}.observes('toValue')
});