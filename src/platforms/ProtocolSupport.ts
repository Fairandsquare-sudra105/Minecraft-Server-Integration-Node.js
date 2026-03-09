import { MinecraftConfig } from '../types';
import { FileUtils } from '../utils/FileUtils';
import { Logger } from '../utils/Logger';
import * as path from 'path';
import axios from 'axios';

export class ProtocolSupportManager {
    private logger = Logger.getInstance();

    public async setup(config: MinecraftConfig): Promise<void> {
        const pluginsDir = config.folders.plugins;
        await FileUtils.ensureDir(pluginsDir);

        this.logger.info('Setting up ProtocolSupport...');

        await this.downloadProtocolSupport(pluginsDir);

        this.logger.success('ProtocolSupport installed successfully');
    }

    private async downloadProtocolSupport(pluginsDir: string): Promise<void> {
        const psJar = path.join(pluginsDir, 'ProtocolSupport.jar');
        
        if (await FileUtils.fileExists(psJar)) {
            this.logger.info('ProtocolSupport already exists, skipping download');
            return;
        }

        this.logger.info('Downloading ProtocolSupport...');
        
        try {
            const response = await axios({
                method: 'GET',
                url: 'https://github.com/ProtocolSupport/ProtocolSupport/releases/latest/download/ProtocolSupport.jar',
                responseType: 'stream'
            });

            const writer = require('fs').createWriteStream(psJar);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            this.logger.success('ProtocolSupport downloaded');
        } catch (error) {
            this.logger.error('Failed to download ProtocolSupport', error);
            throw error;
        }
    }
}