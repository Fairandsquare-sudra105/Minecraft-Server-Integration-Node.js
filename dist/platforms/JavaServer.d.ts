import { EventEmitter } from 'events';
import { MinecraftConfig, ServerInfo, Player } from '../types';
export declare class JavaServer extends EventEmitter {
    private config;
    private logger;
    private engine;
    private process;
    private serverInfo;
    private players;
    private startTime;
    private serverDir;
    constructor(config: MinecraftConfig, serverDir: string);
    private createEngine;
    prepare(): Promise<void>;
    start(jarPath: string): Promise<ServerInfo>;
    private setupEventHandlers;
    private handlePlayerJoin;
    private handlePlayerLeave;
    private monitorResources;
    sendCommand(command: string): void;
    stop(): Promise<void>;
    getInfo(): ServerInfo;
    getPlayers(): Player[];
    private parseMemory;
    isRunning(): boolean;
}
//# sourceMappingURL=JavaServer.d.ts.map