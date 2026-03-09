import * as fs from 'fs-extra';
import * as path from 'path';
import * as tar from 'tar';
const AdmZip = require('adm-zip');
import { Logger } from './Logger';

export class FileUtils {
    private static logger = Logger.getInstance();

    public static async ensureDir(dir: string): Promise<void> {
        await fs.ensureDir(dir);
    }

    public static async writeFile(filePath: string, data: string | Buffer): Promise<void> {
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, data);
    }

    public static async readFile(filePath: string): Promise<Buffer> {
        return fs.readFile(filePath);
    }

    public static async fileExists(filePath: string): Promise<boolean> {
        return fs.pathExists(filePath);
    }

    public static async deleteFile(filePath: string): Promise<void> {
        if (await fs.pathExists(filePath)) {
            await fs.remove(filePath);
        }
    }

    public static async deleteFolder(folderPath: string): Promise<void> {
        if (await fs.pathExists(folderPath)) {
            await fs.remove(folderPath);
        }
    }

    public static async copyFile(source: string, destination: string): Promise<void> {
        await fs.ensureDir(path.dirname(destination));
        await fs.copy(source, destination);
    }

    public static async moveFile(source: string, destination: string): Promise<void> {
        await fs.ensureDir(path.dirname(destination));
        await fs.move(source, destination, { overwrite: true });
    }

    public static async listFiles(dir: string, pattern?: RegExp): Promise<string[]> {
        if (!await fs.pathExists(dir)) {
            return [];
        }

        const files = await fs.readdir(dir);
        
        if (pattern) {
            return files.filter(f => pattern.test(f));
        }
        
        return files;
    }

    public static async getFileSize(filePath: string): Promise<number> {
        const stat = await fs.stat(filePath);
        return stat.size;
    }

    public static async extractZip(zipPath: string, destPath: string): Promise<void> {
        this.logger.debug(`Extracting ${zipPath} to ${destPath}`);
        
        try {
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(destPath, true);
            this.logger.debug('Extraction complete');
        } catch (error) {
            this.logger.error('Failed to extract zip:', error);
            throw error;
        }
    }

    public static async extractTar(tarPath: string, destPath: string): Promise<void> {
        this.logger.debug(`Extracting ${tarPath} to ${destPath}`);
        
        try {
            await tar.extract({
                file: tarPath,
                cwd: destPath
            });
            this.logger.debug('Extraction complete');
        } catch (error) {
            this.logger.error('Failed to extract tar:', error);
            throw error;
        }
    }

    public static async createBackup(sourcePath: string, backupPath: string): Promise<void> {
        this.logger.info(`Creating backup of ${sourcePath} to ${backupPath}`);
        
        await fs.ensureDir(path.dirname(backupPath));
        
        if (await fs.pathExists(sourcePath)) {
            await fs.copy(sourcePath, backupPath);
            const size = await this.getFileSize(backupPath);
            this.logger.success(`Backup created: ${backupPath} (${size} bytes)`);
        } else {
            this.logger.warning(`Source path not found: ${sourcePath}`);
        }
    }

    public static async writeProperties(filePath: string, properties: Record<string, any>): Promise<void> {
        const lines: string[] = [];
        
        for (const [key, value] of Object.entries(properties)) {
            if (value !== undefined && value !== null) {
                lines.push(`${key}=${value}`);
            }
        }
        
        await this.writeFile(filePath, lines.join('\n'));
        this.logger.debug(`Properties written to ${filePath}`);
    }

    public static async readProperties(filePath: string): Promise<Record<string, string>> {
        if (!await this.fileExists(filePath)) {
            return {};
        }

        const content = await fs.readFile(filePath, 'utf8');
        const properties: Record<string, string> = {};

        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const eq = trimmed.indexOf('=');
                if (eq > 0) {
                    const key = trimmed.substring(0, eq).trim();
                    const value = trimmed.substring(eq + 1).trim();
                    properties[key] = value;
                }
            }
        }

        return properties;
    }

    public static async ensureServerStructure(config: any): Promise<void> {
        const folders = [
            config.folders.addons,
            config.folders.mods,
            config.folders.plugins,
            config.folders.world,
            path.join(process.cwd(), 'logs'),
            path.join(process.cwd(), 'backups')
        ];

        for (const folder of folders) {
            await this.ensureDir(folder);
        }

        this.logger.debug('Server structure created');
    }
}