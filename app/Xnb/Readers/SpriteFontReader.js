const BaseReader = require('./BaseReader');
const BufferReader = require('../../BufferReader');
const Int32Reader = require('./Int32Reader');
const SingleReader = require('./SingleReader');
const NullableReader = require('./NullableReader');
const CharReader = require('./CharReader');
const Texture2DReader = require('./Texture2DReader');
const ListReader = require('./ListReader');
const RectangleReader = require('./RectangleReader');
const Vector3Reader = require('./Vector3Reader');

/**
 * SpriteFont Reader
 * @class
 * @extends BaseReader
 */
class SpriteFontReader extends BaseReader {
    /**
     * Reads SpriteFont from buffer.
     * @param {BufferReader} buffer
     * @param {ReaderResolver} resolver
     * @returns {object}
     */
    read(buffer, resolver) {
        const int32Reader = new Int32Reader();
        const singleReader = new SingleReader();
        const nullableCharReader = new NullableReader(new CharReader());

        const texture = resolver.read(buffer)
        const glyphs = resolver.read(buffer);
        const cropping = resolver.read(buffer);;
        const characterMap = resolver.read(buffer);
        const verticalLineSpacing = int32Reader.read(buffer);
        const horizontalSpacing = singleReader.read(buffer);
        const kerning = resolver.read(buffer);
        const defaultCharacter = nullableCharReader.read(buffer);

        return {
            texture,
            glyphs,
            cropping,
            characterMap,
            verticalLineSpacing,
            horizontalSpacing,
            kerning,
            defaultCharacter
        };
    }

    write(buffer, content, resolver) {
        const int32Reader = new Int32Reader();
        const charReader = new CharReader();
        const singleReader = new SingleReader();
        const nullableCharReader = new NullableReader(charReader);
        const texture2DReader = new Texture2DReader();
        const rectangleListReader = new ListReader(new RectangleReader());
        const charListReader = new ListReader(charReader);
        const vector3ListReader = new ListReader(new Vector3Reader());

        this.writeIndex(buffer, resolver);

        try {
            texture2DReader.write(buffer, content.texture, resolver);
            rectangleListReader.write(buffer, content.glyphs, resolver);
            rectangleListReader.write(buffer, content.cropping, resolver);
            charListReader.write(buffer, content.characterMap, resolver);
            int32Reader.write(buffer, content.verticalLineSpacing, null);
            singleReader.write(buffer, content.horizontalSpacing, null);
            vector3ListReader.write(buffer, content.kerning, resolver);
            nullableCharReader.write(buffer, content.defaultCharacter, null);
        }
        catch (ex) {
            throw ex;
        }
    }

    isValueType() {
        return false;
    }
}

module.exports = SpriteFontReader;
