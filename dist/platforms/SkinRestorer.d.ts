import { MinecraftConfig } from '../types';
export interface SkinRestorerInfo {
    version: string;
    downloadUrl: string;
}
export declare class SkinRestorerManager {
    private logger;
    private readonly SKINRESTORER_URL;
    setup(config: MinecraftConfig): Promise<void>;
    private cleanupCorruptFiles;
    private downloadSkinRestorer;
    private verifyPlugin;
}
//# sourceMappingURL=SkinRestorer.d.ts.map