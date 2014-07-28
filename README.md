Metadisk
========

Metadisk is a filehost web app, that allows anyone to upload files via a web
interface or API. Files are hashed and uploaded to public file hosting. Using
the hashes a node can look up the information of where that file was stored
using the [Datacoin](http://datacoin.info/) blockchain. This makes a file
uploaded to Metadisk accessible through any node in the network.

#### Screenshot

![https://imgur.com/EGy1xBc.png](https://imgur.com/EGy1xBc.png)


#### Scope

This project depends on several other projects:

- [accounts](https://github.com/Storj/accounts) (Optional) - Library for managing bandwidth on shared Metadisk nodes.        Allows users to buy, earn, or receive their bandwidth.

- [cloud-manager](https://github.com/Storj/cloud-manager) contains most of the
  file handling logic. It keeps track of all the uploaded files, keeps track of
  the files present in local cache, and handles database serialization.

- [file-encryptor](https://github.com/Storj/file-encryptor) is an encryption 
  package that implements convergent encryption using HMAC-SHA256 and AES128-CTR.

- [metachains-dtc](https://github.com/Storj/metachains-dtc) is a wrapper for
  the Datacoin client, using JSON RPC. It also contains a synchronization class,
  which allows one to synchronize data from and to the blockchain.

- [plowshare-wrapper](https://github.com/Storj/plowshare-wrapper) provides a
  python interface to upload and download files from popular file hosting
  sites. It is a python wrapper of the plowshare tool.

- [web-core](https://github.com/Storj/web-core) is the backend server that powers
  Metadisk. It provides a JSON API web service, and the daemons to synchronize
  files to the cloud hosting services and to the blockchain.

Metadisk, this project, provides a web interface to web-core, allowing you to
upload files and check the server status regarding bandwidth, disk usage, and
synchronization state.


#### Installation

Check [INSTALL.md](INSTALL.md) for installation instructions. We use [lunchbox](https://github.com/Storj/lunchbox) for automated deployment.

#### API 
All API documentation is contained in Metadisk's [web-core](https://github.com/Storj/web-core#api-documentation) repo.
