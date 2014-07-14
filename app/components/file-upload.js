export default Ember.TextField.extend({
	type: 'file',
	action: 'handleFiles',
	attributeBindings: ['multiple', 'name'],
	name: 'file',
	layout: Ember.Handlebars.compile('<button {{action "activateUpload"}}>UPLOAD</button>'),
	change: function() {
		var fileList = this.$().prop('files');
		if (fileList.length > 0) {
			for (var i=0; i < fileList.length; i++) {
				this.sendAction('action', fileList[i]);
			}
		}
	},
	actions: {
		activateUpload: function() {
			this.$().click();
		}
	}
});