import { MinecraftConfig } from '../types';
export interface ViaVersionInfo {
    version: string;
    downloadUrl: string;
    fileName: string;
}
export declare class ViaVersionManager {
    private logger;
    private readonly VIAVERSION_URL;
    private readonly VIABACKWARDS_URL;
    private readonly VIAREWIND_URL;
    setup(config: MinecraftConfig): Promise<void>;
    private cleanupCorruptFiles;
    private downloadFile;
    private downloadViaVersion;
    private downloadViaBackwards;
    private downloadViaRewind;
    private verifyAllPlugins;
    configureViaVersion(config: MinecraftConfig): Promise<void>;
}
//# sourceMappingURL=ViaVersion.d.ts.map