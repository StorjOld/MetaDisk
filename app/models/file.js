export default DS.Model.extend({
	hash: DS.attr('string', {default: ''}),
	key: DS.attr('string', {default: ''}),
	title: DS.attr('string', {default: 'New File'}),
	bytesUploaded: DS.attr('number', {default: 0}),
	fileSize: DS.attr('number', {default: 0})
});