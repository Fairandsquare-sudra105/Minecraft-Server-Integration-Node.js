#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
const MinecraftServer_1 = require("./core/MinecraftServer");
const Logger_1 = require("./utils/Logger");
const SystemDetector_1 = require("./utils/SystemDetector");
const JavaChecker_1 = require("./core/JavaChecker");
__exportStar(require("./core/MinecraftServer"), exports);
__exportStar(require("./core/ConfigHandler"), exports);
__exportStar(require("./core/JavaChecker"), exports);
__exportStar(require("./core/ServerManager"), exports);
__exportStar(require("./platforms/JavaServer"), exports);
__exportStar(require("./platforms/BedrockServer"), exports);
__exportStar(require("./platforms/GeyserBridge"), exports);
__exportStar(require("./platforms/ViaVersion"), exports);
__exportStar(require("./platforms/SkinRestorer"), exports);
__exportStar(require("./engines/Downloader"), exports);
__exportStar(require("./engines/PaperEngine"), exports);
__exportStar(require("./engines/VanillaEngine"), exports);
__exportStar(require("./engines/ForgeEngine"), exports);
__exportStar(require("./engines/FabricEngine"), exports);
__exportStar(require("./utils/Logger"), exports);
__exportStar(require("./utils/FileUtils"), exports);
__exportStar(require("./utils/SystemDetector"), exports);
__exportStar(require("./utils/PropertiesParser"), exports);
__exportStar(require("./types"), exports);
exports.default = MinecraftServer_1.MinecraftServer;
if (require.main === module) {
    const logger = Logger_1.Logger.getInstance();
    logger.setLogLevel(Logger_1.LogLevel.INFO);
    const systemInfo = SystemDetector_1.SystemDetector.getSystemInfo();
    logger.info('System Information:', systemInfo);
    JavaChecker_1.JavaChecker.cleanupOldJava();
    const server = new MinecraftServer_1.MinecraftServer({
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
        JavaChecker_1.JavaChecker.cleanupOldJava();
        process.exit(0);
    });
    process.on('SIGTERM', async () => {
        logger.info('Received SIGTERM, stopping server...');
        await server.stop();
        JavaChecker_1.JavaChecker.cleanupOldJava();
        process.exit(0);
    });
}
//# sourceMappingURL=index.js.map