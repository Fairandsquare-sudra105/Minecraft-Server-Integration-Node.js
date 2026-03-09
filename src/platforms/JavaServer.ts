import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import pidusage from 'pidusage';
import { MinecraftConfig, ServerInfo, Player } from '../types';
import { Logger } from '../utils/Logger';
import { FileUtils } from '../utils/FileUtils';
import { PropertiesParser } from '../utils/PropertiesParser';
import { PaperEngine } from '../engines/PaperEngine';
import { VanillaEngine } from '../engines/VanillaEngine';
import { ForgeEngine } from '../engines/ForgeEngine';
import { FabricEngine } from '../engines/FabricEngine';
import { ServerEngine } from '../engines/ServerEngine';
import * as path from 'path';

export class JavaServer extends EventEmitter {
    private config: MinecraftConfig;
    private logger: Logger;
    private engine: ServerEngine;
    private process: any = null;
    private serverInfo: ServerInfo;
    private players: Map<string, Player> = new Map();
    private startTime: Date | null = null;
    private serverDir: string;

    constructor(config: MinecraftConfig, serverDir: string) {
        super();
        this.config = config;
        this.serverDir = serverDir;
        this.logger = Logger.getInstance();

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

    private createEngine(): ServerEngine {
        switch (this.config.type) {
            case 'paper':
            case 'purpur':
            case 'spigot':
                return new PaperEngine();
            case 'vanilla':
                return new VanillaEngine();
            case 'forge':
                return new ForgeEngine();
            case 'fabric':
                return new FabricEngine();
            default:
                throw new Error(`Unsupported server type: ${this.config.type}`);
        }
    }

    public async prepare(): Promise<void> {
        this.logger.info(`Preparing Java server: ${this.config.type} v${this.config.version}`);

        if (this.config.autoAcceptEula) {
            await FileUtils.writeFile(
                path.join(this.serverDir, 'eula.txt'),
                'eula=true'
            );
        }

        const properties = PropertiesParser.generateServerProperties(this.config);
        await FileUtils.writeProperties(
            path.join(this.serverDir, 'server.properties'),
            properties
        );

        this.logger.success('Java server prepared');
    }

    public async start(jarPath: string): Promise<ServerInfo> {
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

        this.process = spawn('java', fullArgs, {
            cwd: this.serverDir,
            stdio: 'pipe'
        });

        this.serverInfo.pid = this.process.pid!;
        this.serverInfo.status = 'starting';
        this.startTime = new Date();

        this.setupEventHandlers();

        this.monitorResources();

        return this.serverInfo;
    }

    private setupEventHandlers(): void {
        this.process.stdout.on('data', (data: Buffer) => {
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

        this.process.stderr.on('data', (data: Buffer) => {
            process.stderr.write(`[Java Error] ${data.toString()}`);
        });

        this.process.on('exit', (code: number) => {
            this.serverInfo.status = 'stopped';
            this.logger.warning(`Java server stopped with code ${code}`);
            this.emit('stop', { code });
        });
    }

    private handlePlayerJoin(name: string): void {
        const player: Player = {
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

    private handlePlayerLeave(name: string): void {
        this.players.delete(name);
        this.serverInfo.players = this.players.size;
        this.emit('player-leave', name);
    }

    private monitorResources(): void {
        setInterval(async () => {
            if (this.serverInfo.status === 'running' && this.process) {
                try {
                    const stats = await pidusage(this.process.pid);
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
                } catch {}
            }
        }, 5000);
    }

    public sendCommand(command: string): void {
        if (!this.process || this.serverInfo.status !== 'running') {
            throw new Error('Server not running');
        }

        this.process.stdin.write(command + '\n');
        this.logger.debug(`Command sent: ${command}`);
    }

    public stop(): Promise<void> {
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

    public getInfo(): ServerInfo {
        return this.serverInfo;
    }

    public getPlayers(): Player[] {
        return Array.from(this.players.values());
    }

    private parseMemory(memStr: string): number {
        const value = parseInt(memStr);
        if (memStr.endsWith('G')) {
            return value * 1024;
        }
        return value;
    }

    public isRunning(): boolean {
        return this.serverInfo.status === 'running';
    }
}