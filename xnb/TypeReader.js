const Log = require('./Log');
const BufferReader = require('./BufferReader');
const ReaderResolver = require('./ReaderResolver');
const XnbError = require('./XnbError');
const PNG = require('pngjs').PNG;
const fs = require('fs');

const classes = {};

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
    isValueType() {
        return true;
    }

    /**
     * Returns the type of reader
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
}
exports.TypeReader = TypeReader;

/**
 * Int32 Reader
 * @class
 * @extends TypeReader
 */
class Int32Reader extends TypeReader {
    read(buffer) {
        return buffer.read(4).readInt32LE();
    }
}
classes.Int32Reader = Int32Reader;

/**
 * UInt32 Reader
 * @class
 * @extends TypeReader
 */
class UInt32Reader extends TypeReader {
    read(buffer) {
        return buffer.read(4).readUInt32LE();
    }
}
classes.UInt32Reader = UInt32Reader;

/**
 * Single Reader
 * @class
 * @extends TypeReader
 */
class SingleReader extends TypeReader {
    read(buffer) {
        return buffer.read(4).readFloatLE();
    }
}
classes.SingleReader = SingleReader;

/**
 * Double Reader
 * @class
 * @extends TypeReader
 */
class DoubleReader extends TypeReader {
    read(buffer) {
        return buffer.read(4).readDoubleLE();
    }
}
classes.DoubleReader = DoubleReader;

/**
* Boolean Reader
* @class
* @extends TypeReader
*/
class BooleanReader extends TypeReader {
    read(buffer) {
        return Boolean(buffer.read(1).readInt8());
    }
}
classes.BooleanReader = BooleanReader;

/**
 * Char Reader
 * @class
 * @extends TypeReader
 */
class CharReader extends TypeReader {
    read(buffer) {
        let charSize = this._getCharSize(buffer.read(1, false).readInt8());
        return buffer.read(charSize).toString('utf8');
    }

    _getCharSize(byte) {
        return (( 0xE5000000 >> (( byte >> 3 ) & 0x1e )) & 3 ) + 1;
    }
}
classes.CharReader = CharReader;

/**
 * Reads in String data
 * @class
 * @extends TypeReader
 */
class StringReader extends TypeReader {
    read(buffer) {
        // read in the length of the string
        let length = buffer.read7BitNumber();
        // read in the UTF-8 encoded string
        return buffer.read(length).toString('utf8');
    }

    isValueType() {
        return false;
    }
}
classes.StringReader = StringReader;

/**
 * Nullable Reader
 * @class
 * @extends TypeReader
 */
class NullableReader extends TypeReader {
    /**
     * @constructor
     * @param {TypeReader} reader
     */
    constructor(reader) {
        super();
        /**
         * Nullable type
         * @type {TypeReader}
         */
        this.reader = reader;
    }

    /**
     * Reads a nullable type
     * @param {BufferReader} buffer
     * @param {ReaderResolver} resolver
     */
    read(buffer, resolver) {
        // get an instance of boolean reader
        const booleanReader = new BooleanReader();
        // read in if the nullable has a value or not
        let hasValue = booleanReader.read(buffer);

        // return the value
        return (hasValue ? (this.reader.isValueType() ? this.reader.read(buffer) : resolver.read(buffer)) : null);
    }

    isValueType() {
        return false;
    }

    get type() {
        return `Nullable<${this.reader.type}>`;
    }
}
classes.NullableReader = NullableReader;

/**
 * Array Reader
 * @class
 * @extends TypeReader
 */
class ArrayReader extends TypeReader {
    constructor(reader) {
        super();

        /** @type {TypeReader} */
        this.reader = reader;
    }

    /**
     * Reads in an Array.
     * @param {BufferReader} buffer
     * @param {ReaderResolver} resolver
     * @returns {Array}
     */
    read(buffer, resolver) {
        // create a uint32 reader
        const uint32Reader = new UInt32Reader();
        // read the number of elements in the array
        let size = uint32Reader.read(buffer);
        // create local array
        let array = [];

        // loop size number of times for the array elements
        for (let i = 0; i < size; i++) {
            // get value from buffer
            let value = this.reader.isValueType() ? this.reader.read(buffer) : resolver.read(buffer);
            // push into local array
            array.push(value);
        }

        // return the array
        return array;
    }

