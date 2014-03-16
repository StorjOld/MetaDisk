BitCumulus
========

BitCumulus, a filehost web app, that allows anyone to upload files via a web
interface or API. Files are hashed and uploaded to public file hosting. Using
the hashes a node can look up the information of where that file was stored
using the [Datacoin](http://datacoin.info/) blockchain. This makes a file
uploaded to BitCumulus accessible through any node in the network.

- Coded in [Python](http://python.org/) and [Flask](http://flask.pocoo.org/), a Python microframework for web.
- Must be run on a Linux based web server, [Debian](http://www.debian.org/) distro recommended.

#### Scope

This project depends on several other projects:

- [plowshare-wrapper](https://github.com/Storj/plowshare-wrapper) provides a
  python interface to upload and download files from popular file hosting
  sites. It is a python wrapper of the plowshare tool.

- [cloudmanager](https://github.com/Storj/cloud-manager) contains most of the
  file handling logic. It keeps track of all the uploaded files, keeps track of
  the files present in local cache, and handles database serialization.

- [metachains-dtc](https://github.com/Storj/metachains-dtc) is a wrapper for
  the Datacoin client, using json RPC. It also contains a synchronization class,
  which allows one to synchronize data from and to the blockchain.

BitCumulus, this project, puts everything together and makes it accessible
through a web application. It uses `cloudmanager` to manage all
uploads/downloads, and `metachains-dtc` to enable synchronization of the hosted
content information between nodes running BitCumulus.


#### Installation

Check [INSTALL.md](INSTALL.md) for installation instructions.


## Synchronization note ##

Keep in mind that the `upload` command spends datacoins, so be careful when
using it.
