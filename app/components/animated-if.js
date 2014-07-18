import Ember from 'ember';

export default Ember.Component.extend({
  condition: null,
  classNames: 'animated-if',
  isInverse: false,
  updateVisibilityState: function() {
    if (this.get('condition') ^ this.isInverse) {
      this.$().fadeIn();
    } else {
      this.$().hide();
    }
  }.on('didInsertElement').observes('condition')
});