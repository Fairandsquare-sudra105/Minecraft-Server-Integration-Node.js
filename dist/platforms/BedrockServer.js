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
exports.BedrockServer = void 0;
const child_process_1 = require("child_process");
const events_1 = require("events");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const axios_1 = __importDefault(require("axios"));
const tar = __importStar(require("tar"));
const pidusage_1 = __importDefault(require("pidusage"));
const AdmZip = require('adm-zip');
const Logger_1 = require("../utils/Logger");
const FileUtils_1 = require("../utils/FileUtils");
const PropertiesParser_1 = require("../utils/PropertiesParser");
class BedrockServer extends events_1.EventEmitter {
    config;
    logger;
    process = null;
    serverInfo;
    players = new Map();
    startTime = null;
    serverDir;
    serverExecutable = '';
    constructor(config, serverDir) {
        super();
        this.config = config;
        this.serverDir = serverDir;
        this.logger = Logger_1.Logger.getInstance();
        this.serverInfo = {
            pid: 0,
            ip: this.config.network.ip,
            port: this.config.network.bedrockPort || 19132,
            version: this.config.version,
            type: 'bedrock',
            platform: 'bedrock',
            players: 0,
            maxPlayers: this.config.world.maxPlayers,
            uptime: 0,
            memory: { used: 0, max: 0 },
            cpu: 0,
            status: 'stopped'
        };
    }
    async download() {
        this.logger.info('Downloading Bedrock server...');
        const platform = this.getPlatform();
        const downloadUrl = this.getDownloadUrl(platform);
        const fileName = `bedrock-server-${this.config.version}.zip`;
        const downloadPath = path.join(this.serverDir, fileName);
        const writer = fs.createWriteStream(downloadPath);
        const response = await (0, axios_1.default)({
            method: 'GET',
            url: downloadUrl,
            responseType: 'stream'
        });
        const totalLength = response.headers['content-length'];
        let downloadedLength = 0;
        response.data.on('data', (chunk) => {
            downloadedLength += chunk.length;
            if (totalLength) {
                const progress = (downloadedLength / parseInt(totalLength) * 100).toFixed(2);
                process.stdout.write(`\rDownloading: ${progress}%`);
            }
        });
        response.data.pipe(writer);
        return new Promise((resolve, reject) => {
            writer.on('finish', async () => {
                process.stdout.write('\n');
                this.logger.success('Download complete');
                await this.extract(downloadPath);
                resolve(downloadPath);
            });
            writer.on('error', reject);
        });
    }
    getPlatform() {
        const arch = os.arch();
        const platform = os.platform();
        if (platform === 'linux') {
            if (arch === 'x64')
                return 'linux-x86_64';
            if (arch === 'arm64')
                return 'linux-arm64';
            if (arch === 'arm')
                return 'linux-arm32';
        }
        else if (platform === 'win32') {
            return 'windows-x86_64';
        }
        throw new Error(`Unsupported platform: ${platform} ${arch}`);
    }
    getDownloadUrl(platform) {
        const version = this.config.version;
        const baseUrl = 'https://www.minecraft.net/bedrockdedicatedserver/bin-linux';
        const urls = {
            'linux-x86_64': `${baseUrl}/bedrock-server-${version}.zip`,
            'linux-arm64': `${baseUrl}-arm64/bedrock-server-${version}.zip`,
            'linux-arm32': `${baseUrl}-arm32/bedrock-server-${version}.zip`,
            'windows-x86_64': `https://www.minecraft.net/bedrockdedicatedserver/bin-win64/bedrock-server-${version}.zip`
        };
        return urls[platform];
    }
    async extract(zipPath) {
        this.logger.info('Extracting Bedrock server...');
        if (zipPath.endsWith('.zip')) {
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(this.serverDir, true);
        }
        else if (zipPath.endsWith('.tar.gz')) {
            await tar.extract({
                file: zipPath,
                cwd: this.serverDir
            });
        }
        await fs.remove(zipPath);
        this.logger.success('Extraction complete');
        this.findExecutable();
    }
    findExecutable() {
        const possibleNames = ['bedrock_server', 'bedrock_server.exe', 'bedrock_server-arm64', 'bedrock_server-arm32'];
        for (const name of possibleNames) {
            const exePath = path.join(this.serverDir, name);
            if (fs.existsSync(exePath)) {
                this.serverExecutable = exePath;
                fs.chmodSync(exePath, 0o755);
                this.logger.debug(`Found executable: ${name}`);
                break;
            }
        }
        if (!this.serverExecutable) {
            throw new Error('Could not find Bedrock server executable');
        }
    }
    async prepare() {
        this.logger.info('Preparing Bedrock server...');
        const properties = PropertiesParser_1.PropertiesParser.generateBedrockProperties(this.config);
        const serverPropsPath = path.join(this.serverDir, 'server.properties');
        await FileUtils_1.FileUtils.writeProperties(serverPropsPath, properties);
        const permissionsPath = path.join(this.serverDir, 'permissions.json');
        if (!await FileUtils_1.FileUtils.fileExists(permissionsPath)) {
            await FileUtils_1.FileUtils.writeFile(permissionsPath, JSON.stringify([], null, 2));
        }
        const whitelistPath = path.join(this.serverDir, 'whitelist.json');
        if (!await FileUtils_1.FileUtils.fileExists(whitelistPath)) {
            await FileUtils_1.FileUtils.writeFile(whitelistPath, JSON.stringify([], null, 2));
        }
        this.logger.success('Bedrock server prepared');
    }
    async start() {
        if (!this.serverExecutable) {
            this.findExecutable();
        }
        this.logger.info(`Launching Bedrock server: ${this.serverExecutable}`);
        this.process = (0, child_process_1.spawn)(this.serverExecutable, [], {
            cwd: this.serverDir,
            stdio: 'pipe'
        });
        this.serverInfo.pid = this.process.pid;
        this.serverInfo.status = 'starting';
        this.startTime = new Date();
        this.setupEventHandlers();
        this.monitorResources();
        return this.serverInfo;
    }
    setupEventHandlers() {
        this.process.stdout.on('data', (data) => {
            const output = data.toString();
            process.stdout.write(`[Bedrock] ${output}`);
            if (output.includes('Server started')) {
                this.serverInfo.status = 'running';
                this.logger.success('Bedrock server started successfully!');
                this.emit('ready', this.serverInfo);
            }
            if (output.includes('Player connected:')) {
                const match = output.match(/Player connected: (\w+)/);
                if (match) {
                    this.handlePlayerJoin(match[1]);
                }
            }
            if (output.includes('Player disconnected:')) {
                const match = output.match(/Player disconnected: (\w+)/);
                if (match) {
                    this.handlePlayerLeave(match[1]);
                }
            }
        });
        this.process.stderr.on('data', (data) => {
            process.stderr.write(`[Bedrock Error] ${data.toString()}`);
        });
        this.process.on('exit', (code) => {
            this.serverInfo.status = 'stopped';
            this.logger.warning(`Bedrock server stopped with code ${code}`);
            this.emit('stop', { code });
        });
    }
    handlePlayerJoin(name) {
        const player = {
            name,
            uuid: '',
            ip: '',
            ping: 0,
            connectedAt: new Date()
        };
        this.players.set(name, player);
        this.serverInfo.players = this.players.size;
        this.emit('player-join', player);
    }
    handlePlayerLeave(name) {
        this.players.delete(name);
        this.serverInfo.players = this.players.size;
        this.emit('player-leave', name);
    }
    monitorResources() {
        setInterval(async () => {
            if (this.serverInfo.status === 'running' && this.process) {
                try {
                    const stats = await (0, pidusage_1.default)(this.process.pid);
                    this.serverInfo.memory = {
                        used: Math.round(stats.memory / 1024 / 1024),
                        max: 0
                    };
                    this.serverInfo.cpu = Math.round(stats.cpu);
                    this.serverInfo.uptime = Math.floor((Date.now() - (this.startTime?.getTime() || 0)) / 1000);
                    this.emit('resource', this.serverInfo);
                }
                catch { }
            }
        }, 5000);
    }
    sendCommand(command) {
        if (!this.process || this.serverInfo.status !== 'running') {
            throw new Error('Server not running');
        }
        this.process.stdin.write(command + '\n');
        this.logger.debug(`Command sent: ${command}`);
    }
    stop() {
        return new Promise((resolve) => {
            if (!this.process) {
                resolve();
                return;
            }
            this.logger.info('Stopping Bedrock server...');
            this.serverInfo.status = 'stopping';
            this.sendCommand('stop');
            setTimeout(() => {
                if (this.process) {
                    this.process.kill();
                    this.process = null;
                }
                resolve();
            }, 5000);
        });
    }
    getInfo() {
        return this.serverInfo;
    }
    getPlayers() {
        return Array.from(this.players.values());
    }
    isRunning() {
        return this.serverInfo.status === 'running';
    }
}
exports.BedrockServer = BedrockServer;
//# sourceMappingURL=BedrockServer.js.map