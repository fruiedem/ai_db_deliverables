import dotenv from "dotenv"
import * as path from 'path';

// .env 파일 경로 설정 (프로젝트 루트 디렉토리)
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

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

export const dbConfig = {
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
}

// 데이터베이스 연결 정보 유효성 검사
export function validateDbConfig(): boolean {
  if (!dbConfig.server || !dbConfig.user || !dbConfig.password || !dbConfig.database) {
    console.error('Invalid database configuration. Please check your .env file.');
    return false;
  }
  return true;
}

// 데이터베이스 연결 정보 가져오기 (마스킹된 형태)
export function getDbConfigInfo(): string {
  return `Server: ${dbConfig.server}, Database: ${dbConfig.database}, User: ${dbConfig.user}, Port: ${dbConfig.port}`;
}

// 기본 export로 dbConfig 제공
export default dbConfig;