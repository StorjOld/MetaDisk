Installation
============

This project is just a set of static files. To get it running, just point nginx
(or your favourite web server) to it, and make sure that you set up
[web-core](https://github.com/Storj/web-core) correctly and that it is running
on the domain as BitCumulus.


#### Sample nginx site

Suppose that you have a gunicorn instance running web-core on port 5000.
The following site definition would work:

```
server {
    listen 80;
    server_name storj.example.com;
    root /path/to/BitCumulus/static/;
    client_max_body_size 100M;

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
