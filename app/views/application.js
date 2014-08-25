import Ember from 'ember';

export default Ember.View.extend({
  classNames: ['drop-zone'],
  classNameBindings: ['isActive:active:'],
  isActive: false,

  dragEnter: function(e) {
  	e.stopPropagation();
  	e.preventDefault();
  },

  dragOver: function(e) {
  	this.set('isActive', true);
  	e.stopPropagation();
  	e.preventDefault();
  },

  dragLeave: function(e) {
  	this.set('isActive', false);
  },

  drop: function(e) {
  	this.set('isActive', false);
  	e.stopPropagation();
  	e.preventDefault();

  	var dt = e.dataTransfer;
  	var files = dt.files;

  	if (files.length > 0) {
		for (var i=0; i < files.length; i++) {
			this.get('controller').send('handleFiles', files[i]);
		}
	}
  	
  }
});