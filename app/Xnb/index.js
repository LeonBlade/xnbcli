const BufferReader = require('../BufferReader');
const Log = require('../Log');
const XnbError = require('../XnbError');

const { simplifyType, getReader } = require('./TypeReader');
const { StringReader } = require('./Readers');
const ReaderResolver = require('./ReaderResolver');
const Presser = require('../Presser');
const fs = require('fs');

// "constants" for this class
const HIDEF_MASK = 0x1;
const COMPRESSED_MASK = 0x80;
const XNB_COMPRESSED_PROLOGUE_SIZE = 14;

/**
 * XNB file class used to read and write XNB files
 * @class
 * @public
 */
class Xnb {

    /**
     * Creates new instance of Xnb class
     * @constructor
     */
    constructor() {
        // target platform
        this.target = '';
        // format version
        this.formatVersion = 0;
        // HiDef flag
        this.hidef = false;
        // Compressed flag
        this.compressed = false;
        // the XNB buffer reader
        this.buffer = null;
        // the file size
        this.fileSize = 0;

        /**
         * Array of readers that are used by the XNB file.
         * @type {BaseReader[]}
         */
        this.readers = [];

        /**
         * Array of shared resources
         * @type {Array}
         */
        this.sharedResources = [];
    }

    /**
     * Loads a file into the XNB class.
     * @param {String} filename The XNB file you want to load.
     */
    load(filename) {
        Log.info(`Reading file "${filename}" ...`);

        // create a new instance of reader
        this.buffer = new BufferReader(filename);

        // validate the XNB file header
        this._validateHeader();

        // we validated the file successfully
        Log.info('XNB file validated successfully!');

        // read the file size
        this.fileSize = this.buffer.readUInt32();

        // verify the size
        if (this.buffer.size != this.fileSize)
            throw new XnbError('XNB file has been truncated!');

        // print out the file size
        Log.debug(`File size: ${this.fileSize} bytes.`);

        // if the file is compressed then we need to decompress it
        if (this.compressed) {
            // get the decompressed size
            const decompressedSize = this.buffer.readUInt32();
            Log.debug(`Uncompressed size: ${decompressedSize} bytes.`);

            // get the amount of data to compress
            const compressedTodo = this.fileSize - XNB_COMPRESSED_PROLOGUE_SIZE;

            // decompress the buffer based on the file size
            const decompressed = Presser.decompress(this.buffer, compressedTodo, decompressedSize);
            // copy the decompressed buffer into the file buffer
            this.buffer.copyFrom(decompressed, XNB_COMPRESSED_PROLOGUE_SIZE, 0, decompressedSize);

            // reset the byte seek head to read content
            this.buffer.bytePosition = XNB_COMPRESSED_PROLOGUE_SIZE;
        }

        Log.debug(`Reading from byte position: ${this.buffer.bytePosition}`);

        fs.writeFileSync("/mnt/y/Users/LeonBlade/Desktop/test.xnb", this.buffer.buffer);

        // NOTE: assuming the buffer is now decompressed

        // get the 7-bit value for readers
        let count = this.buffer.read7BitNumber();
        // log how many readers there are
        Log.debug(`Readers: ${count}`);

        // create an instance of string reader
        const stringReader = new StringReader();

        // a local copy of readers for the export
        const readers = [];

        // loop over the number of readers we have
        for (let i = 0; i < count; i++) {
            // read the type
            const type = stringReader.read(this.buffer);
            // read the version
            const version = this.buffer.readInt32();

            // get the reader for this type
            const simpleType = simplifyType(type);
            const reader = getReader(simpleType);

            // add reader to the list
            this.readers.push(reader);
            // add local reader
            readers.push({ type, version });
        }

        // get the 7-bit value for shared resources
        const shared = this.buffer.read7BitNumber();

        // log the shared resources count
        Log.debug(`Shared Resources: ${shared}`);

        // don't accept shared resources since SDV XNB files don't have any
        if (shared != 0)
            throw new XnbError(`Unexpected (${shared}) shared resources.`);

        // create content reader from the readers loaded
        const content = new ReaderResolver(this.readers);
        // read the content in
        const result = content.read(this.buffer);

        // we loaded the XNB file successfully
        Log.info('Successfuly read XNB file!');

        // return the loaded XNB object
        return {
            header: {
                target: this.target,
                formatVersion: this.formatVersion,
                hidef: this.hidef,
                compressed: this.compressed
            },
            readers,
            content: result
        };
    }

