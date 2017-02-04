const chalk = require('chalk');

/**
 * Log class with static members to log messages to the console.
 */
class Log {

    /**
     * Constructor for Log class.
     * @constructor
     * @param {Boolean} [debug] True if you want to print debug information.
     */
    constructor(debug = false) {
        this._debug = debug;
    }

    /**
     * Sets the debug mode setting.
     * @method debug
     * @param  {Boolean} mode State of displaying debug logs in the console.
     */
    static set DEBUG(mode) {
        this._debug = mode;
    }

    /**
     * Displays an info message
     * @param {String} message Message to display to the console as info.
     */
    static info(message = '') {
        console.log(chalk.bold.blue('[INFO] ') + message);
    }

    /**
     * Displays a debug message
     * @param {String} message Message to display to the console if debug is enabled.
     */
    static debug(message = '') {
        if (this._debug)
            console.log(chalk.bold.green('[DEBUG] ') + message);
    }

    /**
     * Displays a warning message
     * @param {String} message Message to display to the console as a warning.
     */
    static warn(message = '') {
        console.log(chalk.bold.yellow('[WARN] ') + message);
    }

    /**
     * Displays an error message
     * @param {String} message Message to display to the console as an error.
     */
    static error(message = '') {
        console.log(chalk.bold.red('[ERROR] ') + message);
    }

    /**
     * Displays a binary message
     * @param {Number} n
     * @param {Number} size
     * @param {Number} sliceBegin
     * @param {Number} sliceEnd
     */
    static b(n, size = 8, sliceBegin = -1, sliceEnd = -1) {
        var z = ''
        while (z.length < size)
            z += '0';
        z = z.slice(n.toString(2).length) + n.toString(2);
        if (sliceBegin == -1 && sliceEnd == -1)
            return `0b${z}`;
        return  chalk.gray('0b') +
                chalk.gray(z.slice(0, sliceBegin)) +
                chalk.bold.blue('[') + chalk.bold(z.slice(sliceBegin, sliceEnd)) + chalk.bold.blue(']') +
                chalk.gray(z.slice(sliceEnd));
    }
}

// export the log
module.exports = Log;
