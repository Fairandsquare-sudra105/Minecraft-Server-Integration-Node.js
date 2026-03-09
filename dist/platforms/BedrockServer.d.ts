import { EventEmitter } from 'events';
import { MinecraftConfig, ServerInfo, Player } from '../types';
export declare class BedrockServer extends EventEmitter {
    private config;
    private logger;
    private process;
    private serverInfo;
    private players;
    private startTime;
    private serverDir;
    private serverExecutable;
    constructor(config: MinecraftConfig, serverDir: string);
    download(): Promise<string>;
    private getPlatform;
    private getDownloadUrl;
    private extract;
    private findExecutable;
    prepare(): Promise<void>;
    start(): Promise<ServerInfo>;
    private setupEventHandlers;
    private handlePlayerJoin;
    private handlePlayerLeave;
    private monitorResources;
    sendCommand(command: string): void;
    stop(): Promise<void>;
    getInfo(): ServerInfo;
    getPlayers(): Player[];
    isRunning(): boolean;
}
//# sourceMappingURL=BedrockServer.d.ts.map