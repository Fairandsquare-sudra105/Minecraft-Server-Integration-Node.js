import { execSync } from 'child_process';
import * as os from 'os';

export type OSType = 'linux' | 'darwin' | 'windows' | 'android' | 'unknown';
export type DistroType = 'ubuntu' | 'debian' | 'centos' | 'fedora' | 'arch' | 'termux' | 'unknown';

export class SystemDetector {
    public static getOS(): OSType {
        const platform = os.platform();
        
        if (platform === 'linux') {
            if (process.env.TERMUX_VERSION || process.env.PREFIX === '/data/data/com.termux/files/usr') {
                return 'android';
            }
            return 'linux';
        } else if (platform === 'darwin') {
            return 'darwin';
        } else if (platform === 'win32') {
            return 'windows';
        }
        
        return 'unknown';
    }

    public static getDistro(): DistroType {
        const osType = this.getOS();
        
        if (osType === 'android') {
            return 'termux';
        }
        
        if (osType === 'linux') {
            try {
                const osRelease = execSync('cat /etc/os-release').toString();
                
                if (osRelease.includes('Ubuntu')) return 'ubuntu';
                if (osRelease.includes('Debian')) return 'debian';
                if (osRelease.includes('CentOS')) return 'centos';
                if (osRelease.includes('Fedora')) return 'fedora';
                if (osRelease.includes('Arch')) return 'arch';
            } catch {}
        }
        
        return 'unknown';
    }

    public static hasJava(): boolean {
        try {
            execSync('java -version', { stdio: 'ignore' });
            return true;
        } catch {
            return false;
        }
    }

    public static getJavaVersion(): string | null {
        try {
            const output = execSync('java -version 2>&1').toString();
            const match = output.match(/version "([^"]+)"/);
            return match ? match[1] : null;
        } catch {
            return null;
        }
    }

    public static getArch(): string {
        return os.arch();
    }

    public static getTotalMemory(): number {
        return os.totalmem() / (1024 * 1024 * 1024);
    }

    public static getCPUCores(): number {
        return os.cpus().length;
    }

    public static getSystemInfo(): any {
        return {
            os: this.getOS(),
            distro: this.getDistro(),
            arch: this.getArch(),
            memoryGB: this.getTotalMemory(),
            cpuCores: this.getCPUCores(),
            hostname: os.hostname(),
            platform: os.platform(),
            release: os.release(),
            hasJava: this.hasJava(),
            javaVersion: this.getJavaVersion()
        };
    }

    public static getJavaInstallCommand(): string {
        const osType = this.getOS();
        const distro = this.getDistro();

        if (osType === 'android') {
            return 'pkg install openjdk-17 -y';
        }

        if (osType === 'linux') {
            switch (distro) {
                case 'ubuntu':
                case 'debian':
                    return 'apt update && apt install openjdk-17-jre-headless -y';
                case 'centos':
                    return 'yum install java-17-openjdk-headless -y';
                case 'fedora':
                    return 'dnf install java-17-openjdk-headless -y';
                case 'arch':
                    return 'pacman -S jre17-openjdk-headless --noconfirm';
                default:
                    return 'echo "Please install Java 17 manually"';
            }
        }

        if (osType === 'darwin') {
            return 'brew install openjdk@17';
        }

        if (osType === 'windows') {
            return 'Please download Java 17 from https://adoptium.net';
        }

        return 'echo "Unable to determine Java installation command"';
    }
}