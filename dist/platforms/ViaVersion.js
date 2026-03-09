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
exports.ViaVersionManager = void 0;
const FileUtils_1 = require("../utils/FileUtils");
const Logger_1 = require("../utils/Logger");
const path = __importStar(require("path"));
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs-extra"));
class ViaVersionManager {
    logger = Logger_1.Logger.getInstance();
    VIAVERSION_URL = 'https://github.com/ViaVersion/ViaVersion/releases/download/5.7.2/ViaVersion-5.7.2.jar';
    VIABACKWARDS_URL = 'https://github.com/ViaVersion/ViaBackwards/releases/download/5.7.2/ViaBackwards-5.7.2.jar';
    VIAREWIND_URL = 'https://github.com/ViaVersion/ViaRewind/releases/download/4.0.15/ViaRewind-4.0.15.jar';
    async setup(config) {
        const pluginsDir = config.folders.plugins;
        await FileUtils_1.FileUtils.ensureDir(pluginsDir);
        this.logger.info('Setting up ViaVersion, ViaBackwards, ViaRewind...');
        await this.cleanupCorruptFiles(pluginsDir);
        await this.downloadViaVersion(pluginsDir);
        await this.downloadViaBackwards(pluginsDir);
        await this.downloadViaRewind(pluginsDir);
        await this.verifyAllPlugins(pluginsDir);
        this.logger.success('ViaVersion suite installed successfully');
        this.logger.info('Players from older versions can now connect to your server');
    }
    async cleanupCorruptFiles(pluginsDir) {
        const files = [
            { name: 'ViaVersion.jar', url: this.VIAVERSION_URL },
            { name: 'ViaBackwards.jar', url: this.VIABACKWARDS_URL },
            { name: 'ViaRewind.jar', url: this.VIAREWIND_URL }
        ];
        for (const file of files) {
            const filePath = path.join(pluginsDir, file.name);
            if (await FileUtils_1.FileUtils.fileExists(filePath)) {
                try {
                    const stats = await fs.stat(filePath);
                    if (stats.size < 100000) {
                        this.logger.warning(`Corrupt ${file.name} detected (${stats.size} bytes), removing...`);
                        await fs.remove(filePath);
                    }
                    else {
                        const buffer = await fs.readFile(filePath);
                        if (buffer[0] !== 0x50 || buffer[1] !== 0x4B) {
                            this.logger.warning(`Invalid ZIP header in ${file.name}, removing...`);
                            await fs.remove(filePath);
                        }
                        else {
                            this.logger.info(`${file.name} is valid, keeping it`);
                        }
                    }
                }
                catch (error) {
                    this.logger.warning(`Error checking ${file.name}, removing...`);
                    await fs.remove(filePath);
                }
            }
        }
    }
    async downloadFile(url, destPath, fileName) {
        this.logger.info(`Downloading ${fileName}...`);
        try {
            const response = await (0, axios_1.default)({
                method: 'GET',
                url: url,
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
            this.logger.success(`Downloaded: ${fileName} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        }
        catch (error) {
            this.logger.error(`Failed to download ${fileName}:`, error);
            throw error;
        }
    }
    async downloadViaVersion(pluginsDir) {
        const destPath = path.join(pluginsDir, 'ViaVersion.jar');
        if (await FileUtils_1.FileUtils.fileExists(destPath)) {
            await fs.remove(destPath);
        }
        await this.downloadFile(this.VIAVERSION_URL, destPath, 'ViaVersion.jar');
    }
    async downloadViaBackwards(pluginsDir) {
        const destPath = path.join(pluginsDir, 'ViaBackwards.jar');
        if (await FileUtils_1.FileUtils.fileExists(destPath)) {
            await fs.remove(destPath);
        }
        await this.downloadFile(this.VIABACKWARDS_URL, destPath, 'ViaBackwards.jar');
    }
    async downloadViaRewind(pluginsDir) {
        const destPath = path.join(pluginsDir, 'ViaRewind.jar');
        if (await FileUtils_1.FileUtils.fileExists(destPath)) {
            await fs.remove(destPath);
        }
        await this.downloadFile(this.VIAREWIND_URL, destPath, 'ViaRewind.jar');
    }
    async verifyAllPlugins(pluginsDir) {
        const files = ['ViaVersion.jar', 'ViaBackwards.jar', 'ViaRewind.jar'];
        let allValid = true;
        for (const file of files) {
            const filePath = path.join(pluginsDir, file);
            if (!await FileUtils_1.FileUtils.fileExists(filePath)) {
                this.logger.error(`${file} is missing!`);
                allValid = false;
                continue;
            }
            try {
                const stats = await fs.stat(filePath);
                if (stats.size < 100000) {
                    this.logger.error(`${file} is too small: ${stats.size} bytes`);
                    allValid = false;
                    continue;
                }
                const buffer = await fs.readFile(filePath);
                if (buffer[0] !== 0x50 || buffer[1] !== 0x4B) {
                    this.logger.error(`${file} has invalid ZIP header`);
                    allValid = false;
                    continue;
                }
                this.logger.debug(`${file} verified OK (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
            }
            catch (error) {
                this.logger.error(`Failed to verify ${file}:`, error);
                allValid = false;
            }
        }
        if (!allValid) {
            throw new Error('Some ViaVersion plugins are corrupt or missing');
        }
    }
    async configureViaVersion(config) {
        const pluginsDir = config.folders.plugins;
        const viaConfigDir = path.join(pluginsDir, 'ViaVersion');
        await FileUtils_1.FileUtils.ensureDir(viaConfigDir);
        const configFile = path.join(viaConfigDir, 'config.yml');
        const configContent = `# ViaVersion Configuration
# Auto-generated by mc-headless

enable-client-side-block-updates: true
prevent-collision: true
auto-team: true
suppress-metadata-errors: false
enable-legacy-server-ping: true
block-connection-method: true
nms-player-ticking: true
debug: false
max-pps: 800
max-pp-interval: 4
fix-self-rendering: true
fix-low-level-collision: true
shield-blocking: true
fix-infested-block-breaking: true
ignore-long-1_16-channel: true
force-json-transform: false
use-natives: true
`;
        await FileUtils_1.FileUtils.writeFile(configFile, configContent);
        this.logger.debug('ViaVersion configuration created');
    }
}
exports.ViaVersionManager = ViaVersionManager;
//# sourceMappingURL=ViaVersion.js.map