import { ServerEngine } from './ServerEngine';
import { MinecraftConfig } from '../types';
import { Downloader } from './Downloader';
import { FileUtils } from '../utils/FileUtils';
import { PropertiesParser } from '../utils/PropertiesParser';
import * as path from 'path';

export class FabricEngine implements ServerEngine {
    public async download(config: MinecraftConfig, serverDir: string): Promise<string> {
        const downloadInfo = Downloader.getFabricURL(config.version);
        return Downloader.downloadFile(downloadInfo, serverDir);
    }

    public async prepare(config: MinecraftConfig, serverDir: string): Promise<void> {
        if (config.autoAcceptEula) {
            await FileUtils.writeFile(
                path.join(serverDir, 'eula.txt'),
                'eula=true'
            );
        }

        const properties = PropertiesParser.generateServerProperties(config);
        await FileUtils.writeProperties(
            path.join(serverDir, 'server.properties'),
            properties
        );
    }

    public getJavaArgs(config: MinecraftConfig): string[] {
        const args: string[] = [];

        args.push(`-Xms${config.memory.init}`);
        args.push(`-Xmx${config.memory.max}`);

        return args;
    }

    public getServerJar(jarPath: string): string {
        return jarPath;
    }

    public getServerArgs(): string[] {
        return ['nogui'];
    }

    public getServerType(): string {
        return 'fabric';
    }
}