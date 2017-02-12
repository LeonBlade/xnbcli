const XnbError = require('../../XnbError');

/**
 * Base class for all readers.
 * @abstract
 * @class
 */
class BaseReader {
    /**
     * Returns if type normally requires a special reader.
     * @public
     * @method
     * @returns {Boolean} Returns true if type is primitive.
     */
    isValueType() {
        return true;
    }

    /**
     * Returns string type of reader
     * @public
     * @property
     * @returns {string}
     */
    get type() {
        return this.constructor.name.slice(0, -6);
    }

    /**
     * Reads the buffer by the specification of the type reader.
     * @public
     * @param {BufferReader} buffer The buffer to read from.
     * @param {ReaderResolver} resolver The content reader to resolve readers from.
     * @returns {mixed} Returns the type as specified by the type reader.
     */
    read(buffer, resolver) {
        throw new XnbError('Cannot invoke methods on abstract class.');
    }

    /**
     * When printing out in a string.
     * @returns {String}
     */
    toString() {
        return this.type;
    }
}

module.exports = BaseReader;
