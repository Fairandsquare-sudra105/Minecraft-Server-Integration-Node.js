import { execSync, exec } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import * as tar from 'tar';
import { Logger } from '../utils/Logger';

export interface JavaInfo {
    path: string;
    version: string;
    type: 'system' | 'portable';
}

export class JavaChecker {
    private static logger = Logger.getInstance();
    private static readonly JAVA_DIR = path.join(process.cwd(), '.java');
    
    // Hanya pakai URL yang reliable dan direct download
    private static readonly JAVA_URLS = {
        '21': [
            'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.2%2B13/OpenJDK21U-jdk_x64_linux_hotspot_21.0.2_13.tar.gz',
            'https://corretto.aws/downloads/latest/amazon-corretto-21-x64-linux-jre.tar.gz'
        ],
        '17': [
            'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.10%2B7/OpenJDK17U-jdk_x64_linux_hotspot_17.0.10_7.tar.gz',
            'https://corretto.aws/downloads/latest/amazon-corretto-17-x64-linux-jre.tar.gz'
        ]
    };

    public static getRequiredJavaVersion(serverVersion: string): '17' | '21' {
        if (serverVersion.startsWith('1.21') || serverVersion === '1.21.11') {
            return '21';
        }
        if (serverVersion.startsWith('1.20') || serverVersion.startsWith('1.19') || serverVersion.startsWith('1.18')) {
            return '17';
        }
        return '21';
    }

    public static async checkJava(): Promise<boolean> {
        return new Promise((resolve) => {
            exec('which java', (error, stdout) => {
                if (error || !stdout.trim()) {
                    this.logger.warning('Java is not installed in system');
                    resolve(false);
                } else {
                    const javaPath = stdout.trim();
                    this.logger.success(`System Java found at: ${javaPath}`);
                    resolve(true);
                }
            });
        });
    }

    public static getSystemJavaPath(): string | null {
        try {
            const stdout = execSync('which java').toString().trim();
            return stdout || null;
        } catch {
            return null;
        }
    }