    isValueType() {
        return false;
    }

    get type() {
        return `Array<${this.reader.type}>`;
    }
}
classes.ArrayReader = ArrayReader;

/**
 * List Reader
 * @class
 * @extends TypeReader
 */
class ListReader extends TypeReader {
    constructor(reader) {
        super();
        /** @type {TypeReader} */
        this.reader = reader;
    }

    read(buffer, resolver) {
        const uint32Reader = new UInt32Reader();
        let size = uint32Reader.read(buffer);

        let list = [];
        for (let i = 0; i < size; i++) {
            let value = this.reader.isValueType() ? this.reader.read(buffer) : resolver.read(buffer);
            list.push(value);
        }
        return list;
    }

    get type() {
        return `List<${this.reader.type}>`;
    }
}
classes.ListReader = ListReader;


/**
 * Dictionary Reader
 * @class
 * @extends TypeReader
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

        /** @type {TypeReader} */
        this.key = key;
        /** @type {TypeReader} */
        this.value = value;
    }

    /**
     * Called to read in data from the buffer
     * @param {BufferReader} buffer Buffer to read from.
     * @param {ReaderResolver} resolver ReaderResolver to read non-primitive types.
     * @returns {object} returns an object of the Dictionary contents.
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
classes.DictionaryReader = DictionaryReader;

/**
 * Vector2 Reader
 * @class
 * @extends TypeReader
 */
class Vector2Reader extends TypeReader {
    read(buffer) {
        const singleReader = new SingleReader();

        let x = singleReader.read(buffer);
        let y = singleReader.read(buffer);

        return { x, y };
    }
}
classes.Vector2Reader = Vector2Reader;

/**
 * Vector3 Reader
 * @class
 * @extends TypeReader
 */
class Vector3Reader extends TypeReader {
    read(buffer) {
        const singleReader = new SingleReader();

        let x = singleReader.read(buffer);
        let y = singleReader.read(buffer);
        let z = singleReader.read(buffer);

        return { x, y, z };
    }
}
classes.Vector3Reader = Vector3Reader;

/**
 * Vector4 Reader
 * @class
 * @extends TypeReader
 */
class Vector4Reader extends TypeReader {
    read(buffer) {
        const singleReader = new SingleReader();

        let x = singleReader.read(buffer);
        let y = singleReader.read(buffer);
        let z = singleReader.read(buffer);
        let w = singleReader.read(buffer);

        return { x, y, z, w };
    }

    isValueType() {
        return false;
    }
}
classes.Vector4Reader = Vector4Reader;

/**
 * Rectangle Reader
 * @class
 * @extends TypeReader
 */
class RectangleReader extends TypeReader {
    read(buffer) {
        const int32Reader = new Int32Reader();

        let x = int32Reader.read(buffer);
        let y = int32Reader.read(buffer);
        let width = int32Reader.read(buffer);
        let height = int32Reader.read(buffer);

        return { x, y, width, height };
    }
}
classes.RectangleReader = RectangleReader;

/**
 * Texture2D Reader
 * @class
 * @extends TypeReader
 */
class Texture2DReader extends TypeReader {
    read(buffer) {
        const int32Reader = new Int32Reader();
        const uint32Reader = new UInt32Reader();

        let surfaceFormat = int32Reader.read(buffer);
        let width = uint32Reader.read(buffer);
        let height = uint32Reader.read(buffer);
        let mipCount = uint32Reader.read(buffer);

        let textureData = [];

        for (let i = 0; i < mipCount; i++) {
            let dataSize = uint32Reader.read(buffer);
            let data = buffer.read(dataSize);
            textureData.push(data);
        }

        // create png
    /*    let png = new PNG({
            width,
            height,
            inputHasAlpha: true
        });

        png.data = textureData[0];

        let output = PNG.sync.write(png);
        fs.writeFileSync(path, output);*/

        return {
            surfaceFormat,
            width,
            height,
            mipCount,
            data: textureData[0].toString('hex')
        };
    }

