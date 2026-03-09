"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileUtils = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const tar = __importStar(require("tar"));
const AdmZip = require('adm-zip');
const Logger_1 = require("./Logger");
class FileUtils {
    static logger = Logger_1.Logger.getInstance();
    static async ensureDir(dir) {
        await fs.ensureDir(dir);
    }
    static async writeFile(filePath, data) {
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, data);
    }
    static async readFile(filePath) {
        return fs.readFile(filePath);
    }
    static async fileExists(filePath) {
        return fs.pathExists(filePath);
    }
    static async deleteFile(filePath) {
        if (await fs.pathExists(filePath)) {
            await fs.remove(filePath);
        }
    }
    static async deleteFolder(folderPath) {
        if (await fs.pathExists(folderPath)) {
            await fs.remove(folderPath);
        }
    }
    static async copyFile(source, destination) {
        await fs.ensureDir(path.dirname(destination));
        await fs.copy(source, destination);
    }
    static async moveFile(source, destination) {
        await fs.ensureDir(path.dirname(destination));
        await fs.move(source, destination, { overwrite: true });
    }
    static async listFiles(dir, pattern) {
        if (!await fs.pathExists(dir)) {
            return [];
        }
        const files = await fs.readdir(dir);
        if (pattern) {
            return files.filter(f => pattern.test(f));
        }
        return files;
    }
    static async getFileSize(filePath) {
        const stat = await fs.stat(filePath);
        return stat.size;
    }
    static async extractZip(zipPath, destPath) {
        this.logger.debug(`Extracting ${zipPath} to ${destPath}`);
        try {
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(destPath, true);
            this.logger.debug('Extraction complete');
        }
        catch (error) {
            this.logger.error('Failed to extract zip:', error);
            throw error;
        }
    }
    static async extractTar(tarPath, destPath) {
        this.logger.debug(`Extracting ${tarPath} to ${destPath}`);
        try {
            await tar.extract({
                file: tarPath,
                cwd: destPath
            });
            this.logger.debug('Extraction complete');
        }
        catch (error) {
            this.logger.error('Failed to extract tar:', error);
            throw error;
        }
    }
    static async createBackup(sourcePath, backupPath) {
        this.logger.info(`Creating backup of ${sourcePath} to ${backupPath}`);
        await fs.ensureDir(path.dirname(backupPath));
        if (await fs.pathExists(sourcePath)) {
            await fs.copy(sourcePath, backupPath);
            const size = await this.getFileSize(backupPath);
            this.logger.success(`Backup created: ${backupPath} (${size} bytes)`);
        }
        else {
            this.logger.warning(`Source path not found: ${sourcePath}`);
        }
    }
    static async writeProperties(filePath, properties) {
        const lines = [];
        for (const [key, value] of Object.entries(properties)) {
            if (value !== undefined && value !== null) {
                lines.push(`${key}=${value}`);
            }
        }
        await this.writeFile(filePath, lines.join('\n'));
        this.logger.debug(`Properties written to ${filePath}`);
    }
    static async readProperties(filePath) {
        if (!await this.fileExists(filePath)) {
            return {};
        }
        const content = await fs.readFile(filePath, 'utf8');
        const properties = {};
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
    static async ensureServerStructure(config) {
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
exports.FileUtils = FileUtils;
//# sourceMappingURL=FileUtils.js.map