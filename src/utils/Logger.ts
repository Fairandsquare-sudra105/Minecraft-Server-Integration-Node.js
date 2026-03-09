import chalk from 'chalk';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    SUCCESS = 2,
    WARNING = 3,
    ERROR = 4,
    NONE = 5
}

export class Logger {
    private static instance: Logger;
    private logLevel: LogLevel = LogLevel.INFO;
    private logFile: string | null = null;
    private fs: any;

    private constructor() {
        try {
            this.fs = require('fs-extra');
        } catch {}
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    public setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    public setLogFile(filePath: string): void {
        this.logFile = filePath;
    }

    private log(level: LogLevel, message: string, ...args: any[]): void {
        if (level < this.logLevel) return;

        const timestamp = new Date().toISOString();
        const levelName = LogLevel[level];
        
        let coloredMessage = '';
        switch (level) {
            case LogLevel.DEBUG:
                coloredMessage = chalk.gray(`[${timestamp}] [${levelName}] ${message}`);
                break;
            case LogLevel.INFO:
                coloredMessage = chalk.cyan(`[${timestamp}] [${levelName}] ${message}`);
                break;
            case LogLevel.SUCCESS:
                coloredMessage = chalk.green(`[${timestamp}] [${levelName}] ${message}`);
                break;
            case LogLevel.WARNING:
                coloredMessage = chalk.yellow(`[${timestamp}] [${levelName}] ${message}`);
                break;
            case LogLevel.ERROR:
                coloredMessage = chalk.red(`[${timestamp}] [${levelName}] ${message}`);
                break;
        }

        console.log(coloredMessage, ...args);

        if (this.logFile && this.fs) {
            const logMessage = `[${timestamp}] [${levelName}] ${message} ${args.map(a => JSON.stringify(a)).join(' ')}\n`;
            this.fs.appendFileSync(this.logFile, logMessage);
        }
    }

    public debug(message: string, ...args: any[]): void {
        this.log(LogLevel.DEBUG, message, ...args);
    }

    public info(message: string, ...args: any[]): void {
        this.log(LogLevel.INFO, message, ...args);
    }

    public success(message: string, ...args: any[]): void {
        this.log(LogLevel.SUCCESS, message, ...args);
    }

    public warning(message: string, ...args: any[]): void {
        this.log(LogLevel.WARNING, message, ...args);
    }

    public error(message: string, ...args: any[]): void {
        this.log(LogLevel.ERROR, message, ...args);
    }

    public banner(): void {
        console.log(chalk.cyan(`
Mc Headless - Powered By Dimzxzzx07
        `));
    }
}