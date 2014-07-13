export default DS.Model.extend({
	token: DS.belongsTo('token'),
	hash: DS.attr('string'),
	key: DS.attr('key'),
	title: DS.attr('string'),
	progress: DS.attr('number'),
	status: DS.attr('string'),
	uri: function() {
		return this.get('hash') + '?key=' + this.get('key') + '&token=' + this.get('token').get('token');
	}.property('hash', 'key')
});