const Log = require('./Log');
const BufferReader = require('./BufferReader');
const ContentReader = require('./ContentReader');
const XnbError = require('./XnbError');

/**
 * Main class for XnbReader
 * @abstract
 * @class
 */
class TypeReader {
    /**
     * Returns if type is a primitive type without metadata.
     * @public
     * @method
     * @returns {Boolean} Returns true if type is primitive.
     */
    isPrimitive() {
        return true;
    }

    /**
     * Returns the type of reader
     * @public
     * @property
     * @returns {string}
     */
    get type() {
        throw new XnbError('Cannot invoke methods on abstract class.');
    }

    /**
     * Reads the buffer by the specification of the type reader.
     * @public
     * @param {BufferReader} buffer The buffer to read from.
     * @param {ContentReader} reader The content reader to resolve readers from.
     * @returns {mixed} Returns the type as specified by the type reader.
     */
    read(buffer, reader) {
        throw new XnbError('Cannot invoke methods on abstract class.');
    }
}

exports.TypeReader = TypeReader;

/**
 * Reads booleans
 * Boolean
 * @class
 */
class BooleanReader extends TypeReader {
    /**
     * Reads a boolean from the buffer
     * @public
     * @method
     * @param {BufferReader} buffer The buffer to read from.
     * @returns {Boolean}
     */
    read(buffer) {
        return Boolean(buffer.read(1).readInt8());
    }

    get type() {
        return 'Boolean';
    }
}

/**
 * Reads in String data
 * @class
 */
class StringReader extends TypeReader {
    /**
     * Read from the buffer.
     * @public
     * @method
     * @param {BufferReader} buffer The buffer to read from.
     * @param {ContentReader} reader The content reader to resolve readers with.
     * @returns {string} Returns the string read.
     */
    read(buffer, reader) {
        // read in the length of the string
        let length = buffer.read7BitNumber();
        // read in the UTF-8 encoded string
        return buffer.read(length).toString('utf8');
    }

    isPrimitive() {
        return false;
    }

    get type() {
        return 'String';
    }
}

exports.StringReader = StringReader;

/**
 * Reads in Dictionary data
 * @class
 */
class DictionaryReader extends TypeReader {

    /**
     * Constructor for DictionaryReader.
     * @constructor
     * @param {TypeReader} key The TypeReader for the dictionary key.
     * @param {TypeReader} value The TypeReader for the dictionary value.
     */
    constructor(key, value) {
        // verify key and value are specified
        if (key == undefined || value == undefined)
            throw new XnbError('Cannot create instance of DictionaryReader without Key and Value.');

        // call base constructor
        super();

        /**
         * Key TypeReader
         * @type {TypeReader}
         */
        this.key = key;

        /**
         * Value TypeReader
         * @type {TypeReader}
         */
        this.value = value;
    }

    /**
     * Called to read in data from the buffer
     * @public
     * @method
     * @param {BufferReader} buffer Buffer to read from.
     * @param {ContentReader} reader ContentReader to read non-primitive types.
     * @returns {object} returns an object of the Dictionary contents.
     */
    read(buffer, reader) {
        // the dictionary to return
        let dictionary = {};

        // read in the size of the dictionary
        let count = buffer.read(4).readUInt32LE();
        Log.debug(`Dictionary has ${count} entries.`);
        Log.debug(buffer.seek);

        // loop over the size of the dictionary and read in the data
        for (let i = 0; i < count; i++) {
            // get the key
            let key = this.key.isPrimitive() ? this.key.read(buffer) : reader.read(buffer);
            // get the value
            let value = this.key.isPrimitive() ? this.key.read(buffer) : reader.read(buffer);

            Log.debug(`Key: ${key}`);
            Log.debug(`Value: ${value}`);
            Log.debug();

            // assign KV pair to the dictionary
            dictionary[key] = value;
        }

        // return the dictionary object
        return dictionary;
    }

    isPrimitive() {
        return false;
    }

    get type() {
        return `Dictionary<${this.key.type},${this.value.type}>`;
    }
}

/**
 * Used to simplify type from XNB file.
 * @function simplifyType
 * @param  {String} type The long verbose type read from XNB file.
 * @returns {String} returns shorthand simplified type for use within this tool.
 */
