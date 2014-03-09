#!/usr/bin/env python
#
# Warning: This script actually sends data
# to the blockchain, spending your coins.

import sys

import cloudmanager
import metachains_dtc
import settings

coin = metachains_dtc.Datacoin(
        settings.DATACOIN_URL,
        settings.DATACOIN_USERNAME,
        settings.DATACOIN_PASSWORD)

cloud = cloudmanager.CloudManager(
        settings.DATABASE,
        settings.STORAGE_PATH,
        settings.STORAGE_SIZE)

worker = metachains_dtc.Synchronizer(
        coin,
        cloud,
        settings.DATACOIN_START)


if sys.argv[1] == "download":
    print "scanning blockchain..."
    worker.scan_blockchain()

if sys.argv[1] == "upload":
    print "scanning database..."
    worker.scan_database()
