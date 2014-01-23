BitStratus
========

A web node for the StorJ network. . Coded in [Python](http://python.org/) and  [Flask](http://flask.pocoo.org/), a Python microframework for web. May run off it's own instance of [Bitcoind w/ JSON-RPC](https://en.bitcoin.it/wiki/API_reference_(JSON-RPC)) or through the [Coinbase API](https://coinbase.com/docs/api/overview). Must be run on a Linux based web server, [Debian](http://www.debian.org/) distro recommended. 

## Summary ##
Users and developers want to be able to store their files and data on the web. Users typically use services like Google Drive or Dropbox, while developers typically use a service like Amazon S3. These services require their users to sign-up, have data storage limits (after which they can be quite expensive), don't allow for easy automation, and don't allow direct access to files. 

The idea is simple: A Pay-to-Filehost web service that allows anyone to upload files via a web interface or API. The user will pre-pay the service to cover the cost of hosting the files. This payment will be made in Bitcoin, and is priced based on size of the file, bandwidth required, and the duration that the file has been hosted. These files will be served, and the update balances on the hour. When the account balance is 0, the files will be queued for deletion. 

For more information see "Sample User Interaction" in [Notes](NOTES.md).

## Setup ##
In an effort to be as automated as possible, BitStratus will install all needed dependencies and programs from a bash script. Please try to use [Debian 7.3](http://www.debian.org/distrib/netinst) if would like to take the automated route. If you would like to use another distro, please refer to the bash script for the required dependencies. 

1. Setup a Linux VPS with [Debian 7.3](http://www.debian.org/distrib/netinst). See "Host Recommendations" in [Notes](NOTES.md) for more info. 
2. After logging in run the following commands:

		sudo apt-get update && sudo apt-get upgrade
		sudo apt-get install git-core -y
		git clone https://github.com/Storj/BitStratus
		cd /BitStratus
		sh ./autoinstall
		sh ./autostart
		
3. A web server should be now be running on the VPS's public IP. If you have issues or questions with installation, just open a Github ticket. 









