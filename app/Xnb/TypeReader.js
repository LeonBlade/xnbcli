const Log = require('../Log');
const BufferReader = require('../BufferReader');
const ReaderResolver = require('./ReaderResolver');
const XnbError = require('../XnbError');
const Readers = require('./Readers');

/**
 * Used to simplify type from XNB file.
 * @function simplifyType
 * @param  {String} type The long verbose type read from XNB file.
 * @returns {String} returns shorthand simplified type for use within this tool.
 */
const simplifyType = type => {
    // gets the first part of the type
    let simple = type.split(/`|,/)[0];

    Log.debug(`Type: ${simple}`);

    // check if its an array or not
    let isArray = simple.endsWith('[]');
    // if its an array then get the array type
    if (isArray)
        return `Array<${simplifyType(simple.slice(0, -2))}>`;

    // switch over the possible types regisered with this tool
    switch (simple) {

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

        // BmFont
        case 'BmFont.XmlSourceReader':
            return 'BmFont';

        // unimplemented type catch
        default:
            throw new XnbError(`Non-implemented type found, cannot resolve type "${simple}", "${type}".`);
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
    subtypes = subtypes ? subtypes[1].split(',').map(type => type.trim()) : [];

    // return info object
    return { type: mainType, subtypes };
}

exports.getTypeInfo = getTypeInfo;

/**
 * Gets an XnbReader instance based on type.
 * @function getReader
 * @param {String} type The simplified type to get reader based off of.
 * @returns {BaseReader} returns an instance of BaseReader for given type.
 */
const getReader = type => {
    // get type info for complex types
    let info = getTypeInfo(type);
    // loop over subtypes and resolve readers for them
    info.subtypes = info.subtypes.map(getReader);

    // if we have a reader then use one
    if (Readers.hasOwnProperty(`${info.type}Reader`))
        return new (Readers[`${info.type}Reader`])(info.subtypes[0], info.subtypes[1]);

    // throw an error as type is not supported
    throw new XnbError(`Invalid reader type "${type}" passed, unable to resolve!`);
}

exports.getReader = getReader;
