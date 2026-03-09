import { MinecraftConfig } from '../types';
export declare class GeyserBridge {
    private logger;
    private process;
    setup(config: MinecraftConfig): Promise<void>;
    startStandalone(config: MinecraftConfig, serverDir: string): Promise<void>;
    stop(): void;
}
//# sourceMappingURL=GeyserBridge.d.ts.map