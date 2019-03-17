# xnbcli

[![Build Status](https://travis-ci.org/LeonBlade/xnbcli.svg?branch=master)](https://travis-ci.org/LeonBlade/xnbcli)

A CLI tool for XNB packing/unpacking purpose built for Stardew Valley.

This tool currently supports unpacking all LZX compressed XNB files for Stardew Valley.  
There is some basic groundwork for XACT as well.

The end goal for this project is to serve as a CLI for a GUI wrapper to leverage so the average user can interface with
XNB files a lot easier.

## Requirements

- `node.js` installed
- `npm` installed
- `python` installed
- (for Windows users) `windows-build-tools` installed (`npm i --g --production windows-build-tools`)

## Installation

`npm install`

## Usage

You can `unpack` and `pack` XNB files using this tool. For ease of use, a script file is included that will automatically unpack/pack whatever you put in their respective folders. To learn how to use it manually, just look at the script file or look at the usage when you run the tool in your favorite terminal.

## Tips

- If you are unable to run `pack.sh` or `unpack.sh` script files, simply run one of the following npm scripts:
`npm run pack` or `npm run unpack`
- You should process one file at a time. Multiple `.xnb` files or collections of `.png` and `.json` files might cause errors.

## License
GNU GPL v3.0
