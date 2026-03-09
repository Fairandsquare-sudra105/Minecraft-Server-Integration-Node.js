export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    SUCCESS = 2,
    WARNING = 3,
    ERROR = 4,
    NONE = 5
}
export declare class Logger {
    private static instance;
    private logLevel;
    private logFile;
    private fs;
    private constructor();
    static getInstance(): Logger;
    setLogLevel(level: LogLevel): void;
    setLogFile(filePath: string): void;
    private log;
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    success(message: string, ...args: any[]): void;
    warning(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    banner(): void;
}
//# sourceMappingURL=Logger.d.ts.map