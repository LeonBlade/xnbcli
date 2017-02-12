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
for (let reader of readers)
    exports[reader] = require(`./${reader}`);
