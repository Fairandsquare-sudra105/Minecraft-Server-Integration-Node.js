import { EventEmitter } from 'events';
import { MinecraftServer } from './MinecraftServer';
import { MinecraftConfig, ServerInfo } from '../types';
import { Logger } from '../utils/Logger';
import * as path from 'path';
import * as fs from 'fs-extra';

export class ServerManager extends EventEmitter {
    private servers: Map<string, MinecraftServer> = new Map();
    private logger: Logger;

    constructor() {
        super();
        this.logger = Logger.getInstance();
    }

    public createServer(name: string, config: Partial<MinecraftConfig>): MinecraftServer {
        if (this.servers.has(name)) {
            throw new Error(`Server with name ${name} already exists`);
        }

        const server = new MinecraftServer(config);
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

    public getServer(name: string): MinecraftServer | undefined {
        return this.servers.get(name);
    }

    public async startServer(name: string): Promise<ServerInfo> {
        const server = this.servers.get(name);
        if (!server) {
            throw new Error(`Server not found: ${name}`);
        }

        this.logger.info(`Starting server: ${name}`);
        return server.start();
    }

    public async stopServer(name: string): Promise<void> {
        const server = this.servers.get(name);
        if (!server) {
            throw new Error(`Server not found: ${name}`);
        }

        this.logger.info(`Stopping server: ${name}`);
        await server.stop();
    }

    public async stopAll(): Promise<void> {
        const promises = Array.from(this.servers.entries()).map(async ([name, server]) => {
            this.logger.info(`Stopping server: ${name}`);
            await server.stop();
        });

        await Promise.all(promises);
        this.logger.success('All servers stopped');
    }

    public removeServer(name: string): boolean {
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

    public listServers(): Array<{ name: string; info: ServerInfo }> {
        return Array.from(this.servers.entries()).map(([name, server]) => ({
            name,
            info: server['serverInfo']
        }));
    }

    public getServerCount(): number {
        return this.servers.size;
    }

    public getRunningServers(): Array<{ name: string; info: ServerInfo }> {
        return Array.from(this.servers.entries())
            .filter(([_, server]) => server['serverInfo'].status === 'running')
            .map(([name, server]) => ({ name, info: server['serverInfo'] }));
    }

    public async broadcastCommand(command: string): Promise<void> {
        const promises = Array.from(this.servers.entries()).map(async ([name, server]) => {
            try {
                if (server['serverInfo'].status === 'running') {
                    server.sendCommand(command);
                    this.logger.debug(`Command sent to ${name}: ${command}`);
                }
            } catch (error) {
                this.logger.error(`Failed to send command to ${name}:`, error);
            }
        });

        await Promise.all(promises);
    }

    public async saveAll(): Promise<void> {
        await this.broadcastCommand('save-all');
        this.logger.info('Save-all command sent to all servers');
    }

    public async backupAll(type: 'full' | 'world' | 'plugins' = 'world'): Promise<Map<string, string>> {
        const results = new Map();

        const promises = Array.from(this.servers.entries()).map(async ([name, server]) => {
            try {
                const backupPath = await server.backup(type);
                results.set(name, backupPath);
                this.logger.success(`Backup created for ${name}: ${backupPath}`);
            } catch (error) {
                this.logger.error(`Failed to backup ${name}:`, error);
            }
        });

        await Promise.all(promises);
        return results;
    }

    public async importServersFromDirectory(dir: string): Promise<void> {
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
                } catch (error) {
                    this.logger.error(`Failed to import ${file}:`, error);
                }
            }
        }
    }

    public async exportServersToDirectory(dir: string): Promise<void> {
        await fs.ensureDir(dir);

        for (const [name, server] of this.servers) {
            try {
                const config = server['config'];
                const configPath = path.join(dir, `${name}.json`);
                await fs.writeFile(configPath, JSON.stringify(config, null, 2));
                this.logger.info(`Exported server: ${name}`);
            } catch (error) {
                this.logger.error(`Failed to export ${name}:`, error);
            }
        }
    }

    public getStatus(): any {
        return {
            totalServers: this.getServerCount(),
            runningServers: this.getRunningServers().length,
            servers: this.listServers()
        };
    }
}