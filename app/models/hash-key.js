export default DS.Model.extend({
	hash: DS.attr('string'),
	key: DS.attr('key'),
	uri: function() {
		//<hash>?key=<key>&token=<token>
		return this.get('hash') + '?key=' + this.get('key') + '&token=' + '';
	}.property('hash', 'key')
});