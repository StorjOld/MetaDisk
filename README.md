BitCumulus
========
BitCumulus, a filehost web app, that allows anyone to upload files via a web interface or API. Files are hashed and uploaded to public file hosting. Using the hashes a node can look up the information of where that file was stored using the [Datacoin](http://datacoin.info/) blockchain. This makes a file uploaded to BitCumulus accessable through any node in the network.

- Coded in [Python](http://python.org/) and [Flask](http://flask.pocoo.org/), a Python microframework for web.
- Must be run on a Linux based web server, [Debian](http://www.debian.org/) distro recommended.

#### Instalation

Check [INSTALL.md](INSTALL.md) for installation instructions.


## Synchronization note ##

Keep in mind that the `upload` command spends datacoins, so be careful when
using it.
