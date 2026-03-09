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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemDetector = void 0;
const child_process_1 = require("child_process");
const os = __importStar(require("os"));
class SystemDetector {
    static getOS() {
        const platform = os.platform();
        if (platform === 'linux') {
            if (process.env.TERMUX_VERSION || process.env.PREFIX === '/data/data/com.termux/files/usr') {
                return 'android';
            }
            return 'linux';
        }
        else if (platform === 'darwin') {
            return 'darwin';
        }
        else if (platform === 'win32') {
            return 'windows';
        }
        return 'unknown';
    }
    static getDistro() {
        const osType = this.getOS();
        if (osType === 'android') {
            return 'termux';
        }
        if (osType === 'linux') {
            try {
                const osRelease = (0, child_process_1.execSync)('cat /etc/os-release').toString();
                if (osRelease.includes('Ubuntu'))
                    return 'ubuntu';
                if (osRelease.includes('Debian'))
                    return 'debian';
                if (osRelease.includes('CentOS'))
                    return 'centos';
                if (osRelease.includes('Fedora'))
                    return 'fedora';
                if (osRelease.includes('Arch'))
                    return 'arch';
            }
            catch { }
        }
        return 'unknown';
    }
    static hasJava() {
        try {
            (0, child_process_1.execSync)('java -version', { stdio: 'ignore' });
            return true;
        }
        catch {
            return false;
        }
    }
    static getJavaVersion() {
        try {
            const output = (0, child_process_1.execSync)('java -version 2>&1').toString();
            const match = output.match(/version "([^"]+)"/);
            return match ? match[1] : null;
        }
        catch {
            return null;
        }
    }
    static getArch() {
        return os.arch();
    }
    static getTotalMemory() {
        return os.totalmem() / (1024 * 1024 * 1024);
    }
    static getCPUCores() {
        return os.cpus().length;
    }
    static getSystemInfo() {
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
    static getJavaInstallCommand() {
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
exports.SystemDetector = SystemDetector;
//# sourceMappingURL=SystemDetector.js.map