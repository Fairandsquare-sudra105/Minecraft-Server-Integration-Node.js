import { ServerEngine } from './ServerEngine';
import { MinecraftConfig } from '../types';
export declare class ForgeEngine implements ServerEngine {
    download(config: MinecraftConfig, serverDir: string): Promise<string>;
    prepare(config: MinecraftConfig, serverDir: string, jarPath: string): Promise<void>;
    getJavaArgs(config: MinecraftConfig): string[];
    getServerJar(jarPath: string): string;
    getServerArgs(): string[];
    getServerType(): string;
}
//# sourceMappingURL=ForgeEngine.d.ts.map