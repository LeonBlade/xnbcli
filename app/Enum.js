const Enum = values => {
    if (!Array.isArray(values))
        throw new Error('Invalid parameters, requires array of values.');
    if (values.length === 0)
        throw new Error('Invalid paremeters, empty value set.');

    const _enum = {};
    for (let i = 0; i < values.length; i++) {
        try {
            new Function(`var ${values[i]}`)();
        }
        catch (ex) {
            throw new Error(`Invalid paremeters, ${values[i]} is not a valid name.`);
        }
        _enum[values[i]] = Symbol();
    }

    // return a new proxy of frozen enum
    return Object.freeze(_enum);
}

module.exports = Enum;
