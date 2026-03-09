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
exports.ProtocolSupportManager = void 0;
const FileUtils_1 = require("../utils/FileUtils");
const Logger_1 = require("../utils/Logger");
const path = __importStar(require("path"));
const axios_1 = __importDefault(require("axios"));
class ProtocolSupportManager {
    logger = Logger_1.Logger.getInstance();
    async setup(config) {
        const pluginsDir = config.folders.plugins;
        await FileUtils_1.FileUtils.ensureDir(pluginsDir);
        this.logger.info('Setting up ProtocolSupport...');
        await this.downloadProtocolSupport(pluginsDir);
        this.logger.success('ProtocolSupport installed successfully');
    }
    async downloadProtocolSupport(pluginsDir) {
        const psJar = path.join(pluginsDir, 'ProtocolSupport.jar');
        if (await FileUtils_1.FileUtils.fileExists(psJar)) {
            this.logger.info('ProtocolSupport already exists, skipping download');
            return;
        }
        this.logger.info('Downloading ProtocolSupport...');
        try {
            const response = await (0, axios_1.default)({
                method: 'GET',
                url: 'https://github.com/ProtocolSupport/ProtocolSupport/releases/latest/download/ProtocolSupport.jar',
                responseType: 'stream'
            });
            const writer = require('fs').createWriteStream(psJar);
            response.data.pipe(writer);
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
            this.logger.success('ProtocolSupport downloaded');
        }
        catch (error) {
            this.logger.error('Failed to download ProtocolSupport', error);
            throw error;
        }
    }
}
exports.ProtocolSupportManager = ProtocolSupportManager;
//# sourceMappingURL=ProtocolSupport.js.map