    _validateFormat(format) {
        return format >= 0 && format <= 19;
    }

    isValueType() {
        return false;
    }
}
classes.Texture2DReader = Texture2DReader;

/**
 * Effect Reader
 * @class
 * @extends TypeReader
 */
class EffectReader extends TypeReader {
    read(buffer) {
        const uint32Reader = new UInt32Reader();

        let size = uint32Reader.read(buffer);
        let bytecode = buffer.read(size);

        return bytecode.toString('hex');
    }

    isValueType() {
        return false;
    }
}
classes.EffectReader = EffectReader;

/**
 * SpriteFont Reader
 * @class
 * @extends TypeReader
 */
class SpriteFontReader extends TypeReader {
    /**
     * @param {BufferReader} buffer
     * @param {ReaderResolver} resolver
     */
    read(buffer, resolver) {
        const int32Reader = new Int32Reader();
        const singleReader = new SingleReader();
        const nullableCharReader = new NullableReader(new CharReader());

        let texture = resolver.read(buffer)
        let glyphs = resolver.read(buffer);
        let cropping = resolver.read(buffer);;
        let characterMap = resolver.read(buffer);
        let verticalLineSpacing = int32Reader.read(buffer);
        let horizontalSpacing = singleReader.read(buffer);
        let kerning = resolver.read(buffer);
        let defaultCharacter = nullableCharReader.read(buffer);

        return {
            texture: texture.toString('hex'),
            glyphs,
            cropping,
            characterMap,
            verticalLineSpacing,
            horizontalSpacing,
            kerning,
            defaultCharacter
        };
    }

    isValueType() {
        return false;
    }
}
classes.SpriteFontReader = SpriteFontReader;

/**
 * TBin Reader
 * @class
 * @extends TypeReader
 */
class TBinReader extends TypeReader {
    read(buffer) {
        // read in the size of the data block
        let size = buffer.read(4).readInt32LE();
        // read in the data block
        let data = buffer.read(size);

        // return the data
        return { hex: data.toString('hex') };
    }

    isValueType() {
        return false;
    }
}
classes.TBinReader = TBinReader;

// export classes
Object.assign(exports, classes);

/**
 * Used to simplify type from XNB file.
 * @function simplifyType
 * @param  {String} type The long verbose type read from XNB file.
 * @returns {String} returns shorthand simplified type for use within this tool.
 */
const simplifyType = type => {
    // gets the first part of the type
    let simple = type.split(/`|,/)[0];

    Log.debug(simple);

    // check if its an array or not
    let isArray = simple.endsWith('[]');
    Log.debug(isArray);
    // if its an array then get the array type
    if (isArray)
        return `Array<${simplifyType(simple.slice(0, -2))}>`;

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
            return `List<${listType}>`;

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
            throw new XnbError(`Non-implemented type found, cannot resolve type ${simple} @ ${JSON.stringify(process.argv)}`);
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
    let pattern = /\[(([a-zA-Z0-9\.\,\=\`]+)(\[\])?(\, |\])){1,}/g;
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

        case 'Nullable':
            return new NullableReader(info.subtypes[0]);

        case 'Array':
            return new ArrayReader(info.subtypes[0]);

        case 'List':
            return new ListReader(info.subtypes[0]);

        case 'Nullable':
            return new NullableReader(info.subtypes[0]);

        case 'Dictionary':
            return new DictionaryReader(info.subtypes[0], info.subtypes[1]);

        default:
            // if we have a generic reader class then just instantiate one from the list
            if (classes.hasOwnProperty(`${info.type}Reader`))
                return new (classes[`${info.type}Reader`])();

            throw new XnbError(`Invalid reader type "${type}" passed, unable to resolve!`);
    }
}

exports.getReader = getReader;
