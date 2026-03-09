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
exports.ForgeEngine = void 0;
const Downloader_1 = require("./Downloader");
const FileUtils_1 = require("../utils/FileUtils");
const PropertiesParser_1 = require("../utils/PropertiesParser");
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
class ForgeEngine {
    async download(config, serverDir) {
        const downloadInfo = Downloader_1.Downloader.getForgeURL(config.version);
        return Downloader_1.Downloader.downloadFile(downloadInfo, serverDir);
    }
    async prepare(config, serverDir, jarPath) {
        if (config.autoAcceptEula) {
            await FileUtils_1.FileUtils.writeFile(path.join(serverDir, 'eula.txt'), 'eula=true');
        }
        const properties = PropertiesParser_1.PropertiesParser.generateServerProperties(config);
        await FileUtils_1.FileUtils.writeProperties(path.join(serverDir, 'server.properties'), properties);
        const installerPath = jarPath;
        const forgeJar = path.join(serverDir, `forge-${config.version}-${config.version}.0-server.jar`);
        if (!await FileUtils_1.FileUtils.fileExists(forgeJar)) {
            console.log('Running Forge installer...');
            (0, child_process_1.execSync)(`java -jar "${installerPath}" --installServer`, {
                cwd: serverDir,
                stdio: 'inherit'
            });
        }
    }
    getJavaArgs(config) {
        const args = [];
        args.push(`-Xms${config.memory.init}`);
        args.push(`-Xmx${config.memory.max}`);
        return args;
    }
    getServerJar(jarPath) {
        const dir = path.dirname(jarPath);
        const files = fs.readdirSync(dir);
        const forgeJar = files.find((f) => f.includes('forge') && f.endsWith('-server.jar'));
        return forgeJar ? path.join(dir, forgeJar) : jarPath;
    }
    getServerArgs() {
        return ['nogui'];
    }
    getServerType() {
        return 'forge';
    }
}
exports.ForgeEngine = ForgeEngine;
//# sourceMappingURL=ForgeEngine.js.map