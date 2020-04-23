#!/bin/bash

# Copy the node binaries into the main folder
cp node_modules/lz4/build/Release/xxhash.node .
cp node_modules/lz4/build/Release/lz4.node .

if [[ $TRAVIS_OS_NAME == 'osx' ]]; then
    pkg xnbcli.js --targets macos
    zip xnbcli-macos.zip xnbcli xxhash.node lz4.node packed unpacked pack.command unpack.command
else
    pkg xnbcli.js --targets linux
    zip xnbcli-linux.zip xnbcli xxhash.node lz4.node packed unpacked pack.sh unpack.sh
fi
