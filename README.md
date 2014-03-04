BitStratus
========
BitStratus, a filehost web app, that allows anyone to upload files via a web interface or API. It can be run as a standalone app for personal cloud storage or used in a group setting to provide "Dropbox" like functionality. BitStratus also serves as a web node to the Storj network where it can freely buy and sell bandwidth and storage.

- Coded in [Python](http://python.org/) and [Flask](http://flask.pocoo.org/), a Python microframework for web.
- Must be run on a Linux based web server, [Debian](http://www.debian.org/) distro recommended.

## Project setup ##

To use this, you must install the [plowshare command line
tool](https://code.google.com/p/plowshare/). Make sure that both plowup and
plowdown are in your PATH before continuing.

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
