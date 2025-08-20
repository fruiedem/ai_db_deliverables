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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbConfig = void 0;
exports.validateDbConfig = validateDbConfig;
exports.getDbConfigInfo = getDbConfigInfo;
const dotenv_1 = __importDefault(require("dotenv"));
const path = __importStar(require("path"));
// .env 파일 경로 설정 (프로젝트 루트 디렉토리)
const envPath = path.resolve(__dirname, '../../.env');
dotenv_1.default.config({ path: envPath });
// 환경 변수 검증 함수
function validateEnvironmentVariables() {
    const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_PORT'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
        console.warn(`Warning: Missing required environment variables: ${missingVars.join(', ')}`);
        console.warn('Please create a .env file in the project root with the following variables:');
        console.warn('DB_HOST=your_server');
        console.warn('DB_USER=your_username');
        console.warn('DB_PASSWORD=your_password');
        console.warn('DB_NAME=your_database');
        console.warn('DB_PORT=1433');
    }
}
// 환경 변수 검증 실행
validateEnvironmentVariables();
exports.dbConfig = {
    server: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
    port: parseInt(process.env.DB_PORT || '31433', 10),
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true' || false,
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true' || true,
        enableArithAbort: true,
        requestTimeout: 30000, // 30초
        connectionTimeout: 30000, // 30초
        // 연결 안정성 향상을 위한 추가 설정
        maxRetriesOnTries: 3,
        packetSize: 4096,
        useUTC: true,
        // DNS 해석 문제 해결을 위한 설정
        serverName: process.env.DB_HOST || 'localhost',
    }
};
// 데이터베이스 연결 정보 유효성 검사
function validateDbConfig() {
    if (!exports.dbConfig.server || !exports.dbConfig.user || !exports.dbConfig.password || !exports.dbConfig.database) {
        console.error('Invalid database configuration. Please check your .env file.');
        return false;
    }
    return true;
}
// 데이터베이스 연결 정보 가져오기 (마스킹된 형태)
function getDbConfigInfo() {
    return `Server: ${exports.dbConfig.server}, Database: ${exports.dbConfig.database}, User: ${exports.dbConfig.user}, Port: ${exports.dbConfig.port}`;
}
// 기본 export로 dbConfig 제공
exports.default = exports.dbConfig;
//# sourceMappingURL=dbConfig.js.map