    /**
     * Converts JSON into XNB file structure
     * @param {String} filename The path to load the JSON file from
     */
    convert(filename) {
        Log.info(`Parsing file "${filename}" ...`);

        // read the JSON file
        const file = fs.readFileSync(filename);
        // parse the JSON contents
        const json = JSON.parse(file);
        // the output buffer for this file
        const buffer = new Buffer();

        // catch exceptions for invalid JSON file formats
        try {
            // set the header information
            this.target = json.header.target;
            this.formatVersion = json.header.formatVersion;
            this.hidef = json.header.hidef;
            this.compressed = false; // NOTE: file compression not supported

            Log.debug('Compression flag ignored as compression is not supported.');

            // write the header into the buffer
            buffer.write("XNB");
            buffer.writeUInt8(this.formatVersion);
            // NOTE: can write hidef flag as 0 or 1 as there's no compression allowed
            buffer.writeUInt8(this.hidef);


            // write temporary filesize
            buffer.writeUInt32LE(0);

            // loop over the readers and load the types
            for (let reader in json.readers)
                this.readers.push(getReader(simplifyType(reader.type))); // simplyify the type then get the reader of it
            

        }
        catch (ex) {
            throw new XnbError(`Invalid JSON file.`);
        }
    }

    /**
     * Ensures the XNB file header is valid.
     * @private
     * @method _validateHeader
     */
    _validateHeader() {
        // ensure buffer isn't null
        if (this.buffer == null)
            throw new XnbError('Buffer is null');

        // get the magic from the beginning of the file
        const magic = this.buffer.readString(3);
        // check to see if the magic is correct
        if (magic != 'XNB')
            throw new XnbError(`Invalid file magic found, expecting "XNB", found "${magic}"`);

        // debug print that valid XNB magic was found
        Log.debug('Valid XNB magic found!');

        // load the target platform
        this.target = this.buffer.readString(1).toLowerCase();

        // read the target platform
        switch (this.target) {
            case 'w':
                Log.debug('Target platform: Microsoft Windows');
                break;
            case 'm':
                Log.debug('Target platform: Windows Phone 7');
                break;
            case 'x':
                Log.debug('Target platform: Xbox 360');
                break;
            default:
                Log.warn(`Invalid target platform "${this.target}" found.`);
                break;
        }

        // read the format version
        this.formatVersion = this.buffer.readByte();

        // read the XNB format version
        switch (this.formatVersion) {
            case 0x3:
                Log.debug('XNB Format Version: XNA Game Studio 3.0');
                break;
            case 0x4:
                Log.debug('XNB Format Version: XNA Game Studio 3.1');
                break;
            case 0x5:
                Log.debug('XNB Format Version: XNA Game Studio 4.0');
                break;
            default:
                Log.warn(`XNB Format Version ${Log.h(this.formatVersion)} unknown.`);
                break;
        }

        // read the flag bits
        const flags = this.buffer.readByte(1);
        // get the HiDef flag
        this.hidef = (flags & HIDEF_MASK) != 0;
        // get the compressed flag
        this.compressed = (flags & COMPRESSED_MASK) != 0;

        // debug content information
        Log.debug(`Content: ${(this.hidef?'HiDef':'Reach')}`);
        // log comprssed state
        Log.debug(`Compressed: ${this.compressed}`);
    }

}

module.exports = Xnb;
