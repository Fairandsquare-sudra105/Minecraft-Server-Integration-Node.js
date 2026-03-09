export type Platform = 'java' | 'bedrock' | 'all';
export type ServerType = 'paper' | 'purpur' | 'vanilla' | 'spigot' | 'forge' | 'fabric';
export type Difficulty = 'peaceful' | 'easy' | 'normal' | 'hard';
export type Gamemode = 'survival' | 'creative' | 'adventure' | 'spectator';
export interface MinecraftConfig {
    platform: Platform;
    version: string;
    type: ServerType;
    autoAcceptEula: boolean;
    memory: {
        init: string;
        max: string;
        useAikarsFlags: boolean;
    };
    network: {
        port: number;
        bedrockPort?: number;
        ip: string;
        onlineMode: boolean;
        motd: string;
    };
    world: {
        difficulty: Difficulty;
        hardcore: boolean;
        gamemode: Gamemode;
        seed?: string;
        maxPlayers: number;
        viewDistance: number;
        simulationDistance?: number;
        levelName: string;
    };
    folders: {
        addons: string;
        mods: string;
        plugins: string;
        world: string;
    };
    autoRestart: boolean;
    backup: {
        enabled: boolean;
        interval: string;
        path: string;
    };
}
export interface ServerInfo {
    pid: number;
    ip: string;
    port: number;
    bedrockPort?: number;
    version: string;
    type: ServerType;
    platform: Platform;
    players: number;
    maxPlayers: number;
    uptime: number;
    memory: {
        used: number;
        max: number;
    };
    cpu: number;
    status: 'starting' | 'running' | 'stopping' | 'stopped' | 'crashed';
}
export interface DownloadInfo {
    url: string;
    fileName: string;
    size?: number;
    sha1?: string;
}
export interface BackupInfo {
    path: string;
    size: number;
    createdAt: Date;
    type: 'full' | 'world' | 'plugins';
}
export interface Player {
    name: string;
    uuid: string;
    ip: string;
    ping: number;
    connectedAt: Date;
}
//# sourceMappingURL=index.d.ts.map