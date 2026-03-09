"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.LogLevel = void 0;
const chalk_1 = __importDefault(require("chalk"));
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["SUCCESS"] = 2] = "SUCCESS";
    LogLevel[LogLevel["WARNING"] = 3] = "WARNING";
    LogLevel[LogLevel["ERROR"] = 4] = "ERROR";
    LogLevel[LogLevel["NONE"] = 5] = "NONE";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    static instance;
    logLevel = LogLevel.INFO;
    logFile = null;
    fs;
    constructor() {
        try {
            this.fs = require('fs-extra');
        }
        catch { }
    }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    setLogLevel(level) {
        this.logLevel = level;
    }
    setLogFile(filePath) {
        this.logFile = filePath;
    }
    log(level, message, ...args) {
        if (level < this.logLevel)
            return;
        const timestamp = new Date().toISOString();
        const levelName = LogLevel[level];
        let coloredMessage = '';
        switch (level) {
            case LogLevel.DEBUG:
                coloredMessage = chalk_1.default.gray(`[${timestamp}] [${levelName}] ${message}`);
                break;
            case LogLevel.INFO:
                coloredMessage = chalk_1.default.cyan(`[${timestamp}] [${levelName}] ${message}`);
                break;
            case LogLevel.SUCCESS:
                coloredMessage = chalk_1.default.green(`[${timestamp}] [${levelName}] ${message}`);
                break;
            case LogLevel.WARNING:
                coloredMessage = chalk_1.default.yellow(`[${timestamp}] [${levelName}] ${message}`);
                break;
            case LogLevel.ERROR:
                coloredMessage = chalk_1.default.red(`[${timestamp}] [${levelName}] ${message}`);
                break;
        }
        console.log(coloredMessage, ...args);
        if (this.logFile && this.fs) {
            const logMessage = `[${timestamp}] [${levelName}] ${message} ${args.map(a => JSON.stringify(a)).join(' ')}\n`;
            this.fs.appendFileSync(this.logFile, logMessage);
        }
    }
    debug(message, ...args) {
        this.log(LogLevel.DEBUG, message, ...args);
    }
    info(message, ...args) {
        this.log(LogLevel.INFO, message, ...args);
    }
    success(message, ...args) {
        this.log(LogLevel.SUCCESS, message, ...args);
    }
    warning(message, ...args) {
        this.log(LogLevel.WARNING, message, ...args);
    }
    error(message, ...args) {
        this.log(LogLevel.ERROR, message, ...args);
    }
    banner() {
        console.log(chalk_1.default.cyan(`
Mc Headless - Powered By Dimzxzzx07
        `));
    }
}
exports.Logger = Logger;
//# sourceMappingURL=Logger.js.map