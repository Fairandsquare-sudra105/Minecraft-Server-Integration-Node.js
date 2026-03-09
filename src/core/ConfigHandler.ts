import { MinecraftConfig } from '../types';

export class ConfigHandler {
    private config: MinecraftConfig;

    constructor(config: Partial<MinecraftConfig>) {
        this.config = this.validateAndComplete(config);
    }

    private validateAndComplete(config: Partial<MinecraftConfig>): MinecraftConfig {
        const defaultConfig: MinecraftConfig = {
            platform: 'java',
            version: '1.20.1',
            type: 'paper',
            autoAcceptEula: true,

            memory: {
                init: '1G',
                max: '4G',
                useAikarsFlags: true
            },

            network: {
                port: 25565,
                bedrockPort: 19132,
                ip: '0.0.0.0',
                onlineMode: false,
                motd: 'Minecraft Server'
            },

            world: {
                difficulty: 'normal',
                hardcore: false,
                gamemode: 'survival',
                maxPlayers: 20,
                viewDistance: 10,
                levelName: 'world'
            },

            folders: {
                addons: './addons',
                mods: './mods',
                plugins: './plugins',
                world: './world'
            },

            autoRestart: false,
            backup: {
                enabled: false,
                interval: '24h',
                path: './backups'
            }
        };

        const merged = this.mergeDeep(defaultConfig, config) as MinecraftConfig;

        this.validateConfig(merged);

        return merged;
    }

    private validateConfig(config: MinecraftConfig): void {
        if (!['java', 'bedrock', 'all'].includes(config.platform)) {
            throw new Error('Invalid platform. Must be java, bedrock, or all');
        }

        if (!['paper', 'purpur', 'vanilla', 'spigot', 'forge', 'fabric'].includes(config.type)) {
            throw new Error('Invalid server type');
        }

        if (!/^\d+\.\d+(\.\d+)?$/.test(config.version)) {
            throw new Error('Invalid version format');
        }

        const memRegex = /^\d+[MG]$/;
        if (!memRegex.test(config.memory.init) || !memRegex.test(config.memory.max)) {
            throw new Error('Memory must be in format like 1G or 1024M');
        }

        if (config.network.port < 1 || config.network.port > 65535) {
            throw new Error('Invalid port number');
        }

        if (config.world.maxPlayers < 1 || config.world.maxPlayers > 1000) {
            throw new Error('Max players must be between 1 and 1000');
        }

        if (config.world.viewDistance < 3 || config.world.viewDistance > 32) {
            throw new Error('View distance must be between 3 and 32');
        }
    }

    private mergeDeep(target: any, source: any): any {
        const output = { ...target };

        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        output[key] = source[key];
                    } else {
                        output[key] = this.mergeDeep(target[key], source[key]);
                    }
                } else {
                    output[key] = source[key];
                }
            });
        }

        return output;
    }

    private isObject(item: any): boolean {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    public getConfig(): MinecraftConfig {
        return this.config;
    }

    public getServerProperties(): Record<string, any> {
        return {
            'difficulty': this.config.world.difficulty,
            'hardcore': this.config.world.hardcore.toString(),
            'level-seed': this.config.world.seed || '',
            'gamemode': this.config.world.gamemode,
            'server-port': this.config.network.port.toString(),
            'server-ip': this.config.network.ip,
            'max-players': this.config.world.maxPlayers.toString(),
            'view-distance': this.config.world.viewDistance.toString(),
            'level-name': this.config.world.levelName,
            'motd': this.config.network.motd,
            'online-mode': this.config.network.onlineMode.toString()
        };
    }
}