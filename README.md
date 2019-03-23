# xnbcli

[![Build Status](https://travis-ci.org/LeonBlade/xnbcli.svg?branch=master)](https://travis-ci.org/LeonBlade/xnbcli)

A CLI tool for XNB packing/unpacking purpose built for Stardew Valley.

This tool currently supports unpacking all LZX compressed XNB files for Stardew Valley.  
There is some basic groundwork for XACT as well.

The end goal for this project is to serve as a CLI for a GUI wrapper to leverage so the average user can interface with
XNB files a lot easier.

## Usage

**Unpacking XNB files**

Place any files you wish to extract in the `packed` folder and run the appropriate file for unpacking.  `unpack.bat`, `unpack.command` or `unpack.sh`.

**Packing XNB files**

Place any files you wish to repack back into XNB files in the `unpacked` folder and run the appropriate file for packing.  `pack.bat`, `pack.command` or `pack.sh`.

**Terminal Use**

`xnbcli (pack|unpack) [input] [output]`

## Developers

If you wish to run this with Node.js and all the source code, please refer to the following.

- `node.js` installed
- `npm` installed
- `python` installed
- (for Windows users) `windows-build-tools` installed (`npm i --g --production windows-build-tools`)
- Run `npm install` to install node packages.
- `npm run unpack` and `npm run pack` scripts are available for use in the `package.json` file.

## License
GNU GPL v3.0
