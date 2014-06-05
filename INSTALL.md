Build Management
================
Metadisk is an [ember](http://emberjs.com/)-based application that uses [node.js](http://nodejs.org/) and [ember-cli](https://github.com/stefanpenner/ember-cli) for build management and compilation.

After installing node.js, install ember-cli and the required plugins (for SASS, bower and ember):

``` bash
$ git clone https://github.com/stefanpenner/ember-cli.git
$ cd ember-cli
$ npm link
```

After changing directory to the cloned StoryPilot repository:

```bash
$ npm link ember-cli
$ npm install -g bower
$ npm install
$ bower install
```

You can then run the development sever:

```
$ ember server
```

The development server will be accessible from [localhost:4200](http://localhost:4200).

## Running Tests

To run tests headlessly with Testem, install PhantomJS then run `ember test`.

You can also see test results in Chrome at [localhost:4200/tests](http://localhost:4200/tests).

## Building for Production

To build minified production files, run `ember build --environment=production`.

This will create minified JavaScript and CSS files in the `dist` folder


Installation
============

Everything you need to deploy Metadisk will be located in the `dist` folder. The server only needs to return the index.html file. All other static assets can either be served alongside it or hosted on a CDN.

Once the files are uploaded, point nginx (or your favourite web server) to the index.html file, and make sure that you set up [web-core](https://github.com/Storj/web-core) correctly and that it is running on the same domain as Metadisk.


#### Sample nginx site

Suppose that you have a gunicorn instance running web-core on port 5000.
The following site definition would work:

```
server {
    listen 80;
    server_name storj.example.com;
    root /path/to/BitCumulus/static/;
    client_max_body_size 510M;

    access_log /var/log/nginx/bitcumulus.access.log;
    error_log /var/log/nginx/bitcumulus.error.log;

    location / {
        try_files $uri/index.html $uri $uri.html @webcore;
    }

    location @webcore {
        proxy_set_header X-Forward-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $http_host;
        proxy_redirect off;
        proxy_pass http://127.0.0.1:5000;
    }
}
```
