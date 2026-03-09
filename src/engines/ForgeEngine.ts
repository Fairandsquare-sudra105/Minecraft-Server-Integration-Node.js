import { ServerEngine } from './ServerEngine';
import { MinecraftConfig } from '../types';
import { Downloader } from './Downloader';
import { FileUtils } from '../utils/FileUtils';
import { PropertiesParser } from '../utils/PropertiesParser';
import * as path from 'path';
import { execSync } from 'child_process';
import * as fs from 'fs';

export class ForgeEngine implements ServerEngine {
    public async download(config: MinecraftConfig, serverDir: string): Promise<string> {
        const downloadInfo = Downloader.getForgeURL(config.version);
        return Downloader.downloadFile(downloadInfo, serverDir);
    }

    public async prepare(config: MinecraftConfig, serverDir: string, jarPath: string): Promise<void> {
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

        const installerPath = jarPath;
        const forgeJar = path.join(serverDir, `forge-${config.version}-${config.version}.0-server.jar`);

        if (!await FileUtils.fileExists(forgeJar)) {
            console.log('Running Forge installer...');
            execSync(`java -jar "${installerPath}" --installServer`, {
                cwd: serverDir,
                stdio: 'inherit'
            });
        }
    }

    public getJavaArgs(config: MinecraftConfig): string[] {
        const args: string[] = [];

        args.push(`-Xms${config.memory.init}`);
        args.push(`-Xmx${config.memory.max}`);

        return args;
    }

    public getServerJar(jarPath: string): string {
        const dir = path.dirname(jarPath);
        const files = fs.readdirSync(dir);
        const forgeJar = files.find((f: string) => f.includes('forge') && f.endsWith('-server.jar'));
        return forgeJar ? path.join(dir, forgeJar) : jarPath;
    }

    public getServerArgs(): string[] {
        return ['nogui'];
    }

    public getServerType(): string {
        return 'forge';
    }
}