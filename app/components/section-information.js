export default Ember.Component.extend({
	tagName: 'h3',
	caption: null,
	unit: null, // DTC or GB
	value: null,
	valueTotal: null,
	fileCount: null,
	layout: Ember.Handlebars.compile('<span>{{caption}}</span><aside>{{metrics}}</aside>'),
	bytesToGB: function(bytes) {
		return (bytes / 1073741824).toFixed(2);
	},
	metrics: function() {
		var unit  = this.get('unit');
		var value = this.get('value');
		var fileCount = this.get('fileCount');
		var valueTotal = this.get('valueTotal');

		if (unit === 'DTC') {
			return value + ' ' + unit;
		} else {
			if (fileCount && valueTotal) {
				return fileCount + ' (' + this.bytesToGB(valueTotal) + ' ' + unit + ')';
			} else if (value && valueTotal) {
				return this.bytesToGB(value) + '/' + this.bytesToGB(valueTotal) + ' ' + unit;
			} else if (value && !valueTotal) {
				return this.bytesToGB(value) + ' ' + unit;
			} else if (!value && valueTotal) {
				return this.bytesToGB(valueTotal) + ' ' + unit;
			} else {
				return '';
			}
		}
	}.property('unit', 'value', 'valueTotal', 'fileCount')
});