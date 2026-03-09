import { MinecraftConfig } from '../types';
import { Downloader } from '../engines/Downloader';
import { FileUtils } from '../utils/FileUtils';
import { Logger } from '../utils/Logger';
import * as path from 'path';
import { spawn } from 'child_process';

export class GeyserBridge {
    private logger = Logger.getInstance();
    private process: any = null;

    public async setup(config: MinecraftConfig): Promise<void> {
        const pluginsDir = config.folders.plugins;
        
        await FileUtils.ensureDir(pluginsDir);

        const geyserJar = path.join(pluginsDir, 'geyser.jar');
        const floodgateJar = path.join(pluginsDir, 'floodgate.jar');

        if (!await FileUtils.fileExists(geyserJar)) {
            this.logger.info('Downloading Geyser...');
            
            const geyserInfo = await Downloader.getGeyserInfo();
            
            geyserInfo.fileName = 'geyser.jar';
            
            const downloadedPath = await Downloader.downloadFile(geyserInfo, pluginsDir);
            
            if (downloadedPath && downloadedPath !== geyserJar) {
                if (await FileUtils.fileExists(downloadedPath)) {
                    await FileUtils.moveFile(downloadedPath, geyserJar);
                }
            }
            
            this.logger.success('Geyser downloaded to plugins folder');
        }

        if (!await FileUtils.fileExists(floodgateJar)) {
            this.logger.info('Downloading Floodgate...');
            
            const floodgateInfo = await Downloader.getFloodgateInfo();
            
            floodgateInfo.fileName = 'floodgate.jar';
            
            const downloadedPath = await Downloader.downloadFile(floodgateInfo, pluginsDir);
            
            if (downloadedPath && downloadedPath !== floodgateJar) {
                if (await FileUtils.fileExists(downloadedPath)) {
                    await FileUtils.moveFile(downloadedPath, floodgateJar);
                }
            }
            
            this.logger.success('Floodgate downloaded to plugins folder');
        }

        this.logger.success('Geyser & Floodgate installed');
    }

    public async startStandalone(config: MinecraftConfig, serverDir: string): Promise<void> {
        const geyserDir = path.join(serverDir, 'geyser-standalone');
        await FileUtils.ensureDir(geyserDir);
        
        const geyserJar = path.join(geyserDir, 'geyser.jar');

        if (!await FileUtils.fileExists(geyserJar)) {
            this.logger.info('Downloading Geyser standalone...');
            
            const geyserInfo = await Downloader.getGeyserInfo();
            geyserInfo.fileName = 'geyser.jar';
            
            const downloadedPath = await Downloader.downloadFile(geyserInfo, geyserDir);
            
            if (downloadedPath && downloadedPath !== geyserJar) {
                if (await FileUtils.fileExists(downloadedPath)) {
                    await FileUtils.moveFile(downloadedPath, geyserJar);
                }
            }
            
            this.logger.success('Geyser standalone downloaded');
        }

        const javaArgs = [
            `-Xms${config.memory.init}`,
            `-Xmx${config.memory.max}`,
            '-jar',
            geyserJar
        ];

        this.logger.info('Starting Geyser standalone...');
        this.process = spawn('java', javaArgs, {
            cwd: geyserDir,
            stdio: 'pipe'
        });

        this.process.stdout.on('data', (data: Buffer) => {
            process.stdout.write(`[Geyser] ${data.toString()}`);
        });

        this.process.stderr.on('data', (data: Buffer) => {
            process.stderr.write(`[Geyser Error] ${data.toString()}`);
        });
    }

    public stop(): void {
        if (this.process) {
            this.process.kill();
            this.process = null;
            this.logger.info('Geyser stopped');
        }
    }
}