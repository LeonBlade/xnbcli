const Struct = obj => {
    if (typeof obj != 'object' || Array.isArray(obj))
        throw new Error('Invalid struct');
    return function (default_params = obj) {
        default_params = Object.assign(obj, default_params);
        for (let key of Object.keys(default_params))
            this[key] = default_params[key];
        return new Proxy(this, {
            set (target, key, value) {
                if (!target.hasOwnProperty(key))
                    throw new TypeError(`Invalid property ${key}`);
                target[key] = value;
            }
        });
    };
};

module.exports = Struct;
