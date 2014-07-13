export default DS.Model.extend({
	token: DS.attr('string'),
	yourBandwidth: DS.attr('number', {default: 0}),
	estimatedStorage: function() {
		return this.get('yourBandwidth') / 3;
	}.property('yourBandWidth'),
	hashes: DS.hasMany('hash-key')
});