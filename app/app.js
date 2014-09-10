import Ember from 'ember';
import Resolver from 'ember/resolver';
import loadInitializers from 'ember/load-initializers';
import config from './config/environment';

Ember.MODEL_FACTORY_INJECTIONS = true;

var App = Ember.Application.extend({
  modulePrefix: config.modulePrefix,
  Socket: EmberSockets.extend({
  	host: window.API_HOST_NAME, //TODO: should be configurable
  	path: 'metadisk',
  	controllers: ['application']
  })
});

loadInitializers(App, config.modulePrefix);

export default App;