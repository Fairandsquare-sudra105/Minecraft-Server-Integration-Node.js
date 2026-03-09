import { MinecraftConfig } from '../types';
import { FileUtils } from '../utils/FileUtils';
import { Logger } from '../utils/Logger';
import * as path from 'path';
import axios from 'axios';
import * as fs from 'fs-extra';

export interface SkinRestorerInfo {
    version: string;
    downloadUrl: string;
}

export class SkinRestorerManager {
    private logger = Logger.getInstance();
    private readonly SKINRESTORER_URL = 'https://github.com/SkinsRestorer/SkinsRestorerX/releases/latest/download/SkinsRestorer.jar';

    public async setup(config: MinecraftConfig): Promise<void> {
        const pluginsDir = config.folders.plugins;
        await FileUtils.ensureDir(pluginsDir);

        this.logger.info('Setting up SkinRestorer...');

        await this.cleanupCorruptFiles(pluginsDir);
        await this.downloadSkinRestorer(pluginsDir);
        await this.verifyPlugin(pluginsDir);

        this.logger.success('SkinRestorer installed successfully');
        this.logger.info('Player skins will now be restored automatically');
    }

    private async cleanupCorruptFiles(pluginsDir: string): Promise<void> {
        const filePath = path.join(pluginsDir, 'SkinsRestorer.jar');
        
        if (await FileUtils.fileExists(filePath)) {
            try {
                const stats = await fs.stat(filePath);
                if (stats.size < 100000) {
                    this.logger.warning('Corrupt SkinRestorer detected, removing...');
                    await fs.remove(filePath);
                } else {
                    const buffer = await fs.readFile(filePath);
                    if (buffer[0] !== 0x50 || buffer[1] !== 0x4B) {
                        this.logger.warning('Invalid ZIP header in SkinRestorer, removing...');
                        await fs.remove(filePath);
                    } else {
                        this.logger.info('SkinRestorer is valid, keeping it');
                    }
                }
            } catch (error) {
                this.logger.warning('Error checking SkinRestorer, removing...');
                await fs.remove(filePath);
            }
        }
    }

    private async downloadSkinRestorer(pluginsDir: string): Promise<void> {
        const destPath = path.join(pluginsDir, 'SkinsRestorer.jar');
        
        if (await FileUtils.fileExists(destPath)) {
            this.logger.info('SkinRestorer already exists, skipping download');
            return;
        }

        this.logger.info('Downloading SkinRestorer...');

        try {
            const response = await axios({
                method: 'GET',
                url: this.SKINRESTORER_URL,
                responseType: 'stream',
                timeout: 60000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const writer = fs.createWriteStream(destPath);
            response.data.pipe(writer);

            await new Promise<void>((resolve, reject) => {
                writer.on('finish', () => resolve());
                writer.on('error', (err) => reject(err));
            });

            const stats = await fs.stat(destPath);
            if (stats.size < 100000) {
                throw new Error(`Downloaded file too small: ${stats.size} bytes`);
            }

            const buffer = await fs.readFile(destPath);
            if (buffer[0] !== 0x50 || buffer[1] !== 0x4B) {
                throw new Error('Invalid ZIP header');
            }

            this.logger.success(`Downloaded SkinRestorer (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

        } catch (error) {
            this.logger.error('Failed to download SkinRestorer:', error);
            throw error;
        }
    }

    private async verifyPlugin(pluginsDir: string): Promise<void> {
        const filePath = path.join(pluginsDir, 'SkinsRestorer.jar');
        
        if (!await FileUtils.fileExists(filePath)) {
            throw new Error('SkinRestorer plugin is missing');
        }

        try {
            const stats = await fs.stat(filePath);
            if (stats.size < 100000) {
                throw new Error('SkinRestorer plugin is too small');
            }

            const buffer = await fs.readFile(filePath);
            if (buffer[0] !== 0x50 || buffer[1] !== 0x4B) {
                throw new Error('SkinRestorer plugin has invalid ZIP header');
            }

            this.logger.debug(`SkinRestorer verified OK (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        } catch (error) {
            this.logger.error('Failed to verify SkinRestorer:', error);
            throw error;
        }
    }
}