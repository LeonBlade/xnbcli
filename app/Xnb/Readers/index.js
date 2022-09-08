// list of readers available
const readers = [
    'ArrayReader',
    'BaseReader',
    'BmFontReader',
    'BooleanReader',
    'CharReader',
    'DictionaryReader',
    'DoubleReader',
    'EffectReader',
    'Int32Reader',
    'ListReader',
    'NullableReader',
    'RectangleReader',
    'SingleReader',
    'SoundEffectReader',
    'SpriteFontReader',
    'StringReader',
    'TBinReader',
    'Texture2DReader',
    'UInt32Reader',
    'Vector2Reader',
    'Vector3Reader',
    'Vector4Reader'
];

// loop over readers to export them
//for (let reader of readers)
//    exports[reader] = require(`./${reader}`);

module.exports = {
    ArrayReader: require('./ArrayReader'),
    BaseReader: require('./BaseReader'),
    BmFontReader: require('./BmFontReader'),
    BooleanReader: require('./BooleanReader'),
    CharReader: require('./CharReader'),
    DictionaryReader: require('./DictionaryReader'),
    DoubleReader: require('./DoubleReader'),
    EffectReader: require('./EffectReader'),
    Int32Reader: require('./Int32Reader'),
    ListReader: require('./ListReader'),
    NullableReader: require('./NullableReader'),
    RectangleReader: require('./RectangleReader'),
    SingleReader: require('./SingleReader'),
    SoundEffectReader: require('./SoundEffectReader'),
    SpriteFontReader: require('./SpriteFontReader'),
    StringReader: require('./StringReader'),
    TBinReader: require('./TBinReader'),
    Texture2DReader: require('./Texture2DReader'),
    UInt32Reader: require('./UInt32Reader'),
    Vector2Reader: require('./Vector2Reader'),
    Vector3Reader: require('./Vector3Reader'),
    Vector4Reader: require('./Vector4Reader')
};
