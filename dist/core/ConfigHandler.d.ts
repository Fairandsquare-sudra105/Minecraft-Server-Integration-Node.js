import { MinecraftConfig } from '../types';
export declare class ConfigHandler {
    private config;
    constructor(config: Partial<MinecraftConfig>);
    private validateAndComplete;
    private validateConfig;
    private mergeDeep;
    private isObject;
    getConfig(): MinecraftConfig;
    getServerProperties(): Record<string, any>;
}
//# sourceMappingURL=ConfigHandler.d.ts.map