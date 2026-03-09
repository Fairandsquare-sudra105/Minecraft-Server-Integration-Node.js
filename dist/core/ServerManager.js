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
exports.ServerManager = void 0;
const events_1 = require("events");
const MinecraftServer_1 = require("./MinecraftServer");
const Logger_1 = require("../utils/Logger");
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
class ServerManager extends events_1.EventEmitter {
    servers = new Map();
    logger;
    constructor() {
        super();
        this.logger = Logger_1.Logger.getInstance();
    }
    createServer(name, config) {
        if (this.servers.has(name)) {
            throw new Error(`Server with name ${name} already exists`);
        }
        const server = new MinecraftServer_1.MinecraftServer(config);
        this.servers.set(name, server);
        server.on('ready', (info) => {
            this.emit('server-ready', { name, info });
        });
        server.on('stop', (data) => {
            this.emit('server-stopped', { name, data });
        });
        server.on('player-join', (player) => {
            this.emit('player-joined', { name, player });
        });
        server.on('player-leave', (playerName) => {
            this.emit('player-left', { name, playerName });
        });
        server.on('resource', (info) => {
            this.emit('resource-update', { name, info });
        });
        this.logger.success(`Server created: ${name}`);
        return server;
    }
    getServer(name) {
        return this.servers.get(name);
    }
    async startServer(name) {
        const server = this.servers.get(name);
        if (!server) {
            throw new Error(`Server not found: ${name}`);
        }
        this.logger.info(`Starting server: ${name}`);
        return server.start();
    }
    async stopServer(name) {
        const server = this.servers.get(name);
        if (!server) {
            throw new Error(`Server not found: ${name}`);
        }
        this.logger.info(`Stopping server: ${name}`);
        await server.stop();
    }
    async stopAll() {
        const promises = Array.from(this.servers.entries()).map(async ([name, server]) => {
            this.logger.info(`Stopping server: ${name}`);
            await server.stop();
        });
        await Promise.all(promises);
        this.logger.success('All servers stopped');
    }
    removeServer(name) {
        const server = this.servers.get(name);
        if (server) {
            if (server['serverInfo'].status === 'running') {
                throw new Error(`Cannot remove running server: ${name}`);
            }
            this.servers.delete(name);
            this.logger.info(`Server removed: ${name}`);
            return true;
        }
        return false;
    }
    listServers() {
        return Array.from(this.servers.entries()).map(([name, server]) => ({
            name,
            info: server['serverInfo']
        }));
    }
    getServerCount() {
        return this.servers.size;
    }
    getRunningServers() {
        return Array.from(this.servers.entries())
            .filter(([_, server]) => server['serverInfo'].status === 'running')
            .map(([name, server]) => ({ name, info: server['serverInfo'] }));
    }
    async broadcastCommand(command) {
        const promises = Array.from(this.servers.entries()).map(async ([name, server]) => {
            try {
                if (server['serverInfo'].status === 'running') {
                    server.sendCommand(command);
                    this.logger.debug(`Command sent to ${name}: ${command}`);
                }
            }
            catch (error) {
                this.logger.error(`Failed to send command to ${name}:`, error);
            }
        });
        await Promise.all(promises);
    }
    async saveAll() {
        await this.broadcastCommand('save-all');
        this.logger.info('Save-all command sent to all servers');
    }
    async backupAll(type = 'world') {
        const results = new Map();
        const promises = Array.from(this.servers.entries()).map(async ([name, server]) => {
            try {
                const backupPath = await server.backup(type);
                results.set(name, backupPath);
                this.logger.success(`Backup created for ${name}: ${backupPath}`);
            }
            catch (error) {
                this.logger.error(`Failed to backup ${name}:`, error);
            }
        });
        await Promise.all(promises);
        return results;
    }
    async importServersFromDirectory(dir) {
        if (!await fs.pathExists(dir)) {
            throw new Error(`Directory not found: ${dir}`);
        }
        const files = await fs.readdir(dir);
        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const configPath = path.join(dir, file);
                    const configData = await fs.readFile(configPath, 'utf8');
                    const config = JSON.parse(configData);
                    const serverName = path.basename(file, '.json');
                    this.createServer(serverName, config);
                    this.logger.info(`Imported server: ${serverName}`);
                }
                catch (error) {
                    this.logger.error(`Failed to import ${file}:`, error);
                }
            }
        }
    }
    async exportServersToDirectory(dir) {
        await fs.ensureDir(dir);
        for (const [name, server] of this.servers) {
            try {
                const config = server['config'];
                const configPath = path.join(dir, `${name}.json`);
                await fs.writeFile(configPath, JSON.stringify(config, null, 2));
                this.logger.info(`Exported server: ${name}`);
            }
            catch (error) {
                this.logger.error(`Failed to export ${name}:`, error);
            }
        }
    }
    getStatus() {
        return {
            totalServers: this.getServerCount(),
            runningServers: this.getRunningServers().length,
            servers: this.listServers()
        };
    }
}
exports.ServerManager = ServerManager;
//# sourceMappingURL=ServerManager.js.map