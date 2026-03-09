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
exports.JavaServer = void 0;
const child_process_1 = require("child_process");
const events_1 = require("events");
const pidusage_1 = __importDefault(require("pidusage"));
const Logger_1 = require("../utils/Logger");
const FileUtils_1 = require("../utils/FileUtils");
const PropertiesParser_1 = require("../utils/PropertiesParser");
const PaperEngine_1 = require("../engines/PaperEngine");
const VanillaEngine_1 = require("../engines/VanillaEngine");
const ForgeEngine_1 = require("../engines/ForgeEngine");
const FabricEngine_1 = require("../engines/FabricEngine");
const path = __importStar(require("path"));
class JavaServer extends events_1.EventEmitter {
    config;
    logger;
    engine;
    process = null;
    serverInfo;
    players = new Map();
    startTime = null;
    serverDir;
    constructor(config, serverDir) {
        super();
        this.config = config;
        this.serverDir = serverDir;
        this.logger = Logger_1.Logger.getInstance();
        this.engine = this.createEngine();
        this.serverInfo = {
            pid: 0,
            ip: this.config.network.ip,
            port: this.config.network.port,
            version: this.config.version,
            type: this.config.type,
            platform: 'java',
            players: 0,
            maxPlayers: this.config.world.maxPlayers,
            uptime: 0,
            memory: { used: 0, max: 0 },
            cpu: 0,
            status: 'stopped'
        };
    }
    createEngine() {
        switch (this.config.type) {
            case 'paper':
            case 'purpur':
            case 'spigot':
                return new PaperEngine_1.PaperEngine();
            case 'vanilla':
                return new VanillaEngine_1.VanillaEngine();
            case 'forge':
                return new ForgeEngine_1.ForgeEngine();
            case 'fabric':
                return new FabricEngine_1.FabricEngine();
            default:
                throw new Error(`Unsupported server type: ${this.config.type}`);
        }
    }
    async prepare() {
        this.logger.info(`Preparing Java server: ${this.config.type} v${this.config.version}`);
        if (this.config.autoAcceptEula) {
            await FileUtils_1.FileUtils.writeFile(path.join(this.serverDir, 'eula.txt'), 'eula=true');
        }
        const properties = PropertiesParser_1.PropertiesParser.generateServerProperties(this.config);
        await FileUtils_1.FileUtils.writeProperties(path.join(this.serverDir, 'server.properties'), properties);
        this.logger.success('Java server prepared');
    }
    async start(jarPath) {
        const javaArgs = this.engine.getJavaArgs(this.config);
        const serverJar = this.engine.getServerJar(jarPath);
        const serverArgs = this.engine.getServerArgs();
        const fullArgs = [
            ...javaArgs,
            '-jar',
            serverJar,
            ...serverArgs
        ];
        this.logger.info(`Launching Java server: java ${fullArgs.join(' ')}`);
        this.process = (0, child_process_1.spawn)('java', fullArgs, {
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
            process.stdout.write(`[Java] ${output}`);
            if (output.includes('Done') || output.includes('For help, type "help"')) {
                this.serverInfo.status = 'running';
                this.logger.success('Java server started successfully!');
                this.emit('ready', this.serverInfo);
            }
            if (output.includes('joined the game')) {
                const match = output.match(/(\w+) joined the game/);
                if (match) {
                    this.handlePlayerJoin(match[1]);
                }
            }
            if (output.includes('left the game')) {
                const match = output.match(/(\w+) left the game/);
                if (match) {
                    this.handlePlayerLeave(match[1]);
                }
            }
        });
        this.process.stderr.on('data', (data) => {
            process.stderr.write(`[Java Error] ${data.toString()}`);
        });
        this.process.on('exit', (code) => {
            this.serverInfo.status = 'stopped';
            this.logger.warning(`Java server stopped with code ${code}`);
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
                        max: this.parseMemory(this.config.memory.max)
                    };
                    this.serverInfo.cpu = Math.round(stats.cpu);
                    this.serverInfo.uptime = Math.floor((Date.now() - (this.startTime?.getTime() || 0)) / 1000);
                    if (stats.cpu > 80) {
                        this.logger.warning(`High CPU usage: ${stats.cpu}%`);
                    }
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
            this.logger.info('Stopping Java server...');
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
    parseMemory(memStr) {
        const value = parseInt(memStr);
        if (memStr.endsWith('G')) {
            return value * 1024;
        }
        return value;
    }
    isRunning() {
        return this.serverInfo.status === 'running';
    }
}
exports.JavaServer = JavaServer;
//# sourceMappingURL=JavaServer.js.map