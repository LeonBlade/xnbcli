const BaseReader = require('./BaseReader');
const BufferReader = require('../BufferReader');
const ReaderResolver = require('../ReaderResolver');
const UInt32Reader = require('./UInt32Reader');

/**
 * Dictionary Reader
 * @class
 * @extends BaseReader
 */
class DictionaryReader extends BaseReader {

    /**
     * Constructor for DictionaryReader.
     * @constructor
     * @param {BaseReader} key The BaseReader for the dictionary key.
     * @param {BaseReader} value The BaseReader for the dictionary value.
     */
    constructor(key, value) {
        // verify key and value are specified
        if (key == undefined || value == undefined)
            throw new XnbError('Cannot create instance of DictionaryReader without Key and Value.');

        // call base constructor
        super();

        /** @type {BaseReader} */
        this.key = key;
        /** @type {BaseReader} */
        this.value = value;
    }

    /**
     * Reads Dictionary from buffer.
     * @param {BufferReader} buffer Buffer to read from.
     * @param {ReaderResolver} resolver ReaderResolver to read non-primitive types.
     * @returns {object}
     */
    read(buffer, resolver) {
        // the dictionary to return
        let dictionary = {};

        // read in the size of the dictionary
        const uint32Reader = new UInt32Reader();
        let size = uint32Reader.read(buffer);

        Log.debug(`Dictionary has ${size} entries.`);
        Log.debug(buffer.seek);

        // loop over the size of the dictionary and read in the data
        for (let i = 0; i < size; i++) {
            // get the key
            let key = this.key.isValueType() ? this.key.read(buffer) : resolver.read(buffer);
            // get the value
            let value = this.value.isValueType() ? this.value.read(buffer) : resolver.read(buffer);

            // assign KV pair to the dictionary
            dictionary[key] = value;
        }

        // return the dictionary object
        return dictionary;
    }

    isValueType() {
        return false;
    }

    get type() {
        return `Dictionary<${this.key.type},${this.value.type}>`;
    }
}

module.exports = DictionaryReader;
