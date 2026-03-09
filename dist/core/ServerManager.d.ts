import { EventEmitter } from 'events';
import { MinecraftServer } from './MinecraftServer';
import { MinecraftConfig, ServerInfo } from '../types';
export declare class ServerManager extends EventEmitter {
    private servers;
    private logger;
    constructor();
    createServer(name: string, config: Partial<MinecraftConfig>): MinecraftServer;
    getServer(name: string): MinecraftServer | undefined;
    startServer(name: string): Promise<ServerInfo>;
    stopServer(name: string): Promise<void>;
    stopAll(): Promise<void>;
    removeServer(name: string): boolean;
    listServers(): Array<{
        name: string;
        info: ServerInfo;
    }>;
    getServerCount(): number;
    getRunningServers(): Array<{
        name: string;
        info: ServerInfo;
    }>;
    broadcastCommand(command: string): Promise<void>;
    saveAll(): Promise<void>;
    backupAll(type?: 'full' | 'world' | 'plugins'): Promise<Map<string, string>>;
    importServersFromDirectory(dir: string): Promise<void>;
    exportServersToDirectory(dir: string): Promise<void>;
    getStatus(): any;
}
//# sourceMappingURL=ServerManager.d.ts.map