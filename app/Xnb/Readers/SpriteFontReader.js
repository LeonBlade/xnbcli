const BaseReader = require('./BaseReader');
const BufferReader = require('../../BufferReader');
const Int32Reader = require('./Int32Reader');
const SingleReader = require('./SingleReader');
const NullableReader = require('./NullableReader');
const CharReader = require('./CharReader');

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

    isValueType() {
        return false;
    }
}

module.exports = SpriteFontReader;
