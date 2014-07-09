import Ember from 'ember';
import Resolver from 'ember/resolver';
import loadInitializers from 'ember/load-initializers';

Ember.MODEL_FACTORY_INJECTIONS = true;

var App = Ember.Application.extend({
  modulePrefix: 'metadisk', // TODO: loaded via config
  Resolver: Resolver,
  Socket: EmberSockets.extend({
  	host: 'node2.storj.io', //TODO: should be configurable
  	path: 'metadisk',
  	controllers: ['application']
  })
});

loadInitializers(App, 'metadisk');

export default App;