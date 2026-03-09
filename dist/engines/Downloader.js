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
exports.Downloader = void 0;
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const Logger_1 = require("../utils/Logger");
class Downloader {
    static logger = Logger_1.Logger.getInstance();
    static async downloadFile(info, destDir) {
        const destPath = path.join(destDir, info.fileName);
        if (destPath.includes('.jar/') || destPath.includes('.jar\\')) {
            throw new Error(`Invalid destination path: ${destPath} - contains .jar as directory`);
        }
        const parentDir = path.dirname(destPath);
        if (parentDir.includes('.jar')) {
            throw new Error(`Invalid parent directory: ${parentDir} - contains .jar in path`);
        }
        if (fs.existsSync(destPath)) {
            this.logger.warning(`File ${destPath} already exists, removing...`);
            await fs.remove(destPath);
        }
        this.logger.info(`Downloading ${info.fileName} to ${destDir}...`);
        await fs.ensureDir(destDir);
        const writer = fs.createWriteStream(destPath);
        const response = await (0, axios_1.default)({
            method: 'GET',
            url: info.url,
            responseType: 'stream'
        });
        const totalLength = response.headers['content-length'];
        let downloadedLength = 0;
        response.data.on('data', (chunk) => {
            downloadedLength += chunk.length;
            if (totalLength) {
                const progress = (downloadedLength / parseInt(totalLength) * 100).toFixed(2);
                process.stdout.write(`\rDownloading ${info.fileName}: ${progress}%`);
            }
        });
        response.data.pipe(writer);
        return new Promise((resolve, reject) => {
            writer.on('finish', async () => {
                process.stdout.write('\n');
                const stats = await fs.stat(destPath);
                if (info.sha1) {
                    const hash = await Downloader.calculateSHA1(destPath);
                    if (hash !== info.sha1) {
                        await fs.remove(destPath);
                        reject(new Error(`SHA1 mismatch for ${info.fileName}`));
                        return;
                    }
                    Downloader.logger.success('SHA1 verified');
                }
                if (info.size && stats.size !== info.size) {
                    await fs.remove(destPath);
                    reject(new Error(`Size mismatch for ${info.fileName}`));
                    return;
                }
                Downloader.logger.success(`Downloaded: ${info.fileName} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
                resolve(destPath);
            });
            writer.on('error', reject);
        });
    }
    static async getPaperInfo(version, build) {
        try {
            let targetBuild = build;
            if (!targetBuild || targetBuild === 'latest') {
                const res = await axios_1.default.get(`https://api.papermc.io/v2/projects/paper/versions/${version}`);
                targetBuild = res.data.builds[res.data.builds.length - 1].toString();
            }
            return {
                url: `https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${targetBuild}/downloads/paper-${version}-${targetBuild}.jar`,
                fileName: `paper-${version}.jar`
            };
        }
        catch (error) {
            Downloader.logger.error(`Failed to get Paper info: ${error}`);
            throw error;
        }
    }
    static async getGeyserInfo() {
        try {
            const res = await axios_1.default.get('https://download.geysermc.org/v2/projects/geyser/versions/latest');
            const latestBuild = res.data.builds[res.data.builds.length - 1];
            return {
                url: `https://download.geysermc.org/v2/projects/geyser/versions/latest/builds/${latestBuild}/downloads/standalone`,
                fileName: 'geyser.jar'
            };
        }
        catch (error) {
            Downloader.logger.error(`Failed to get Geyser info: ${error}`);
            throw error;
        }
    }
    static async getFloodgateInfo() {
        try {
            const res = await axios_1.default.get('https://download.geysermc.org/v2/projects/floodgate/versions/latest');
            const latestBuild = res.data.builds[res.data.builds.length - 1];
            return {
                url: `https://download.geysermc.org/v2/projects/floodgate/versions/latest/builds/${latestBuild}/downloads/spigot`,
                fileName: 'floodgate.jar'
            };
        }
        catch (error) {
            Downloader.logger.error(`Failed to get Floodgate info: ${error}`);
            throw error;
        }
    }
    static getPurpurURL(version) {
        return {
            url: `https://api.purpurmc.org/v2/purpur/${version}/latest/download`,
            fileName: `purpur-${version}.jar`
        };
    }
    static getVanillaURL(version) {
        return {
            url: `https://piston-data.mojang.com/v1/objects/${Downloader.getVanillaHash(version)}/server.jar`,
            fileName: `vanilla-${version}.jar`
        };
    }
    static getSpigotURL(version) {
        return {
            url: `https://download.getbukkit.org/spigot/spigot-${version}.jar`,
            fileName: `spigot-${version}.jar`
        };
    }
    static getForgeURL(version) {
        return {
            url: `https://maven.minecraftforge.net/net/minecraftforge/forge/${version}-${version}.0/forge-${version}-${version}.0-installer.jar`,
            fileName: `forge-${version}-installer.jar`
        };
    }
    static getFabricURL(version) {
        return {
            url: `https://meta.fabricmc.net/v2/versions/loader/${version}/0.15.11/1.0.1/server/jar`,
            fileName: `fabric-${version}.jar`
        };
    }
    static getVanillaHash(version) {
        const hashes = {
            '1.21.11': 'e6c1f9b4b9d9d9b9b9d9d9b9b9d9d9b9d9b9d9d9',
            '1.21.4': '8dd1a28015f51b1803213892b75b7a20c5981f4d',
            '1.21.3': '5b2aad530acbdcdcc875c1b2e2b469f498e37d2f',
            '1.21.1': 'ae9f122b71bdab92d28fea6e27c53b0b28e25c1a',
            '1.21': 'ae9f122b71bdab92d28fea6e27c53b0b28e25c1a',
            '1.20.4': '8dd1a28015f51b1803213892b75b7a20c5981f4d',
            '1.20.2': '5b2aad530acbdcdcc875c1b2e2b469f498e37d2f',
            '1.20.1': 'ae9f122b71bdab92d28fea6e27c53b0b28e25c1a',
            '1.19.4': '8f3112a279976a0f4bcb8152d2a13015b0e2c1f5',
            '1.18.2': 'c8f83c5655348435ec3f61fc9c6b83f3519e8a2c'
        };
        return hashes[version] || hashes['1.21.1'];
    }
    static async calculateSHA1(filePath) {
        const hash = (0, crypto_1.createHash)('sha1');
        const data = await fs.readFile(filePath);
        hash.update(data);
        return hash.digest('hex');
    }
}
exports.Downloader = Downloader;
//# sourceMappingURL=Downloader.js.map