import { MinecraftConfig } from '../types';

export interface ServerEngine {
    download(config: MinecraftConfig, serverDir: string): Promise<string>;
    prepare(config: MinecraftConfig, serverDir: string, jarPath?: string): Promise<void>;
    getJavaArgs(config: MinecraftConfig): string[];
    getServerJar(jarPath: string): string;
    getServerArgs(): string[];
    getServerType(): string;
}