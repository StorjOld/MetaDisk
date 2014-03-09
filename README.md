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

## Web application setup ##

To test the installation, use the following command:

    python index.py

BitCumulus will be running on http://localhost:5000

## Blockchain synchronization setup ##

To enable blockchain synchronization, you must first configure the blockchain
settings. Default settings are present in the [settings.py](settings.py) file,
but you may override them by creating a `local_settings.py` file. You must at
least specify the blockchain server password:

    DATACOIN_PASSWORD = "my-hidden-password"

You may also override other settings:

    DATACOIN_URL       # URL to the server RPC endpoint.
    DATACOIN_USERNAME  # RPC username.
    DATACOIN_PASSWORD  # RPC password.
    DATACOIN_START     # Block index where to start scanning.

Check the [settings.py](settings.py) for examples.

After configuring the blockchain settings correctly, you can synchronize your
data by running one of the two following commands:

   ./worker.py download # scans the blockchain for BitCumulus files
   ./worker.py upload   # exports uploaded files to the blockchain

You might want to set up a cron job for each, possibly with different
intervals. Use crontab -e and add something similar to the following lines:

    */10 *   * * * /path/to/BitCumulus/worker.py download
    0    */1 * * * /path/to/BitCumulus/worker.py upload

This will execute `download` every ten minutes, and `upload` every hour.


## Synchronization note ##

Keep in mind that the `upload` command spends datacoins, so be careful when
using it.
