#!/bin/bash
cd "`dirname "$0"`"
./xnbcli pack ./unpacked ./packed
read -p "Press enter to continue"