const simplifyType = type => {
    // gets the first part of the type
    let simple = type.split(/`|,/)[0];

    // check if its an array or not
    let isArray = simple.endsWith('[]');
    // if its an array then get the array type
    if (isArray)
        return `Array<${resolveType(simple.slice(0, -2))}>`;

    // switch over the possible types regisered with this tool
    switch(simple) {

        // Boolean
        case 'Microsoft.Xna.Framework.Content.BooleanReader':
        case 'System.Boolean':
            return 'Boolean';

        // Char
        case 'Microsoft.Xna.Framework.Content.CharReader':
        case 'System.Char':
            return 'Char';

        // Int32
        case 'Microsoft.Xna.Framework.Content.Int32Reader':
        case 'System.Int32':
            return 'Int32';

        // String
        case 'Microsoft.Xna.Framework.Content.StringReader':
        case 'System.String':
            return 'String';

        // Dictionary
        case 'Microsoft.Xna.Framework.Content.DictionaryReader':
            let subtypes = parseSubtypes(type).map(simplifyType);
            return `Dictionary<${subtypes[0]},${subtypes[1]}>`;

        // Array
        case 'Microsoft.Xna.Framework.Content.ArrayReader':
            let arrayType = parseSubtypes(type).map(simplifyType);
            return `Array<${arrayType}>`;

        // List
        case 'Microsoft.Xna.Framework.Content.ListReader':
            let listType = parseSubtypes(type).map(simplifyType);
            return `List<${listTYpe}>`;

        // Texture2D
        case 'Microsoft.Xna.Framework.Content.Texture2DReader':
            return 'Texture2D';

        // Vector2
        case 'Microsoft.Xna.Framework.Content.Vector2Reader':
        case 'Microsoft.Xna.Framework.Vector2':
            return 'Vector2';

        // Vector3
        case 'Microsoft.Xna.Framework.Content.Vector3Reader':
        case 'Microsoft.Xna.Framework.Vector3':
            return 'Vector3';

        // Vector3
        case 'Microsoft.Xna.Framework.Content.Vector4Reader':
        case 'Microsoft.Xna.Framework.Vector4':
            return 'Vector4';

        // SpriteFont
        case 'Microsoft.Xna.Framework.Content.SpriteFontReader':
            return 'SpriteFont';

        // Rectangle
        case 'Microsoft.Xna.Framework.Content.RectangleReader':
        case 'Microsoft.Xna.Framework.Rectangle':
            return 'Rectangle';

        // Effect
        case 'Microsoft.Xna.Framework.Content.EffectReader':
        case 'Microsoft.Xna.Framework.Graphics.Effect':
            return 'Effect';

        // xTile TBin
        case 'xTile.Pipeline.TideReader':
            return 'TBin';

        // unimplemented type catch
        default:
            throw new XnbError(`Non-implemented type found, cannot resolve type ${simple}`);
    }
}

exports.simplifyType = simplifyType;

/**
 * Parses subtypes from a type like Dictionary or List
 * @function parseSubtypes
 * @param  {String} type The type to parse with subtypes in.
 * @returns {String[]} returns an array of subtypes
 */
const parseSubtypes = type => {
    // split the string by the ` after the type
    let subtype = type.split('`')[1];
    // get the number of types following the ` in type string
    let count = subtype.slice(0, 1);

    // get the contents of the wrapped array
    subtype = subtype.slice(2, -1);
    Log.debug(`Found ${count} subtypes.`);

    // regex pattern to match the subtypes
    let pattern = /\[([^\]]+)\]/g;
    // get matches
    let matches = subtype.match(pattern).map(e => {
        return e.slice(1, -1);
    });

    // return the matches
    return matches;
}

exports.parseSubtypes = parseSubtypes;

/**
 * Get type info from simple type
 * @param   {String} type Simple type to get info from.
 * @returns {Object} returns an object containing information about the type.
 */
const getTypeInfo = type => {
    // get type before angle brackets for complex types
    let mainType = type.match(/[^<]+/)[0];
    // get the subtypes within brackets
    let subtypes = type.match(/<(.+)>/);

    // if we do have subtypes then split and trim them
    if (subtypes)
        subtypes = subtypes[1].split(',').map(type => type.trim());
    else
        subtypes = [];

    // return info object
    return { type: mainType, subtypes };
}

exports.getTypeInfo = getTypeInfo;

/**
 * Gets an XnbReader instance based on type.
 * @function getReader
 * @param {String} type The simplified type to get reader based off of.
 * @returns {TypeReader} returns an instance of TypeReader for given type.
 */
const getReader = type => {
    // get type info for complex types
    let info = getTypeInfo(type);
    // loop over subtypes and resolve readers for them
    info.subtypes = info.subtypes.map(getReader);

    // switch over possible implemented types to return reader instance for
    switch(info.type) {

        case 'Dictionary':
            return new DictionaryReader(info.subtypes[0], info.subtypes[1]);

        case 'String':
            return new StringReader();

        default:
            throw new XnbError(`Invalid reader type "${type}" passed, unable to resolve!`);
    }
}

exports.getReader = getReader;
