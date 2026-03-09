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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkinRestorerManager = void 0;
const FileUtils_1 = require("../utils/FileUtils");
const Logger_1 = require("../utils/Logger");
const path = __importStar(require("path"));
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs-extra"));
class SkinRestorerManager {
    logger = Logger_1.Logger.getInstance();
    SKINRESTORER_URL = 'https://github.com/SkinsRestorer/SkinsRestorerX/releases/latest/download/SkinsRestorer.jar';
    async setup(config) {
        const pluginsDir = config.folders.plugins;
        await FileUtils_1.FileUtils.ensureDir(pluginsDir);
        this.logger.info('Setting up SkinRestorer...');
        await this.cleanupCorruptFiles(pluginsDir);
        await this.downloadSkinRestorer(pluginsDir);
        await this.verifyPlugin(pluginsDir);
        this.logger.success('SkinRestorer installed successfully');
        this.logger.info('Player skins will now be restored automatically');
    }
    async cleanupCorruptFiles(pluginsDir) {
        const filePath = path.join(pluginsDir, 'SkinsRestorer.jar');
        if (await FileUtils_1.FileUtils.fileExists(filePath)) {
            try {
                const stats = await fs.stat(filePath);
                if (stats.size < 100000) {
                    this.logger.warning('Corrupt SkinRestorer detected, removing...');
                    await fs.remove(filePath);
                }
                else {
                    const buffer = await fs.readFile(filePath);
                    if (buffer[0] !== 0x50 || buffer[1] !== 0x4B) {
                        this.logger.warning('Invalid ZIP header in SkinRestorer, removing...');
                        await fs.remove(filePath);
                    }
                    else {
                        this.logger.info('SkinRestorer is valid, keeping it');
                    }
                }
            }
            catch (error) {
                this.logger.warning('Error checking SkinRestorer, removing...');
                await fs.remove(filePath);
            }
        }
    }
    async downloadSkinRestorer(pluginsDir) {
        const destPath = path.join(pluginsDir, 'SkinsRestorer.jar');
        if (await FileUtils_1.FileUtils.fileExists(destPath)) {
            this.logger.info('SkinRestorer already exists, skipping download');
            return;
        }
        this.logger.info('Downloading SkinRestorer...');
        try {
            const response = await (0, axios_1.default)({
                method: 'GET',
                url: this.SKINRESTORER_URL,
                responseType: 'stream',
                timeout: 60000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            const writer = fs.createWriteStream(destPath);
            response.data.pipe(writer);
            await new Promise((resolve, reject) => {
                writer.on('finish', () => resolve());
                writer.on('error', (err) => reject(err));
            });
            const stats = await fs.stat(destPath);
            if (stats.size < 100000) {
                throw new Error(`Downloaded file too small: ${stats.size} bytes`);
            }
            const buffer = await fs.readFile(destPath);
            if (buffer[0] !== 0x50 || buffer[1] !== 0x4B) {
                throw new Error('Invalid ZIP header');
            }
            this.logger.success(`Downloaded SkinRestorer (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        }
        catch (error) {
            this.logger.error('Failed to download SkinRestorer:', error);
            throw error;
        }
    }
    async verifyPlugin(pluginsDir) {
        const filePath = path.join(pluginsDir, 'SkinsRestorer.jar');
        if (!await FileUtils_1.FileUtils.fileExists(filePath)) {
            throw new Error('SkinRestorer plugin is missing');
        }
        try {
            const stats = await fs.stat(filePath);
            if (stats.size < 100000) {
                throw new Error('SkinRestorer plugin is too small');
            }
            const buffer = await fs.readFile(filePath);
            if (buffer[0] !== 0x50 || buffer[1] !== 0x4B) {
                throw new Error('SkinRestorer plugin has invalid ZIP header');
            }
            this.logger.debug(`SkinRestorer verified OK (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        }
        catch (error) {
            this.logger.error('Failed to verify SkinRestorer:', error);
            throw error;
        }
    }
}
exports.SkinRestorerManager = SkinRestorerManager;
//# sourceMappingURL=SkinRestorer.js.map