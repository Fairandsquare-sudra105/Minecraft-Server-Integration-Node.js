#!/usr/bin/env node

import { MinecraftServer } from './core/MinecraftServer';
import { Logger, LogLevel } from './utils/Logger';
import { SystemDetector } from './utils/SystemDetector';
import { JavaChecker } from './core/JavaChecker';

export * from './core/MinecraftServer';
export * from './core/ConfigHandler';
export * from './core/JavaChecker';
export * from './core/ServerManager';
export * from './platforms/JavaServer';
export * from './platforms/BedrockServer';
export * from './platforms/GeyserBridge';
export * from './platforms/ViaVersion';
export * from './platforms/SkinRestorer';
export * from './engines/Downloader';
export * from './engines/PaperEngine';
export * from './engines/VanillaEngine';
export * from './engines/ForgeEngine';
export * from './engines/FabricEngine';
export * from './utils/Logger';
export * from './utils/FileUtils';
export * from './utils/SystemDetector';
export * from './utils/PropertiesParser';
export * from './types';

export default MinecraftServer;

if (require.main === module) {
    const logger = Logger.getInstance();
    logger.setLogLevel(LogLevel.INFO);
    
    const systemInfo = SystemDetector.getSystemInfo();
    logger.info('System Information:', systemInfo);

    JavaChecker.cleanupOldJava();

    const server = new MinecraftServer({
        platform: 'java',
        version: '1.21.11',
        type: 'paper',
        usePortableJava: true,
        memory: {
            init: '2G',
            max: '4G',
            useAikarsFlags: true
        },
        world: {
            difficulty: 'normal',
            hardcore: false,
            gamemode: 'survival',
            maxPlayers: 20,
            viewDistance: 6,
            levelName: 'world'
        },
        enableViaVersion: true,
        enableViaBackwards: true,
        enableViaRewind: true,
        enableSkinRestorer: true,
        silentMode: true,
        statsInterval: 30000
    });

    server.on('ready', (info) => {
        console.log(`
Minecraft Headless - Powered By Dimzxzzx07
  IP: ${info.ip}:${info.port}
  Version: ${info.version}
  Players: ${info.players}/${info.maxPlayers}
  Memory: ${info.memory.used}/${info.memory.max} MB
  CPU: ${info.cpu}%
        `);
    });

    server.on('resource', (info) => {
        if (info.memory.used > info.memory.max * 0.8) {
            logger.warning(`High memory usage: ${info.memory.used}/${info.memory.max} MB (${info.cpu}% CPU)`);
        }
    });

    server.start().catch(error => {
        logger.error('Failed to start server:', error);
    });

    process.on('SIGINT', async () => {
        logger.info('Received SIGINT, stopping server...');
        await server.stop();
        JavaChecker.cleanupOldJava();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        logger.info('Received SIGTERM, stopping server...');
        await server.stop();
        JavaChecker.cleanupOldJava();
        process.exit(0);
    });
}