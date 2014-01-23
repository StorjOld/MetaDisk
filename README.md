BitStratus
========

A web node for the StorJ network. Coded in [Python](http://python.org/) and [Flask](http://flask.pocoo.org/), a Python microframework for web. Must be run on a Linux based web server, [Debian](http://www.debian.org/) distro recommended. 

## Summary ##
Users and developers want to be able to store their files and data on the web. Users typically use services like  Dropbox or Google Drive, while developers typically use services like Amazon S3 or Google Cloud. These services require their users to sign-up, have data storage limits and plans(which can be pricy), don't allow for easy automation, and don't allow direct access to files. BitStratus is just the first part of a decentralized storage network to solve this problem.

BitStratus, a filehost web app, that allows anyone to upload files via a web interface or API. It can be run as a standalone app for personal cloud storage, used in a group setting to provide "Dropbox" like functionality, or connected with the Storj network where it can freely buy and sell bandwidth and storage.

## Setup ##
In an effort to be as automated as possible, BitStratus will install all needed dependencies and programs from a bash script. Please try to use [Debian 7.3](http://www.debian.org/distrib/netinst) if would like to take the automated route. If you would like to use another distro, please refer to the bash script for the required dependencies. 

1. Setup a Linux VPS with [Debian 7.3](http://www.debian.org/distrib/netinst). We recommend using [Digital Ocean](http://digitalocean.com).
2. After logging in run the following commands:

		sudo apt-get update && sudo apt-get upgrade
		sudo apt-get install git-core -y
		git clone https://github.com/Storj/BitStratus
		cd /BitStratus
		sh ./autoinstall
		sh ./autostart
		
3. A web server should be now be running on the VPS's public IP. If you have issues or questions with installation, just open a [Github issue](https://github.com/Storj/BitStratus/issues). 

## Sample Interactions ##

### A. Personal Use ###
1. User installs BitStratus on a personal web server.
2. The user can upload photos, movies, and other files to their server using the BitStratus web interface.
3. The user can keep their files private, or share urls to their files with others.

### B. Filehost Use ###
1. The user wants to store a video file on the web to share with friends. 
2. The user pays the BitStratus node for file storage and bandwidth in [Bitcoin](http://bitcoin.org/en/).
3. 

### C. Storj Network ###
1. The user wants to store a video file on the web to share with friends.
2. The user pays the BitStratus node for file storage and bandwidth credits/tokens.
3. The user uploads the file to BitStratus using the web interface.
4. The file is available across the Storj network. User is able to set redundancy and availability.
4. The user is allowed to freely use/download/share the file until the credits/tokens balance is 0. 

Design Ideas: [BitFetch](https://bitfetch.com/).
