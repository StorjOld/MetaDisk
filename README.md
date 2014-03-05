BitCumulus
========
BitCumulus, a filehost web app, that allows anyone to upload files via a web interface or API. Files are hashed and uploaded to public file hosting. Using the hashes a node can look up the information of where that file was stored using the [Datacoin](http://datacoin.info/) blockchain. This makes a file uploaded to BitCumulus accessable through any node in the network.

- Coded in [Python](http://python.org/) and [Flask](http://flask.pocoo.org/), a Python microframework for web.
- Must be run on a Linux based web server, [Debian](http://www.debian.org/) distro recommended.

## Project setup ##

To use this, you must install the [plowshare command line
tool](https://code.google.com/p/plowshare/). Make sure that both plowup and
plowdown are in your PATH before continuing.

If you're running Debian, you can install it using the following commands:

    wget https://plowshare.googlecode.com/files/plowshare4_1~git20140112.7ad41c8-1_all.deb
    sudo dpkg -i plowshare4_1~git20140112.7ad41c8-1_all.deb
    sudo apt-get -f install


This project has a pip compatible requirements.txt. You can use virtualenv to
manage dependencies:

    cd BitCumulus
    virtualenv .env                  # create a virtual environment for this project
    source .env/bin/activate         # activate it
    pip install -r requirements.txt  # install dependencies

Afterwards, you need to set up a cloudmanager database:

    python -mcloudmanager.setup_db database/files.db

To test the installation, use the following command:

    python index.py

BitCumulus will be running on http://localhost:5000
