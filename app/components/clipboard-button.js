export default Ember.Component.extend({
	tagName: 'button',
	action: null,
	copyValue: null,
	copyText: null,
	attributeBindings: ['data-clipboard-text'],
    didInsertElement: function () {
        var clip = new ZeroClipboard(this.$(), {
            moviePath: "/assets/ZeroClipboard.swf",
        });

        clip.on('aftercopy', function () {
        	this.set('copyValue', this.get('copyText'));
        }.bind(this));
    }
});