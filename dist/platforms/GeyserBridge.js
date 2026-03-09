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
exports.GeyserBridge = void 0;
const Downloader_1 = require("../engines/Downloader");
const FileUtils_1 = require("../utils/FileUtils");
const Logger_1 = require("../utils/Logger");
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
class GeyserBridge {
    logger = Logger_1.Logger.getInstance();
    process = null;
    async setup(config) {
        const pluginsDir = config.folders.plugins;
        await FileUtils_1.FileUtils.ensureDir(pluginsDir);
        const geyserJar = path.join(pluginsDir, 'geyser.jar');
        const floodgateJar = path.join(pluginsDir, 'floodgate.jar');
        if (!await FileUtils_1.FileUtils.fileExists(geyserJar)) {
            this.logger.info('Downloading Geyser...');
            const geyserInfo = await Downloader_1.Downloader.getGeyserInfo();
            geyserInfo.fileName = 'geyser.jar';
            const downloadedPath = await Downloader_1.Downloader.downloadFile(geyserInfo, pluginsDir);
            if (downloadedPath && downloadedPath !== geyserJar) {
                if (await FileUtils_1.FileUtils.fileExists(downloadedPath)) {
                    await FileUtils_1.FileUtils.moveFile(downloadedPath, geyserJar);
                }
            }
            this.logger.success('Geyser downloaded to plugins folder');
        }
        if (!await FileUtils_1.FileUtils.fileExists(floodgateJar)) {
            this.logger.info('Downloading Floodgate...');
            const floodgateInfo = await Downloader_1.Downloader.getFloodgateInfo();
            floodgateInfo.fileName = 'floodgate.jar';
            const downloadedPath = await Downloader_1.Downloader.downloadFile(floodgateInfo, pluginsDir);
            if (downloadedPath && downloadedPath !== floodgateJar) {
                if (await FileUtils_1.FileUtils.fileExists(downloadedPath)) {
                    await FileUtils_1.FileUtils.moveFile(downloadedPath, floodgateJar);
                }
            }
            this.logger.success('Floodgate downloaded to plugins folder');
        }
        this.logger.success('Geyser & Floodgate installed');
    }
    async startStandalone(config, serverDir) {
        const geyserDir = path.join(serverDir, 'geyser-standalone');
        await FileUtils_1.FileUtils.ensureDir(geyserDir);
        const geyserJar = path.join(geyserDir, 'geyser.jar');
        if (!await FileUtils_1.FileUtils.fileExists(geyserJar)) {
            this.logger.info('Downloading Geyser standalone...');
            const geyserInfo = await Downloader_1.Downloader.getGeyserInfo();
            geyserInfo.fileName = 'geyser.jar';
            const downloadedPath = await Downloader_1.Downloader.downloadFile(geyserInfo, geyserDir);
            if (downloadedPath && downloadedPath !== geyserJar) {
                if (await FileUtils_1.FileUtils.fileExists(downloadedPath)) {
                    await FileUtils_1.FileUtils.moveFile(downloadedPath, geyserJar);
                }
            }
            this.logger.success('Geyser standalone downloaded');
        }
        const javaArgs = [
            `-Xms${config.memory.init}`,
            `-Xmx${config.memory.max}`,
            '-jar',
            geyserJar
        ];
        this.logger.info('Starting Geyser standalone...');
        this.process = (0, child_process_1.spawn)('java', javaArgs, {
            cwd: geyserDir,
            stdio: 'pipe'
        });
        this.process.stdout.on('data', (data) => {
            process.stdout.write(`[Geyser] ${data.toString()}`);
        });
        this.process.stderr.on('data', (data) => {
            process.stderr.write(`[Geyser Error] ${data.toString()}`);
        });
    }
    stop() {
        if (this.process) {
            this.process.kill();
            this.process = null;
            this.logger.info('Geyser stopped');
        }
    }
}
exports.GeyserBridge = GeyserBridge;
//# sourceMappingURL=GeyserBridge.js.map