export class PropertiesParser {
    public static parse(content: string): Record<string, string> {
        const properties: Record<string, string> = {};
        const lines = content.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const eqIndex = trimmed.indexOf('=');
                if (eqIndex > 0) {
                    const key = trimmed.substring(0, eqIndex).trim();
                    const value = trimmed.substring(eqIndex + 1).trim();
                    properties[key] = value;
                }
            }
        }

        return properties;
    }

    public static stringify(properties: Record<string, any>): string {
        const lines: string[] = [];

        for (const [key, value] of Object.entries(properties)) {
            if (value !== undefined && value !== null) {
                lines.push(`${key}=${value}`);
            }
        }

        return lines.join('\n');
    }

    public static generateServerProperties(config: any): Record<string, any> {
        return {
            'allow-flight': false,
            'allow-nether': true,
            'broadcast-console-to-ops': true,
            'broadcast-rcon-to-ops': true,
            'difficulty': config.world.difficulty,
            'enable-command-block': false,
            'enable-jmx-monitoring': false,
            'enable-query': false,
            'enable-rcon': false,
            'enable-status': true,
            'enforce-secure-profile': true,
            'enforce-whitelist': false,
            'entity-broadcast-range-percentage': 100,
            'force-gamemode': false,
            'function-permission-level': 2,
            'gamemode': config.world.gamemode,
            'generate-structures': true,
            'generator-settings': '',
            'hardcore': config.world.hardcore,
            'hide-online-players': false,
            'initial-disabled-packs': '',
            'initial-enabled-packs': 'vanilla',
            'level-name': config.world.levelName,
            'level-seed': config.world.seed || '',
            'level-type': 'minecraft\\:normal',
            'max-chained-neighbor-updates': 1000000,
            'max-players': config.world.maxPlayers,
            'max-tick-time': 60000,
            'max-world-size': 29999984,
            'motd': config.network.motd,
            'network-compression-threshold': 256,
            'online-mode': config.network.onlineMode,
            'op-permission-level': 4,
            'player-idle-timeout': 0,
            'prevent-proxy-connections': false,
            'pvp': true,
            'query.port': 25565,
            'rate-limit': 0,
            'rcon.password': '',
            'rcon.port': 25575,
            'require-resource-pack': false,
            'resource-pack': '',
            'resource-pack-id': '',
            'resource-pack-prompt': '',
            'resource-pack-sha1': '',
            'server-ip': config.network.ip,
            'server-port': config.network.port,
            'simulation-distance': config.world.viewDistance,
            'spawn-animals': true,
            'spawn-monsters': true,
            'spawn-npcs': true,
            'spawn-protection': 16,
            'sync-chunk-writes': true,
            'text-filtering-config': '',
            'use-native-transport': true,
            'view-distance': config.world.viewDistance,
            'white-list': false
        };
    }

    public static generateBedrockProperties(config: any): Record<string, any> {
        return {
            'server-name': config.network.motd.replace(/§./g, ''),
            'gamemode': config.world.gamemode,
            'difficulty': config.world.difficulty,
            'allow-cheats': false,
            'max-players': config.world.maxPlayers,
            'online-mode': config.network.onlineMode,
            'white-list': false,
            'server-port': config.network.bedrockPort || 19132,
            'server-portv6': 19133,
            'level-name': config.world.levelName,
            'level-seed': config.world.seed || '',
            'level-type': 'DEFAULT',
            'enable-query': true,
            'enable-rcon': false,
            'rcon-port': 25575,
            'rcon-password': '',
            'max-threads': 8,
            'tick-distance': 4,
            'default-player-permission-level': 'member',
            'texturepack-required': false,
            'content-log-file-enabled': false,
            'compression-threshold': 1,
            'server-authoritative-movement': 'server-auth',
            'player-movement-score-threshold': 20,
            'player-movement-distance-threshold': 0.3,
            'player-movement-duration-threshold-in-ms': 500,
            'correct-player-movement': false
        };
    }
}