    public static getSystemJavaVersion(): string | null {
        try {
            const output = execSync('java -version 2>&1').toString();
            if (output.includes('version "21')) return '21';
            if (output.includes('version "17')) return '17';
            if (output.includes('version "11')) return '11';
            if (output.includes('version "1.8')) return '8';
            const match = output.match(/version "([^"]+)"/);
            return match ? match[1] : null;
        } catch {
            return null;
        }
    }

    private static async downloadWithNode(url: string, destPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.logger.info(`Downloading Java from ${url}`);
            
            const protocol = url.startsWith('https') ? https : http;
            
            const request = protocol.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
                }
            }, (response) => {
                if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
                    const location = response.headers.location;
                    if (location) {
                        this.logger.info(`Redirecting to ${location}`);
                        this.downloadWithNode(location, destPath).then(resolve).catch(reject);
                        return;
                    }
                }

                if (response.statusCode !== 200) {
                    reject(new Error(`Download failed: ${response.statusCode}`));
                    return;
                }

                const contentType = response.headers['content-type'];
                if (contentType && contentType.includes('text/html')) {
                    reject(new Error('Received HTML instead of binary - likely license redirect'));
                    return;
                }

                const file = fs.createWriteStream(destPath);
                const totalSize = parseInt(response.headers['content-length'] || '0');
                let downloadedSize = 0;
                let lastPercent = 0;

                response.on('data', (chunk) => {
                    downloadedSize += chunk.length;
                    if (totalSize > 0) {
                        const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
                        if (parseFloat(percent) >= lastPercent + 5 || parseFloat(percent) >= 100) {
                            lastPercent = parseFloat(percent);
                            process.stdout.write(`\rDownloading Java: ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(1)} MB)`);
                        }
                    }
                });

                response.pipe(file);

                file.on('finish', () => {
                    process.stdout.write('\n');
                    file.close();
                    
                    const stats = fs.statSync(destPath);
                    if (stats.size < 1000000) {
                        fs.unlinkSync(destPath);
                        reject(new Error(`Downloaded file too small: ${stats.size} bytes - possibly HTML page`));
                        return;
                    }
                    
                    resolve();
                });

                file.on('error', (err) => {
                    fs.unlink(destPath).catch(() => {});
                    reject(err);
                });
            });

            request.on('error', (err) => {
                fs.unlink(destPath).catch(() => {});
                reject(err);
            });

            request.setTimeout(300000, () => {
                request.destroy();
                fs.unlink(destPath).catch(() => {});
                reject(new Error('Download timeout after 5 minutes'));
            });

            request.end();
        });
    }

    public static async getOrDownloadPortableJava(version: '17' | '21'): Promise<JavaInfo> {
        await fs.ensureDir(this.JAVA_DIR);
        
        const javaHome = path.join(this.JAVA_DIR, `jre-${version}`);
        const javaBin = path.join(javaHome, 'bin', 'java');
        
        if (await fs.pathExists(javaBin)) {
            this.logger.info(`Portable Java ${version} already exists at ${javaBin}`);
            
            try {
                const versionOutput = execSync(`"${javaBin}" -version 2>&1`).toString();
                this.logger.debug(`Portable Java version: ${versionOutput.split('\n')[0]}`);
                return {
                    path: javaBin,
                    version: version,
                    type: 'portable'
                };
            } catch (error) {
                this.logger.warning(`Existing Java seems corrupted, re-downloading...`);
                await fs.remove(javaHome);
            }
        }

        const urls = this.JAVA_URLS[version] || this.JAVA_URLS['21'];
        let lastError: Error | null = null;

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            const tarPath = path.join(this.JAVA_DIR, `jre-${version}-${Date.now()}.tar.gz`);
            
            try {
                this.logger.info(`Downloading portable Java ${version} (attempt ${i + 1}/${urls.length})...`);
                this.logger.info(`URL: ${url}`);
                
                await this.downloadWithNode(url, tarPath);
                
                this.logger.info(`Extracting Java ${version}...`);
                await fs.ensureDir(javaHome);
                await tar.extract({
                    file: tarPath,
                    cwd: javaHome,
                    strip: 1
                });
                
                await fs.remove(tarPath);
                
                await fs.chmod(javaBin, 0o755);
                
                this.logger.success(`Portable Java ${version} installed at ${javaBin}`);
                
                const versionOutput = execSync(`"${javaBin}" -version 2>&1`).toString();
                this.logger.debug(`Portable Java version: ${versionOutput.split('\n')[0]}`);

                return {
                    path: javaBin,
                    version: version,
                    type: 'portable'
                };
                
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                this.logger.warning(`Attempt ${i + 1} failed: ${lastError.message}`);
                await fs.remove(tarPath).catch(() => {});
            }
        }

        throw new Error(`Failed to download Java ${version} after ${urls.length} attempts. Last error: ${lastError?.message}`);
    }

    public static async ensureJava(serverVersion: string, usePortable: boolean = true): Promise<JavaInfo> {
        const requiredVersion = this.getRequiredJavaVersion(serverVersion);
        this.logger.info(`Server requires Java ${requiredVersion}`);
        
        if (!usePortable) {
            const systemJava = this.getSystemJavaPath();
            if (systemJava) {
                const systemVersion = this.getSystemJavaVersion();
                if (systemVersion === requiredVersion) {
                    this.logger.success(`Using system Java ${systemVersion} at ${systemJava}`);
                    return {
                        path: systemJava,
                        version: systemVersion,
                        type: 'system'
                    };
                } else {
                    this.logger.warning(`System Java is ${systemVersion}, but server needs Java ${requiredVersion}`);
                }
            }
        }
        
        this.logger.info(`Downloading portable Java ${requiredVersion}...`);
        return this.getOrDownloadPortableJava(requiredVersion);
    }

    public static cleanupOldJava(): void {
        try {
            const files = fs.readdirSync(this.JAVA_DIR);
            const now = Date.now();
            const oneDay = 24 * 60 * 60 * 1000;

            files.forEach(file => {
                const filePath = path.join(this.JAVA_DIR, file);
                const stats = fs.statSync(filePath);
                if (now - stats.mtimeMs > oneDay) {
                    fs.removeSync(filePath);
                    this.logger.debug(`Cleaned up old Java: ${file}`);
                }
            });
        } catch (error) {
            this.logger.debug('No old Java to cleanup');
        }
    }
}