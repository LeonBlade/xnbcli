const Log = require('./Log');
const Reader = require('./Reader');
const XnbError = require('./XnbError');

/**
 * Main class for XnbReader
 */
class XnbReader {

    /**
     * Constructor for XnbReader
     * @constructor
     */
    constructor(buffer) {
        this.buffer = buffer;
    }

    /**
     * Abstract method of read to be overriden
     */
    read() {
        throw new XnbError('Invalid use of abstract XnbReader class.');
    }

    /**
     * Resolves the complex type read from XNB into a simplified type
     * @param {String} type The complex type from XNB.
     * @returns {String} Returns simplified type.
     */
    static resolveType(type) {
        // gets the first part of the type
        let simpleType = type.split(/`|,/)[0];

        // check if its an array or not
        let isArray = simpleType.endsWith('[]');
        // if its an array then get the array type
        if (isArray)
            return `Array<${this.resolveType(simpleType.slice(0, -2))}>`;

        // if this is a XNA framework type then simplify the process
        if (simpleType.startsWith('Microsoft.Xna.Framework.Content.'))
            return simpleType.slice(32, simpleType.length - 6);

        // xTile TBin file
        if (simpleType == 'xTile.Pipeline.TideReader')
            return 'TBin';

        // cannot find simple type
        throw new XnbError(`Non-implemented type found, cannot resolve type ${simpleType}`);
    }

    /**
     * Returns an instance of XnbReader
     */
    static getReader(type) {

    }
}



module.exports = XnbReader;
