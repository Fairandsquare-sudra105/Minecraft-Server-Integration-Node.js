import { ServerEngine } from './ServerEngine';
import { MinecraftConfig } from '../types';
import { Downloader } from './Downloader';
import { FileUtils } from '../utils/FileUtils';
import { PropertiesParser } from '../utils/PropertiesParser';
import * as path from 'path';

export class PaperEngine implements ServerEngine {
    public async download(config: MinecraftConfig, serverDir: string): Promise<string> {
        const downloadInfo = await Downloader.getPaperInfo(config.version);
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

        if (config.memory.useAikarsFlags) {
            args.push('-XX:+UseG1GC');
            args.push('-XX:+ParallelRefProcEnabled');
            args.push('-XX:MaxGCPauseMillis=200');
            args.push('-XX:+UnlockExperimentalVMOptions');
            args.push('-XX:+DisableExplicitGC');
            args.push('-XX:+AlwaysPreTouch');
            args.push('-XX:G1HeapWastePercent=5');
            args.push('-XX:G1MixedGCCountTarget=4');
            args.push('-XX:InitiatingHeapOccupancyPercent=15');
            args.push('-XX:G1MixedGCLiveThresholdPercent=90');
            args.push('-XX:G1RSetUpdatingPauseTimePercent=5');
            args.push('-XX:SurvivorRatio=32');
            args.push('-XX:+PerfDisableSharedMem');
            args.push('-XX:MaxTenuringThreshold=1');
            args.push('-Dusing.aikars.flags=https://mcflags.emc.gs');
            args.push('-Daikars.new.flags=true');
        }

        return args;
    }

    public getServerJar(jarPath: string): string {
        return jarPath;
    }

    public getServerArgs(): string[] {
        return ['nogui'];
    }

    public getServerType(): string {
        return 'paper';
    }
}