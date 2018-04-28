#!/bin/bash
cp node_modules/dxt/build/Release/dxt.node .
if [[ $TRAVIS_OS_NAME == 'osx' ]]; then
    pkg xnbcli.js --targets macos
    mkdir packed
    mkdir unpacked
    zip xnbcli-macos.zip xnbcli dxt.node packed unpacked pack.command unpack.command
else
    pkg xnbcli.js --targets linux
    mkdir packed
    mkdir unpacked
    zip xnbcli-linux.zip xnbcli dxt.node packed unpacked pack.sh unpack.sh
fi
