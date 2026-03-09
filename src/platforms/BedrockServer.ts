import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import axios from 'axios';
import * as tar from 'tar';
import pidusage from 'pidusage';
const AdmZip = require('adm-zip');
import { MinecraftConfig, ServerInfo, Player } from '../types';
import { Logger } from '../utils/Logger';
import { FileUtils } from '../utils/FileUtils';
import { PropertiesParser } from '../utils/PropertiesParser';

export class BedrockServer extends EventEmitter {
    private config: MinecraftConfig;
    private logger: Logger;
    private process: any = null;
    private serverInfo: ServerInfo;
    private players: Map<string, Player> = new Map();
    private startTime: Date | null = null;
    private serverDir: string;
    private serverExecutable: string = '';

    constructor(config: MinecraftConfig, serverDir: string) {
        super();
        this.config = config;
        this.serverDir = serverDir;
        this.logger = Logger.getInstance();

        this.serverInfo = {
            pid: 0,
            ip: this.config.network.ip,
            port: this.config.network.bedrockPort || 19132,
            version: this.config.version,
            type: 'bedrock' as any,
            platform: 'bedrock',
            players: 0,
            maxPlayers: this.config.world.maxPlayers,
            uptime: 0,
            memory: { used: 0, max: 0 },
            cpu: 0,
            status: 'stopped'
        };
    }

    public async download(): Promise<string> {
        this.logger.info('Downloading Bedrock server...');

        const platform = this.getPlatform();
        const downloadUrl = this.getDownloadUrl(platform);
        const fileName = `bedrock-server-${this.config.version}.zip`;
        const downloadPath = path.join(this.serverDir, fileName);

        const writer = fs.createWriteStream(downloadPath);
        const response = await axios({
            method: 'GET',
            url: downloadUrl,
            responseType: 'stream'
        });

        const totalLength = response.headers['content-length'];
        let downloadedLength = 0;

        response.data.on('data', (chunk: Buffer) => {
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

    private getPlatform(): string {
        const arch = os.arch();
        const platform = os.platform();

        if (platform === 'linux') {
            if (arch === 'x64') return 'linux-x86_64';
            if (arch === 'arm64') return 'linux-arm64';
            if (arch === 'arm') return 'linux-arm32';
        } else if (platform === 'win32') {
            return 'windows-x86_64';
        }

        throw new Error(`Unsupported platform: ${platform} ${arch}`);
    }

    private getDownloadUrl(platform: string): string {
        const version = this.config.version;
        const baseUrl = 'https://www.minecraft.net/bedrockdedicatedserver/bin-linux';
        
        const urls: Record<string, string> = {
            'linux-x86_64': `${baseUrl}/bedrock-server-${version}.zip`,
            'linux-arm64': `${baseUrl}-arm64/bedrock-server-${version}.zip`,
            'linux-arm32': `${baseUrl}-arm32/bedrock-server-${version}.zip`,
            'windows-x86_64': `https://www.minecraft.net/bedrockdedicatedserver/bin-win64/bedrock-server-${version}.zip`
        };

        return urls[platform];
    }

    private async extract(zipPath: string): Promise<void> {
        this.logger.info('Extracting Bedrock server...');

        if (zipPath.endsWith('.zip')) {
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(this.serverDir, true);
        } else if (zipPath.endsWith('.tar.gz')) {
            await tar.extract({
                file: zipPath,
                cwd: this.serverDir
            });
        }

        await fs.remove(zipPath);
        this.logger.success('Extraction complete');

        this.findExecutable();
    }

    private findExecutable(): void {
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

    public async prepare(): Promise<void> {
        this.logger.info('Preparing Bedrock server...');

        const properties = PropertiesParser.generateBedrockProperties(this.config);
        
        const serverPropsPath = path.join(this.serverDir, 'server.properties');
        await FileUtils.writeProperties(serverPropsPath, properties);

        const permissionsPath = path.join(this.serverDir, 'permissions.json');
        if (!await FileUtils.fileExists(permissionsPath)) {
            await FileUtils.writeFile(permissionsPath, JSON.stringify([], null, 2));
        }

        const whitelistPath = path.join(this.serverDir, 'whitelist.json');
        if (!await FileUtils.fileExists(whitelistPath)) {
            await FileUtils.writeFile(whitelistPath, JSON.stringify([], null, 2));
        }

        this.logger.success('Bedrock server prepared');
    }

    public async start(): Promise<ServerInfo> {
        if (!this.serverExecutable) {
            this.findExecutable();
        }

        this.logger.info(`Launching Bedrock server: ${this.serverExecutable}`);

        this.process = spawn(this.serverExecutable, [], {
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

        this.process.stderr.on('data', (data: Buffer) => {
            process.stderr.write(`[Bedrock Error] ${data.toString()}`);
        });

        this.process.on('exit', (code: number) => {
            this.serverInfo.status = 'stopped';
            this.logger.warning(`Bedrock server stopped with code ${code}`);
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
                        max: 0
                    };
                    this.serverInfo.cpu = Math.round(stats.cpu);
                    this.serverInfo.uptime = Math.floor((Date.now() - (this.startTime?.getTime() || 0)) / 1000);

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

    public getInfo(): ServerInfo {
        return this.serverInfo;
    }

    public getPlayers(): Player[] {
        return Array.from(this.players.values());
    }

    public isRunning(): boolean {
        return this.serverInfo.status === 'running';
    }
}