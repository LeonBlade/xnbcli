const BufferReader = require('../BufferReader');
const BufferWriter = require('../BufferWriter');
const Log = require('../Log');
const XnbError = require('../XnbError');

const { simplifyType, getReader } = require('./TypeReader');
const { StringReader } = require('./Readers');
const ReaderResolver = require('./ReaderResolver');
const Presser = require('../Presser');
const { resolveImport } = require('../Porter');
const LZ4 = require('lz4');

// "constants" for this class
const HIDEF_MASK = 0x1;
const COMPRESSED_LZ4_MASK = 0x40;
const COMPRESSED_LZX_MASK = 0x80;
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
        // compression type
        this.compressionType = 0;
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

            // decompress LZX format
            if (this.compressionType == COMPRESSED_LZX_MASK) {
                // get the amount of data to compress
                const compressedTodo = this.fileSize - XNB_COMPRESSED_PROLOGUE_SIZE;
                // decompress the buffer based on the file size
                const decompressed = Presser.decompress(this.buffer, compressedTodo, decompressedSize);
                // copy the decompressed buffer into the file buffer
                this.buffer.copyFrom(decompressed, XNB_COMPRESSED_PROLOGUE_SIZE, 0, decompressedSize);
                // reset the byte seek head to read content
                this.buffer.bytePosition = XNB_COMPRESSED_PROLOGUE_SIZE;
            }
            // decompress LZ4 format
            else if (this.compressionType == COMPRESSED_LZ4_MASK) {
                // decompressed buffer
                const decompressed = Buffer.alloc(decompressedSize);
                // allocate buffer for LZ4 decode
                let trimmed = this.buffer.buffer.slice(XNB_COMPRESSED_PROLOGUE_SIZE);
                // decode the trimmed buffer into decompressed buffer
                LZ4.decodeBlock(trimmed, decompressed);
                // copy the decompressed buffer into our buffer
                this.buffer.copyFrom(decompressed, XNB_COMPRESSED_PROLOGUE_SIZE, 0, decompressedSize);
                // reset the byte seek head to read content
                this.buffer.bytePosition = XNB_COMPRESSED_PROLOGUE_SIZE;
            }
        }

        Log.debug(`Reading from byte position: ${this.buffer.bytePosition}`);

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
     * @param {Object} json The JSON to convert into a XNB file
     */
    convert(json) {
        // the output buffer for this file
        const buffer = new BufferWriter();

        // create an instance of string reader
        const stringReader = new StringReader();

        // catch exceptions for invalid JSON file formats
        try {
            // set the header information
            this.target = json.header.target;
            this.formatVersion = json.header.formatVersion;
            this.hidef = json.header.hidef;
            const lz4Compression = (this.target == 'a' || this.target == 'i');
            this.compressed = lz4Compression ? true : false; // support android LZ4 compression

            // write the header into the buffer
            buffer.write("XNB");
            buffer.write(this.target);
            buffer.writeByte(this.formatVersion);
            // write the LZ4 mask for android compression only
            buffer.writeByte(this.hidef | ((this.compressed && lz4Compression) ? COMPRESSED_LZ4_MASK : 0));

            // write temporary filesize
            buffer.writeUInt32(0);

            // write the decompression size temporarily if android
            if (lz4Compression)
                buffer.writeUInt32(0);

            // write the amount of readers
            buffer.write7BitNumber(json.readers.length);

            // loop over the readers and load the types
            for (let reader of json.readers) {
                this.readers.push(getReader(simplifyType(reader.type))); // simplyify the type then get the reader of it
                stringReader.write(buffer, reader.type);
                buffer.writeUInt32(reader.version);
            }

            // write 0 shared resources
            buffer.write7BitNumber(0);

            // create reader resolver for content and write it
            const content = new ReaderResolver(this.readers);

            // write the content to the reader resolver
            content.write(buffer, json.content);

            // trim excess space in the buffer 
            // NOTE: this buffer allocates default with 500 bytes
            buffer.trim();

            // LZ4 compression
            if (lz4Compression) {
                // create buffer with just the content
                const contentBuffer = Buffer.alloc(buffer.bytePosition - XNB_COMPRESSED_PROLOGUE_SIZE);
                // copy the content from the main buffer into the content buffer
                buffer.buffer.copy(contentBuffer, 0, XNB_COMPRESSED_PROLOGUE_SIZE);

                // create a buffer for the compressed data
                let compressed = Buffer.alloc(LZ4.encodeBound(contentBuffer.length));

                // compress the data into the buffer
                const compressedSize = LZ4.encodeBlock(contentBuffer, compressed);

                // slice off anything extra
                compressed = compressed.slice(0, compressedSize);

                // write the decompressed size into the buffer
                buffer.buffer.writeUInt32LE(contentBuffer.length, 10);
                // write the file size into the buffer
                buffer.buffer.writeUInt32LE(XNB_COMPRESSED_PROLOGUE_SIZE + compressedSize, 6);

                // create a new return buffer
                let returnBuffer = Buffer.from(buffer.buffer);

                // splice in the content into the return buffer
                compressed.copy(returnBuffer, XNB_COMPRESSED_PROLOGUE_SIZE, 0);

                // slice off the excess
                returnBuffer = returnBuffer.slice(0, XNB_COMPRESSED_PROLOGUE_SIZE + compressedSize);

                // return the buffer
                return returnBuffer;
            }

            // write the file size into the buffer
            buffer.buffer.writeUInt32LE(buffer.bytePosition, 6)

            // return the buffer
            return buffer.buffer;

        }
        catch (ex) {
            console.log(ex);
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
            case 'a':
                Log.debug('Target platform: Android');
                break;
            case 'i':
                Log.debug('Target platform: iOS');
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
        this.compressed = (flags & COMPRESSED_LZX_MASK) || (flags & COMPRESSED_LZ4_MASK) != 0;
        // set the compression type
        // NOTE: probably a better way to do both lines but sticking with this for now
        this.compressionType = (flags & COMPRESSED_LZX_MASK) != 0 ? COMPRESSED_LZX_MASK : ((flags & COMPRESSED_LZ4_MASK) ? COMPRESSED_LZ4_MASK : 0);
        // debug content information
        Log.debug(`Content: ${(this.hidef ? 'HiDef' : 'Reach')}`);
        // log compressed state
        Log.debug(`Compressed: ${this.compressed}, ${this.compressionType == COMPRESSED_LZX_MASK ? 'LZX' : 'LZ4'}`);
    }

}

module.exports = Xnb;
