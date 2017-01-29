const BufferReader = require('./BufferReader');
const Log = require('./Log');
const { simplifyType, getReader } = require('./TypeReader');
const { StringReader } = require('./readers');
const ReaderResolver = require('./ReaderResolver');
const XnbError = require('./XnbError');

// "constants" for this class
const HIDEF_MASK = 0x1;
const COMPRESSED_MASK = 0x80;

/**
 * XNB file class used to read and write XNB files
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
         * Array of TypeReaders that are used by the XNB file.
         * @type {TypeReader[]}
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

        // if the file is compressed then we need to decompress it
        if (this.compressed) {
            // TODO: decompress the file
        }

        // NOTE: assuming the buffer is now decompressed

        // get the 7-bit value for readers
        let count = this.buffer.read7BitNumber();
        // log how many readers there are
        Log.debug(`Readers: ${count}`);

        // create an instance of string reader
        let stringReader = new StringReader();

        // a local copy of readers for the export
        let readers = [];

        // loop over the number of readers we have
        for (let i = 0; i < count; i++) {
            // read the type
            let type = stringReader.read(this.buffer);
            // read the version
            let version = this.buffer.read(4).readInt32LE();

            // get the reader for this type
            let simpleType = simplifyType(type);
            let reader = getReader(simpleType);

            // add reader to the list
            this.readers.push(reader);
            // add local reader
            readers.push({ type, version });
        }

        // get the 7-bit value for shared resources
        let shared = this.buffer.read7BitNumber();
        // log the shared resources count
        Log.debug(`Shared Resources: ${shared}`);

        // don't accept shared resources for now(?)
        if (shared != 0)
            throw new XnbError(`Unexpected (${shared}) shared resources.`);

        // create content reader from the readers loaded
        let content = new ReaderResolver(this.readers);
        // read the content
        let result = content.read(this.buffer);

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
            sharedResources: this.sharedResources,
            content: result
        };
    }

    /**
     * Saves the current buffer to an XNB file.
     * @param {String} path The destination for the XNB file.
     */
    save(path) {
        // TODO: implement saving
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

        // check to see if the magic is correct
        if (this.buffer.read(3).toString() != 'XNB')
            throw new XnbError(`Invalid file magic found, expecting "XNB", found "${this.buffer.lastRead}"`);

        // debug print that valid XNB magic was found
        Log.debug('Valid XNB magic found!');

        // load the target platform
        this.target = this.buffer.read(1).toString().toLowerCase();

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
        this.formatVersion = this.buffer.read(1).readInt8();

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
                Log.warn(`XNB Format Version 0x${this.formatVersion.toString('hex')} unknown.`);
                break;
        }

        // read the flag bits
        let flags = this.buffer.read(1).readInt8();
        // get the HiDef flag
        this.hidef = (flags & HIDEF_MASK) != 0;
        // get the compressed flag
        this.compressed = (flags & COMPRESSED_MASK) != 0;

        // debug content information
        Log.debug(`Content: ${(this.hidef?'HiDef':'Reach')}`);
        // log comprssed state
        Log.debug(`Compressed: ${this.compressed}`);

        // read the file size
        let size = this.buffer.read(4).readUInt32LE();
        // verify the size
        if (this.buffer.size != size)
            throw new XnbError('XNB file has been truncated!');

        // print out the file size
        Log.debug(`File size: ${size} bytes.`);

        // if the file is compressed
        if (this.compressed)
            Log.debug(`Uncompressed size: ${this.buffer.read(4).readUInt32LE()} bytes.`);
    }

}

module.exports = Xnb;
