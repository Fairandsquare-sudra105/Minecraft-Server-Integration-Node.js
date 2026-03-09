export declare class FileUtils {
    private static logger;
    static ensureDir(dir: string): Promise<void>;
    static writeFile(filePath: string, data: string | Buffer): Promise<void>;
    static readFile(filePath: string): Promise<Buffer>;
    static fileExists(filePath: string): Promise<boolean>;
    static deleteFile(filePath: string): Promise<void>;
    static deleteFolder(folderPath: string): Promise<void>;
    static copyFile(source: string, destination: string): Promise<void>;
    static moveFile(source: string, destination: string): Promise<void>;
    static listFiles(dir: string, pattern?: RegExp): Promise<string[]>;
    static getFileSize(filePath: string): Promise<number>;
    static extractZip(zipPath: string, destPath: string): Promise<void>;
    static extractTar(tarPath: string, destPath: string): Promise<void>;
    static createBackup(sourcePath: string, backupPath: string): Promise<void>;
    static writeProperties(filePath: string, properties: Record<string, any>): Promise<void>;
    static readProperties(filePath: string): Promise<Record<string, string>>;
    static ensureServerStructure(config: any): Promise<void>;
}
//# sourceMappingURL=FileUtils.d.ts.map