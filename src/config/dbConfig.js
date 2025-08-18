"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const dbConfig = {
    server: process.env.DB_HOST || '',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
    port: parseInt(process.env.DB_PORT || '0', 10),
    options: {
        encrypt: false,
        trustServerCertificate: true,
    }
};
module.exports = dbConfig;
//# sourceMappingURL=dbConfig.js.map