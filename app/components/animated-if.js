export default Ember.Component.extend({
  // Passed-in / public
  condition: null,
  classNames: 'animated-if',
  isInverse: false,
  updateVisibilityState: function() {
    if (this.get('condition') ^ this.isInverse) {
      this.$().fadeOut();
    } else {
      this.$().fadeIn();
    }
  }.on('didInsertElement').observes('condition')
});