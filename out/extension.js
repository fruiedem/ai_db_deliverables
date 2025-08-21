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
exports.activate = activate;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const mssql = __importStar(require("mssql"));
const dbConfig_1 = __importStar(require("./config/dbConfig"));
/******************** 기본 설정 및 변수 정의 ********************/
// DB 설정 정보 load 및 검증
if (!(0, dbConfig_1.validateDbConfig)()) {
    console.error('Database configuration is invalid. Please check your .env file.');
    vscode.window.showErrorMessage('Database configuration is invalid. Please check your .env file.');
}
// SP 리스트 : <map>
const spArray = [];
// 웹뷰 패널 관리
let currentPanel = undefined;
/******************** 웹뷰 기능 정의 ********************/
// 테이블 분석 웹뷰 표시 함수
async function showTableAnalysisWebview(tableName) {
    const column = vscode.ViewColumn.One;
    if (currentPanel) {
        currentPanel.reveal(column);
    }
    else {
        currentPanel = vscode.window.createWebviewPanel('tableAnalysis', '테이블 분석 결과', column, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        currentPanel.onDidDispose(() => {
            currentPanel = undefined;
        }, null, []);
    }
    // 웹뷰 HTML 내용 생성 (모든 테이블 정보 표시)
    const htmlContent = await generateTableAnalysisHTML();
    currentPanel.webview.html = htmlContent;
    // 웹뷰에서 메시지 수신 처리
    currentPanel.webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
            case 'refresh':
                vscode.window.showInformationMessage('새로고침 요청됨');
                const refreshedHtml = await generateTableAnalysisHTML();
                if (currentPanel) {
                    currentPanel.webview.html = refreshedHtml;
                }
                break;
            case 'showTableAnalysis':
                // 테이블 분석 요청은 웹뷰 내에서 JavaScript로 처리됨
                console.log(`테이블 분석 요청: ${message.tableName}`);
                break;
        }
    }, undefined, []);
}
// 테이블 분석 HTML 생성 함수
async function generateTableAnalysisHTML(tableName) {
    try {
        // spTable.txt와 spAIAnalysis.txt 파일 읽기
        const spTablePath = path.join(__dirname, '..', 'out', 'spTable.txt');
        const spAIAnalysisPath = path.join(__dirname, '..', 'out', 'spAIAnalysis.txt');
        console.log('=== 웹뷰 HTML 생성 시작 ===');
        console.log('spTablePath:', spTablePath);
        console.log('spAIAnalysisPath:', spAIAnalysisPath);
        let spTableContent = '';
        let spAIAnalysisContent = '';
        if (fs.existsSync(spTablePath)) {
            spTableContent = fs.readFileSync(spTablePath, 'utf8');
            console.log(`spTable.txt 파일 읽기 성공: ${spTableContent.length} 문자`);
        }
        else {
            console.error('spTable.txt 파일을 찾을 수 없습니다:', spTablePath);
        }
        if (fs.existsSync(spAIAnalysisPath)) {
            spAIAnalysisContent = fs.readFileSync(spAIAnalysisPath, 'utf8');
            console.log(`spAIAnalysis.txt 파일 읽기 성공: ${spAIAnalysisContent.length} 문자`);
        }
        else {
            console.error('spAIAnalysis.txt 파일을 찾을 수 없습니다:', spAIAnalysisPath);
        }
        // 테이블별 저장 프로시저 매핑 파싱
        console.log('=== 파싱 시작 ===');
        const tableProcedureMap = parseSpTableContent(spTableContent);
        // 저장 프로시저 분석 내용 파싱
        const procedureAnalysisMap = parseSpAIAnalysisContent(spAIAnalysisContent);
        console.log('=== 파싱 결과 요약 ===');
        console.log(`테이블-프로시저 매핑: ${Object.keys(tableProcedureMap).length}개 테이블`);
        console.log(`프로시저-분석 매핑: ${Object.keys(procedureAnalysisMap).length}개 프로시저`);
        // 모든 테이블과 프로시저 매핑 정보 로깅
        console.log('=== 전체 테이블-프로시저 매핑 정보 ===');
        for (const [tableNameKey, procedures] of Object.entries(tableProcedureMap)) {
            console.log(`테이블 "${tableNameKey}": ${procedures.length}개 프로시저`);
            procedures.forEach(procName => {
                const hasAnalysis = procedureAnalysisMap[procName] ? '있음' : '없음';
                console.log(`  - ${procName}: 분석 내용 ${hasAnalysis}`);
            });
        }
        // HTML 생성
        const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>테이블 분석 결과</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: #007acc;
            color: white;
            padding: 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            padding: 20px;
        }
        .table-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .table-card {
            background: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            padding: 15px;
            cursor: pointer;
            transition: all 0.2s ease;
            text-align: center;
        }
        .table-card:hover {
            border-color: #007acc;
            background: #e3f2fd;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,123,255,0.15);
        }
        .table-card.selected {
            border-color: #007acc;
            background: #e3f2fd;
        }
        .table-name {
            font-weight: bold;
            font-size: 16px;
            color: #007acc;
            margin-bottom: 8px;
        }
        .procedure-count {
            font-size: 14px;
            color: #666;
        }
        .analysis-content {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
        }
        .analysis-title {
            font-size: 20px;
            font-weight: bold;
            color: #007acc;
            margin-bottom: 15px;
            border-bottom: 2px solid #007acc;
            padding-bottom: 10px;
        }
        .procedure-analysis {
            background: white;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 15px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .procedure-analysis:hover {
            border-color: #007acc;
            background: #f8f9fa;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0,123,255,0.1);
        }
        .procedure-name {
            font-weight: bold;
            color: #495057;
            font-size: 16px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .procedure-name .expand-icon {
            font-size: 12px;
            color: #007acc;
            transition: transform 0.2s ease;
        }
        .procedure-name.expanded .expand-icon {
            transform: rotate(90deg);
        }
        .analysis-text {
            line-height: 1.6;
            color: #333;
            white-space: pre-wrap;
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease;
        }
        .analysis-text.expanded {
            max-height: 1000px;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #e9ecef;
        }
        .procedure-summary {
            color: #666;
            font-style: italic;
            font-size: 14px;
        }
        .no-data {
            text-align: center;
            color: #666;
            font-style: italic;
            padding: 40px;
        }
        .refresh-btn {
            background: #007acc;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            margin-bottom: 20px;
        }
        .refresh-btn:hover {
            background: #005a9e;
        }
        .search-box {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 6px;
            margin-bottom: 20px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>데이터베이스 테이블 분석 결과</h1>
        </div>
        <div class="content">
            <button class="refresh-btn" onclick="refreshData()"> 새로고침</button>
            <input type="text" class="search-box" placeholder="테이블명으로 검색..." onkeyup="filterTables(this.value)">
            
            <div class="table-list" id="tableList">
                ${generateTableCards(tableProcedureMap)}
            </div>
            
            <div id="analysisContent" class="analysis-content" style="display: none;">
                <div class="analysis-title" id="analysisTitle"></div>
                <div id="analysisDetails"></div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const tableProcedureMap = ${JSON.stringify(tableProcedureMap)};
        const procedureAnalysisMap = ${JSON.stringify(procedureAnalysisMap)};
        
        // 디버깅용 로그
        console.log('테이블-프로시저 매핑:', tableProcedureMap);
        console.log('프로시저 분석 매핑:', procedureAnalysisMap);
        console.log('파싱된 프로시저 개수:', Object.keys(procedureAnalysisMap).length);
        
        function showTableAnalysis(tableName) {
            // 모든 테이블 카드에서 선택 상태 제거
            document.querySelectorAll('.table-card').forEach(card => {
                card.classList.remove('selected');
            });
            
            // 선택된 테이블 카드에 선택 상태 추가
            const selectedCard = document.querySelector(\`[data-table="\${tableName}"]\`);
            if (selectedCard) {
                selectedCard.classList.add('selected');
            }
            
            // 분석 내용 표시
            const analysisContent = document.getElementById('analysisContent');
            const analysisTitle = document.getElementById('analysisTitle');
            const analysisDetails = document.getElementById('analysisDetails');
            
            analysisTitle.textContent = \` \${tableName} 테이블 분석 결과\`;
            
            const procedures = tableProcedureMap[tableName] || [];
            if (procedures.length > 0) {
                let detailsHtml = \`<p><strong>사용하는 저장 프로시저 (\${procedures.length}개):</strong></p>\`;
                
                procedures.forEach(procName => {
                    const analysis = procedureAnalysisMap[procName];
                    console.log(\`프로시저 \${procName} 매핑 확인: \${analysis ? '있음' : '없음'}\`);
                    
                    if (analysis) {
                        // 분석 내용의 첫 100자만 미리보기로 표시
                        const summary = analysis.length > 100 ? analysis.substring(0, 100) + '...' : analysis;
                        detailsHtml += \`
                            <div class="procedure-analysis" onclick="toggleProcedureAnalysis('\${procName}')">
                                <div class="procedure-name" id="proc-name-\${procName.replace(/[^a-zA-Z0-9]/g, '_')}">
                                    🔧 \${procName}
                                    <span class="expand-icon">▶</span>
                                </div>
                                <div class="procedure-summary">\${summary}</div>
                                <div class="analysis-text" id="proc-analysis-\${procName.replace(/[^a-zA-Z0-9]/g, '_')}">\${analysis}</div>
                            </div>
                        \`;
                    } else {
                        // 매핑 실패 시 디버깅 정보 추가
                        detailsHtml += \`
                            <div class="procedure-analysis">
                                <div class="procedure-name">
                                    🔧 \${procName}
                                </div>
                                <div class="procedure-summary">
                                    분석 내용이 없습니다. (매핑 실패)
                                    <br><small>사용 가능한 프로시저: \${Object.keys(procedureAnalysisMap).join(', ')}</small>
                                </div>
                            </div>
                        \`;
                    }
                });
                
                analysisDetails.innerHTML = detailsHtml;
            } else {
                analysisDetails.innerHTML = '<div class="no-data">이 테이블을 사용하는 저장 프로시저가 없습니다.</div>';
            }
            
            analysisContent.style.display = 'block';
            
            // VS Code에 메시지 전송
            vscode.postMessage({
                command: 'showTableAnalysis',
                tableName: tableName
            });
        }
        
        function filterTables(searchTerm) {
            const tableCards = document.querySelectorAll('.table-card');
            const searchLower = searchTerm.toLowerCase();
            
            tableCards.forEach(card => {
                const tableName = card.getAttribute('data-table');
                if (tableName && tableName.toLowerCase().includes(searchLower)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        }
        
        function refreshData() {
            vscode.postMessage({ command: 'refresh' });
        }
        
        function toggleProcedureAnalysis(procName) {
            const safeProcName = procName.replace(/[^a-zA-Z0-9]/g, '_');
            const procNameElement = document.getElementById(\`proc-name-\${safeProcName}\`);
            const analysisElement = document.getElementById(\`proc-analysis-\${safeProcName}\`);
            
            if (procNameElement && analysisElement) {
                const isExpanded = procNameElement.classList.contains('expanded');
                
                if (isExpanded) {
                    // 접기
                    procNameElement.classList.remove('expanded');
                    analysisElement.classList.remove('expanded');
                } else {
                    // 펼치기
                    procNameElement.classList.add('expanded');
                    analysisElement.classList.add('expanded');
                }
            }
        }
        
        // 페이지 로드 시 첫 번째 테이블 분석 표시 (선택사항)
        window.addEventListener('load', () => {
            const firstTable = Object.keys(tableProcedureMap)[0];
            if (firstTable) {
                showTableAnalysis(firstTable);
            }
        });
    </script>
</body>
</html>`;
        return html;
    }
    catch (error) {
        console.error('HTML 생성 중 오류:', error);
        return `
<!DOCTYPE html>
<html>
<head><title>오류</title></head>
<body>
    <h1>오류가 발생했습니다</h1>
    <p>${error}</p>
</body>
</html>`;
    }
}
// spTable.txt 내용 파싱 함수
function parseSpTableContent(content) {
    const tableProcedureMap = {};
    try {
        console.log('spTable.txt 파싱 시작...');
        console.log(`파일 크기: ${content.length} 문자`);
        // JSON 형식 파싱 시도
        const jsonStartIndex = content.indexOf('=== JSON Format ===');
        const jsonEndIndex = content.indexOf('=== Human Readable Format ===');
        console.log(`JSON 시작 인덱스: ${jsonStartIndex}`);
        console.log(`JSON 끝 인덱스: ${jsonEndIndex}`);
        if (jsonStartIndex !== -1) {
            let jsonContent = '';
            if (jsonEndIndex !== -1) {
                // JSON Format과 Human Readable Format 사이의 내용 추출
                jsonContent = content.substring(jsonStartIndex, jsonEndIndex);
            }
            else {
                // JSON Format부터 끝까지 추출
                jsonContent = content.substring(jsonStartIndex);
            }
            console.log(`JSON 콘텐츠 길이: ${jsonContent.length}`);
            // JSON 객체 부분만 추출 (중괄호 {} 사이의 내용)
            const jsonStart = jsonContent.indexOf('{');
            const jsonEnd = jsonContent.lastIndexOf('}');
            console.log(`JSON 객체 시작: ${jsonStart}, 끝: ${jsonEnd}`);
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                const jsonString = jsonContent.substring(jsonStart, jsonEnd + 1);
                console.log(`JSON 문자열 길이: ${jsonString.length}`);
                console.log(`JSON 문자열 미리보기: ${jsonString.substring(0, 200)}...`);
                try {
                    const parsedJson = JSON.parse(jsonString);
                    console.log(`JSON 파싱 성공! 키 개수: ${Object.keys(parsedJson).length}`);
                    // JSON 객체의 키-값 쌍을 tableProcedureMap에 복사
                    for (const [tableName, procedures] of Object.entries(parsedJson)) {
                        if (Array.isArray(procedures)) {
                            tableProcedureMap[tableName] = procedures;
                            console.log(`테이블 "${tableName}": ${procedures.length}개 프로시저 매핑`);
                        }
                    }
                    console.log(`JSON 파싱 성공: ${Object.keys(tableProcedureMap).length}개 테이블 발견`);
                    console.log('파싱된 테이블 목록:', Object.keys(tableProcedureMap));
                    return tableProcedureMap;
                }
                catch (jsonError) {
                    console.error('JSON 파싱 에러:', jsonError);
                }
            }
            else {
                console.log('JSON 객체 경계를 찾을 수 없음');
            }
        }
        else {
            console.log('JSON Format 섹션을 찾을 수 없음');
        }
        // JSON 파싱 실패 시 기존 Human Readable Format 파싱 방식 사용
        console.log('JSON 파싱 실패, Human Readable Format으로 파싱 시도');
        const lines = content.split('\n');
        let currentTable = '';
        for (const line of lines) {
            if (line.startsWith('--- ') && line.endsWith(' ---')) {
                currentTable = line.replace(/^--- | ---$/g, '').trim();
                tableProcedureMap[currentTable] = [];
                console.log(`Human readable 테이블 발견: ${currentTable}`);
            }
            else if (line.startsWith('Used by procedures:') && currentTable) {
                const procedures = line.replace('Used by procedures:', '').trim().split(',');
                tableProcedureMap[currentTable] = procedures.map(proc => proc.trim()).filter(proc => proc.length > 0);
                console.log(`테이블 "${currentTable}": ${tableProcedureMap[currentTable].length}개 프로시저`);
            }
        }
        console.log(`Human readable 파싱 결과: ${Object.keys(tableProcedureMap).length}개 테이블`);
    }
    catch (error) {
        console.error('spTable.txt 파싱 오류:', error);
    }
    return tableProcedureMap;
}
// spAIAnalysis.txt 내용 파싱 함수
function parseSpAIAnalysisContent(content) {
    const procedureAnalysisMap = {};
    try {
        console.log('=== spAIAnalysis.txt 파싱 시작 ===');
        console.log(`파일 크기: ${content.length} 문자`);
        // 파일 내용의 처음 200자와 끝 200자 확인
        console.log(`파일 시작 부분: "${content.substring(0, 200)}"`);
        console.log(`파일 끝 부분: "${content.substring(content.length - 200)}"`);
        const lines = content.split('\n');
        console.log(`총 라인 수: ${lines.length}`);
        let currentProcedure = '';
        let analysisText = '';
        let procedureCount = 0;
        // 정규식을 사용하여 더 정확한 패턴 매칭
        const procedurePattern = /^---\*\s*(.+?)\s*\*---$/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            // ---* 프로시저명 *--- 형태의 줄을 찾아서 프로시저명 추출
            const match = trimmedLine.match(procedurePattern);
            if (match) {
                // 이전 프로시저 분석 저장
                if (currentProcedure && analysisText.trim()) {
                    procedureAnalysisMap[currentProcedure] = analysisText.trim();
                    console.log(`[${procedureCount}] 파싱 완료: ${currentProcedure} - ${analysisText.trim().substring(0, 50)}...`);
                }
                // 새 프로시저 시작
                currentProcedure = match[1].trim(); // 정규식 그룹에서 프로시저명 추출
                analysisText = '';
                procedureCount++;
                console.log(`[${procedureCount}] 새 프로시저 시작: ${currentProcedure}`);
                console.log(`[${procedureCount}] 원본 라인: "${trimmedLine}"`);
                console.log(`[${procedureCount}] 추출된 프로시저명: "${currentProcedure}"`);
            }
            else if (currentProcedure && trimmedLine) {
                // 프로시저명이 설정된 후에는 모든 내용을 분석 텍스트로 수집
                // 다음 프로시저 구분자(---* *---)가 나올 때까지 모든 내용 포함
                analysisText += line + '\n';
            }
        }
        // 마지막 프로시저 분석 저장
        if (currentProcedure && analysisText.trim()) {
            procedureAnalysisMap[currentProcedure] = analysisText.trim();
            console.log(`[마지막] 파싱 완료: ${currentProcedure} - ${analysisText.trim().substring(0, 50)}...`);
        }
        console.log(`=== 파싱 결과 요약 ===`);
        console.log(`총 ${Object.keys(procedureAnalysisMap).length}개 프로시저 분석 내용 파싱 완료`);
        console.log('파싱된 프로시저 목록:', Object.keys(procedureAnalysisMap));
        // 각 프로시저별 매핑 상태 상세 출력
        for (const [procName, analysis] of Object.entries(procedureAnalysisMap)) {
            console.log(`매핑 확인: ${procName} -> ${analysis.substring(0, 100)}...`);
        }
        // 파싱 실패한 경우 디버깅 정보
        if (Object.keys(procedureAnalysisMap).length === 0) {
            console.log('=== 파싱 실패 디버깅 ===');
            console.log('구분자 패턴 검색 결과:');
            const delimiterLines = lines.filter(line => line.includes('---*') || line.includes('*---'));
            console.log('구분자 포함 라인들:', delimiterLines);
            // 정규식 패턴 테스트
            console.log('정규식 패턴 테스트:');
            lines.forEach((line, index) => {
                const match = line.trim().match(procedurePattern);
                if (match) {
                    console.log(`라인 ${index + 1}: "${line}" -> 매치: "${match[1]}"`);
                }
            });
        }
    }
    catch (error) {
        console.error('spAIAnalysis.txt 파싱 오류:', error);
    }
    return procedureAnalysisMap;
}
// 테이블 카드 HTML 생성 함수
function generateTableCards(tableProcedureMap) {
    const tables = Object.keys(tableProcedureMap);
    if (tables.length === 0) {
        return '<div class="no-data">테이블 정보를 찾을 수 없습니다.</div>';
    }
    return tables.map(tableName => {
        const procedures = tableProcedureMap[tableName];
        const procedureCount = procedures ? procedures.length : 0;
        return `
      <div class="table-card" data-table="${tableName}" onclick="showTableAnalysis('${tableName}')">
        <div class="table-name">${tableName}</div>
        <div class="procedure-count">${procedureCount}개 프로시저 사용</div>
      </div>
    `;
    }).join('');
}
/******************** VSCode Commands 정의 ********************/
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "visualdb" is now active!');
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    const helloWorld = vscode.commands.registerCommand('wf-visualdb.helloWorld', () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        console.log('helloWorld');
        console.log('dbConfig: ' + JSON.stringify(dbConfig_1.default)); // db 정보 load 확인용
        vscode.window.showInformationMessage('Hello World from visualdb!');
    });
    context.subscriptions.push(helloWorld);
    // 웹뷰 호출 커맨드 추가
    const showTableAnalysisWebviewCommand = vscode.commands.registerCommand('wf-visualdb.showTableAnalysisWebview', async () => {
        // 테이블 선택 없이 바로 모든 테이블과 프로시저 매핑 정보를 보여주는 웹뷰 실행
        await showTableAnalysisWebview();
    });
    context.subscriptions.push(showTableAnalysisWebviewCommand);
    // stored procedure 정보 가져오는 커맨드
    const SpInfo = vscode.commands.registerCommand('wf-visualdb.getSpInfo', async () => {
        console.log('getSpInfo');
        vscode.window.showInformationMessage('getSpInfo ran!');
        const schemaName = 'dbo';
        const SpInfo = await getSpInfo(schemaName);
    });
    context.subscriptions.push(SpInfo);
    // 데이터베이스 연결 상태 확인 커맨드
    const checkDbConnection = vscode.commands.registerCommand('wf-visualdb.checkDbConnection', async () => {
        console.log('checkDbConnection');
        await checkDatabaseConnection();
    });
    context.subscriptions.push(checkDbConnection);
    // 테이블 리스트 조회 커맨드
    const getTableListCommand = vscode.commands.registerCommand('wf-visualdb.getTableList', async () => {
        console.log('getTableList');
        await getTableList();
    });
    context.subscriptions.push(getTableListCommand);
    // AI를 사용한 저장 프로시저 분석 커맨드
    const analyzeSpWithAICommand = vscode.commands.registerCommand('wf-visualdb.analyzeSpWithAI', async () => {
        console.log('analyzeSpWithAI');
        await analyzeStoredProceduresWithAI();
    });
    context.subscriptions.push(analyzeSpWithAICommand);
    // 테이블 속성 분석 커맨드
    const analyzeTableAttributesCommand = vscode.commands.registerCommand('wf-visualdb.analyzeTableAttributes', async () => {
        console.log('analyzeTableAttributes');
        await analyzeTableAttributes();
    });
    context.subscriptions.push(analyzeTableAttributesCommand);
    // 테이블 Mermaid 코드 생성 커맨드
    const generateTableMermaidCommand = vscode.commands.registerCommand('wf-visualdb.generateTableMermaid', async () => {
        console.log('generateTableMermaid');
        await generateTableMermaidWithAI();
    });
    context.subscriptions.push(generateTableMermaidCommand);
    // 테이블 분석 웹뷰 표시 커맨드
    const showTableAnalysisCommand = vscode.commands.registerCommand('wf-visualdb.showTableAnalysis', async () => {
        console.log('showTableAnalysis');
        await showTableAnalysisWebview();
    });
    context.subscriptions.push(showTableAnalysisCommand);
}
/******************** 기능 정의 ********************/
// 데이터베이스 연결 상태 확인
async function checkDatabaseConnection() {
    if (!(0, dbConfig_1.validateDbConfig)()) {
        vscode.window.showErrorMessage('Database configuration is invalid. Please check your .env file.');
        return;
    }
    let pool = null;
    try {
        vscode.window.showInformationMessage('Testing database connection...');
        console.log('Testing connection with config:', (0, dbConfig_1.getDbConfigInfo)());
        // 데이터베이스 연결
        pool = await mssql.connect(dbConfig_1.default);
        console.log('pool:', pool);
        // VS Code Output 패널에 연결 성공 정보 출력
        const outputChannel = vscode.window.createOutputChannel('Database Results');
        outputChannel.show();
        outputChannel.appendLine('=== Database Connection ===');
        outputChannel.appendLine(`Connected successfully at: ${new Date().toLocaleString()}`);
        outputChannel.appendLine(`Server: ${dbConfig_1.default.server}:${dbConfig_1.default.port}`);
        outputChannel.appendLine(`Database: ${dbConfig_1.default.database}`);
        // 간단한 쿼리로 연결 테스트
        const result = await pool.request().query('SELECT 1 as test');
        console.log('Test query result:', result.recordsets);
    }
    catch (err) {
        console.error('Database connection failed:', err);
        vscode.window.showErrorMessage(`Database connection failed: ${err}`);
    }
    finally {
        if (pool) {
            await pool.close();
        }
    }
}
// 저장 프로시저 정보 가져오기 ==> ProcedureDefinition 참고
async function getSpInfo(schemaName) {
    const query = `
        SELECT o.name AS ProcedureName, m.definition AS ProcedureDefinition
        FROM sys.objects o
        JOIN sys.sql_modules m ON o.object_id = m.object_id
        WHERE o.type = 'P';
        `;
    let pool = null;
    try {
        // 데이터베이스 연결
        pool = await mssql.connect(dbConfig_1.default);
        console.log('pool:', pool);
        // VS Code Output 패널에 연결 성공 정보 출력
        const outputChannel = vscode.window.createOutputChannel('Database Results');
        outputChannel.show();
        outputChannel.appendLine('=== Database Connection ===');
        outputChannel.appendLine(`Connected successfully at: ${new Date().toLocaleString()}`);
        outputChannel.appendLine(`Server: ${dbConfig_1.default.server}:${dbConfig_1.default.port}`);
        outputChannel.appendLine(`Database: ${dbConfig_1.default.database}`);
        // 매개변수 전달 및 쿼리 실행
        const result = await pool.request()
            // .input('schemaName', mssql.VarChar, schemaName) // 매개변수 전달
            .query(query);
        // VS Code Output 패널에 결과 출력
        outputChannel.appendLine('\n=== Stored Procedure Query Results ===');
        outputChannel.appendLine(`Query executed at: ${new Date().toLocaleString()}`);
        // 타입 안전한 결과 처리
        if (result.recordsets && Array.isArray(result.recordsets) && result.recordsets.length > 0) {
            const firstRecordset = result.recordsets[0];
            if (firstRecordset.length > 0) {
                // 파일로 저장할 내용을 위한 배열
                const fileContent = [];
                fileContent.push('=== Stored Procedure Information ===');
                fileContent.push(`Generated at: ${new Date().toLocaleString()}`);
                fileContent.push(`Total procedures: ${firstRecordset.length}`);
                fileContent.push('');
                firstRecordset.forEach((recordset, index) => {
                    // Output 패널에 표시
                    outputChannel.appendLine(JSON.stringify(recordset, null, 2));
                    // 파일 저장용 내용 추가
                    fileContent.push(`--- Procedure ${index + 1} ---`);
                    // ProcedureDefinition의 개행을 실제 개행으로 변환
                    let definition = recordset.ProcedureDefinition || '';
                    if (definition.includes('\\r\\n')) {
                        definition = definition.replace(/\\r\\n/g, '\n');
                    }
                    if (definition.includes('\\n')) {
                        definition = definition.replace(/\\n/g, '\n');
                    }
                    fileContent.push(`ProcedureName: ${recordset.ProcedureName || 'Unknown'}`);
                    fileContent.push(`ProcedureDefinition:`);
                    fileContent.push(definition);
                    fileContent.push('');
                });
                // 파일로 저장
                try {
                    const fs = require('fs');
                    const path = require('path');
                    const outDir = path.join(__dirname, '..', 'out');
                    const filePath = path.join(outDir, 'spInfo.txt');
                    // out 디렉토리가 없으면 생성
                    if (!fs.existsSync(outDir)) {
                        fs.mkdirSync(outDir, { recursive: true });
                    }
                    // 기존 파일이 존재하면 삭제
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        outputChannel.appendLine('Existing file removed');
                    }
                    // 파일에 내용 쓰기
                    fs.writeFileSync(filePath, fileContent.join('\n'), 'utf8');
                    outputChannel.appendLine(`\n=== File Saved ===`);
                    outputChannel.appendLine(`File saved to: ${filePath}`);
                    vscode.window.showInformationMessage(`저장 프로시저 정보가 ${filePath}에 저장되었습니다.`);
                    // 저장 프로시저 정의에서 테이블명 추출하여 매핑 파일 생성
                    await createProcedureTableMapping();
                    await createSpTableMapping(); // spTable.txt 생성
                }
                catch (fileErr) {
                    console.error('File save error:', fileErr);
                    outputChannel.appendLine(`\n=== File Save Error ===`);
                    outputChannel.appendLine(`Error saving file: ${fileErr}`);
                    vscode.window.showErrorMessage(`파일 저장 중 오류가 발생했습니다: ${fileErr}`);
                }
            }
            else {
                outputChannel.appendLine('No recordsets found');
            }
        }
        // 콘솔에도 출력 (디버깅용)
        console.log('Result:', result.recordsets);
    }
    catch (err) {
        console.error('SQL Error:', err);
        // VS Code Output 패널에 오류 출력
        const outputChannel = vscode.window.createOutputChannel('Database Results');
        outputChannel.show();
        outputChannel.appendLine('=== Database Error ===');
        outputChannel.appendLine(`Error occurred at: ${new Date().toLocaleString()}`);
        outputChannel.appendLine(`Error details: ${err}`);
        // 사용자에게 오류 알림
        if (err instanceof Error) {
            vscode.window.showErrorMessage(`Database error: ${err.message}`);
        }
        else {
            vscode.window.showErrorMessage(`Database error: ${err}`);
        }
    }
    finally {
        // 연결 풀 닫기
        if (pool) {
            await pool.close();
        }
    }
}
// 저장 프로시저 정의에서 테이블명 추출하여 매핑 파일 생성
async function createProcedureTableMapping() {
    try {
        const fs = require('fs');
        const path = require('path');
        const spInfoPath = path.join(__dirname, '..', 'out', 'spInfo.txt');
        const mappingPath = path.join(__dirname, '..', 'out', 'procedureDefMap.txt');
        // spInfo.txt 파일이 존재하는지 확인
        if (!fs.existsSync(spInfoPath)) {
            console.log('spInfo.txt file not found. Please run getSpInfo first.');
            return;
        }
        // 파일 내용 읽기
        const fileContent = fs.readFileSync(spInfoPath, 'utf8');
        // 저장 프로시저 정보 파싱
        const procedures = [];
        const lines = fileContent.split('\n');
        let currentProc = null;
        for (const line of lines) {
            if (line.startsWith('--- Procedure')) {
                if (currentProc) {
                    procedures.push(currentProc);
                }
                currentProc = { name: '', definition: '' };
            }
            else if (line.includes('"ProcedureName"')) {
                const match = line.match(/"ProcedureName":\s*"([^"]+)"/);
                if (match && currentProc) {
                    currentProc.name = match[1];
                }
            }
            else if (line.includes('"ProcedureDefinition"')) {
                if (currentProc) {
                    // ProcedureDefinition 내용 수집 (여러 줄에 걸쳐 있을 수 있음)
                    let definition = line.replace(/.*"ProcedureDefinition":\s*/, '');
                    if (definition.endsWith(',')) {
                        definition = definition.slice(0, -1);
                    }
                    currentProc.definition = definition;
                }
            }
            else if (currentProc && currentProc.definition && line.trim() && !line.startsWith('---') && !line.startsWith('===')) {
                // ProcedureDefinition의 연속 라인 처리
                let lineContent = line.trim();
                if (lineContent.endsWith(',')) {
                    lineContent = lineContent.slice(0, -1);
                }
                currentProc.definition += ' ' + lineContent;
            }
        }
        // 마지막 프로시저 추가
        if (currentProc && currentProc.name) {
            procedures.push(currentProc);
        }
        // 테이블명 추출 및 매핑 생성
        const mappingContent = [];
        mappingContent.push('=== Procedure to Table Mapping ===');
        mappingContent.push(`Generated at: ${new Date().toLocaleString()}`);
        mappingContent.push(`Total procedures analyzed: ${procedures.length}`);
        mappingContent.push('');
        for (const proc of procedures) {
            if (proc.name && proc.definition) {
                // 테이블명 추출 (FROM, JOIN, UPDATE, INSERT, DELETE 등의 키워드 뒤에 오는 테이블명)
                // const tableMatches = proc.definition.match(/(?:FROM|JOIN|UPDATE|INSERT\s+INTO|DELETE\s+FROM)\s+\[?([a-zA-Z_][a-zA-Z0-9_]*\.?[a-zA-Z_][a-zA-Z0-9_]*)\]?/gi);
                const tableMatches = proc.definition.match(/(?:FROM|UPDATE|INSERT\s+INTO|DELETE\s+FROM)\s+\[?([a-zA-Z_][a-zA-Z0-9_]*\.?[a-zA-Z_][a-zA-Z0-9_]*)\]?/gi);
                const tables = new Set();
                if (tableMatches) {
                    tableMatches.forEach(match => {
                        // let tableName = match.replace(/(?:FROM|JOIN|UPDATE|INSERT\s+INTO|DELETE\s+FROM)\s+\[?([a-zA-Z_][a-zA-Z0-9_]*\.?[a-zA-Z_][a-zA-Z0-9_]*)\]?/i, '$1');
                        let tableName = match.replace(/(?:FROM|UPDATE|INSERT\s+INTO|DELETE\s+FROM)\s+\[?([a-zA-Z_][a-zA-Z0-9_]*\.?[a-zA-Z_][a-zA-Z0-9_]*)\]?/i, '$1');
                        if (tableName && tableName.length > 0) {
                            // 스키마명.테이블명 형태에서 테이블명만 추출
                            if (tableName.includes('.')) {
                                tableName = tableName.split('.')[1];
                            }
                            tables.add(tableName);
                        }
                    });
                }
                // 매핑 정보 추가
                mappingContent.push(`--- ${proc.name} ---`);
                if (tables.size > 0) {
                    mappingContent.push(`Tables: ${Array.from(tables).join(', ')}`);
                }
                else {
                    mappingContent.push('Tables: No tables identified');
                }
                mappingContent.push('');
            }
        }
        // 기존 매핑 파일이 있으면 삭제
        if (fs.existsSync(mappingPath)) {
            fs.unlinkSync(mappingPath);
        }
        // 매핑 파일 생성
        fs.writeFileSync(mappingPath, mappingContent.join('\n'), 'utf8');
        console.log(`Procedure table mapping created: ${mappingPath}`);
    }
    catch (err) {
        console.error('Error creating procedure table mapping:', err);
    }
}
// spInfo.txt를 읽고 Procedure별로 관련 테이블명을 추출하여 spTable.txt로 정리
async function createSpTableMapping() {
    try {
        const fs = require('fs');
        const path = require('path');
        const spInfoPath = path.join(__dirname, '..', 'out', 'spInfo.txt');
        const spTablePath = path.join(__dirname, '..', 'out', 'spTable.txt');
        // spInfo.txt 파일이 존재하는지 확인
        if (!fs.existsSync(spInfoPath)) {
            console.log('spInfo.txt file not found. Please run getSpInfo first.');
            return;
        }
        // 파일 내용 읽기
        const fileContent = fs.readFileSync(spInfoPath, 'utf8');
        // 저장 프로시저 정보 파싱 (새로운 형식에 맞게)
        const procedures = [];
        const lines = fileContent.split('\n');
        let currentProc = null;
        let isReadingDefinition = false;
        for (const line of lines) {
            if (line.startsWith('--- Procedure')) {
                if (currentProc) {
                    procedures.push(currentProc);
                }
                currentProc = { name: '', definition: '' };
                isReadingDefinition = false;
            }
            else if (line.startsWith('ProcedureName:')) {
                if (currentProc) {
                    currentProc.name = line.replace('ProcedureName:', '').trim();
                }
            }
            else if (line.startsWith('ProcedureDefinition:')) {
                isReadingDefinition = true;
            }
            else if (isReadingDefinition && currentProc && line.trim() && !line.startsWith('---') && !line.startsWith('===')) {
                // ProcedureDefinition 내용 수집
                if (currentProc.definition) {
                    currentProc.definition += ' ' + line.trim();
                }
                else {
                    currentProc.definition = line.trim();
                }
            }
        }
        // 마지막 프로시저 추가
        if (currentProc && currentProc.name) {
            procedures.push(currentProc);
        }
        // 테이블명 추출 및 정리
        const tableContent = [];
        tableContent.push('=== Stored Procedure Table Mapping ===');
        tableContent.push(`Generated at: ${new Date().toLocaleString()}`);
        tableContent.push(`Total procedures analyzed: ${procedures.length}`);
        tableContent.push('');
        // 모든 테이블을 수집하여 중복 제거
        const allTables = new Set();
        const procedureTableMap = new Map();
        for (const proc of procedures) {
            if (proc.name && proc.definition) {
                // 테이블명 추출 (FROM, JOIN, UPDATE, INSERT, DELETE 등의 키워드)
                const tableMatches = proc.definition.match(/(?:FROM|JOIN|UPDATE|INSERT\s+INTO|DELETE\s+FROM)\s+\[?([a-zA-Z_][a-zA-Z0-9_]*\.?[a-zA-Z_][a-zA-Z0-9_]*)\]?/gi);
                const tables = new Set();
                if (tableMatches) {
                    tableMatches.forEach(match => {
                        let tableName = match.replace(/(?:FROM|JOIN|UPDATE|INSERT\s+INTO|DELETE\s+FROM)\s+\[?([a-zA-Z_][a-zA-Z0-9_]*\.?[a-zA-Z_][a-zA-Z0-9_]*)\]?/i, '$1');
                        if (tableName && tableName.length > 0) {
                            // 스키마명.테이블명 형태에서 테이블명만 추출
                            if (tableName.includes('.')) {
                                tableName = tableName.split('.')[1];
                            }
                            tables.add(tableName);
                            allTables.add(tableName);
                        }
                    });
                }
                // 프로시저별 테이블 매핑 저장
                procedureTableMap.set(proc.name, Array.from(tables));
            }
        }
        // 테이블별로 사용하는 프로시저 정리
        tableContent.push('=== Table Usage Summary ===');
        tableContent.push(`Total unique tables: ${allTables.size}`);
        tableContent.push('');
        const sortedTables = Array.from(allTables).sort();
        for (const table of sortedTables) {
            const usingProcedures = [];
            procedureTableMap.forEach((tables, procName) => {
                if (tables.includes(table)) {
                    usingProcedures.push(procName);
                }
            });
            tableContent.push(`--- ${table} ---`);
            tableContent.push(`Used by procedures: ${usingProcedures.join(', ')}`);
            tableContent.push(`Total procedures: ${usingProcedures.length}`);
            tableContent.push('');
        }
        // 기존 파일이 있으면 삭제
        if (fs.existsSync(spTablePath)) {
            fs.unlinkSync(spTablePath);
        }
        // 파일 생성
        fs.writeFileSync(spTablePath, tableContent.join('\n'), 'utf8');
        console.log(`Stored procedure table mapping created: ${spTablePath}`);
    }
    catch (err) {
        console.error('Error creating sp table mapping:', err);
    }
}
// 테이블 리스트를 쿼리하는 함수
async function getTableList() {
    const query = `
        SELECT
          s.name AS SchemaName,
          t.name AS TableName
        FROM sys.tables t
        INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
        GROUP BY s.name, t.name
        ORDER BY s.name, t.name;
      `;
    let pool = null;
    try {
        // 데이터베이스 연결
        pool = await mssql.connect(dbConfig_1.default);
        console.log('Database connected for table list query');
        // VS Code Output 패널에 연결 성공 정보 출력
        const outputChannel = vscode.window.createOutputChannel('Database Results');
        outputChannel.show();
        outputChannel.appendLine('=== Database Connection ===');
        outputChannel.appendLine(`Connected successfully at: ${new Date().toLocaleString()}`);
        outputChannel.appendLine(`Server: ${dbConfig_1.default.server}:${dbConfig_1.default.port}`);
        outputChannel.appendLine(`Database: ${dbConfig_1.default.database}`);
        // 쿼리 실행
        const result = await pool.request().query(query);
        // VS Code Output 패널에 결과 출력
        outputChannel.appendLine('\n=== Table List Query Results ===');
        outputChannel.appendLine(`Query executed at: ${new Date().toLocaleString()}`);
        // 타입 안전한 결과 처리
        if (result.recordsets && Array.isArray(result.recordsets) && result.recordsets.length > 0) {
            const firstRecordset = result.recordsets[0];
            if (firstRecordset.length > 0) {
                // 파일로 저장할 내용을 위한 배열
                const fileContent = [];
                fileContent.push('=== Database Table Information ===');
                fileContent.push(`Generated at: ${new Date().toLocaleString()}`);
                fileContent.push(`Server: ${dbConfig_1.default.server}:${dbConfig_1.default.port}`);
                fileContent.push(`Database: ${dbConfig_1.default.database}`);
                fileContent.push(`Total tables: ${firstRecordset.length}`);
                fileContent.push('');
                // 테이블 정보를 스키마별로 그룹화
                const schemaGroups = new Map();
                firstRecordset.forEach((table) => {
                    const schemaName = table.SchemaName || 'Unknown';
                    if (!schemaGroups.has(schemaName)) {
                        schemaGroups.set(schemaName, []);
                    }
                    schemaGroups.get(schemaName).push(table);
                });
                // 스키마별로 정렬하여 출력
                const sortedSchemas = Array.from(schemaGroups.keys()).sort();
                for (const schemaName of sortedSchemas) {
                    const tables = schemaGroups.get(schemaName);
                    outputChannel.appendLine(`\n--- Schema: ${schemaName} (${tables.length} tables) ---`);
                    fileContent.push(`\n--- Schema: ${schemaName} (${tables.length} tables) ---`);
                    // 테이블별로 정렬하여 출력
                    const sortedTables = tables.sort((a, b) => a.TableName.localeCompare(b.TableName));
                    sortedTables.forEach((table) => {
                        const tableInfo = `${table.TableName}`;
                        outputChannel.appendLine(tableInfo);
                        fileContent.push(tableInfo);
                    });
                }
                // 파일로 저장
                try {
                    const fs = require('fs');
                    const path = require('path');
                    const outDir = path.join(__dirname, '..', 'out');
                    const filePath = path.join(outDir, 'tableList.txt');
                    // out 디렉토리가 없으면 생성
                    if (!fs.existsSync(outDir)) {
                        fs.mkdirSync(outDir, { recursive: true });
                    }
                    // 기존 파일이 존재하면 삭제
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        outputChannel.appendLine('Existing file removed');
                    }
                    // 파일에 내용 쓰기
                    fs.writeFileSync(filePath, fileContent.join('\n'), 'utf8');
                    outputChannel.appendLine(`\n=== File Saved ===`);
                    outputChannel.appendLine(`File saved to: ${filePath}`);
                    vscode.window.showInformationMessage(`테이블 리스트가 ${filePath}에 저장되었습니다.`);
                    // spTable.txt 파일 정리 (존재하지 않는 테이블 제거)
                    await cleanSpTableFile();
                }
                catch (fileErr) {
                    console.error('File save error:', fileErr);
                    outputChannel.appendLine(`\n=== File Save Error ===`);
                    outputChannel.appendLine(`Error saving file: ${fileErr}`);
                    vscode.window.showErrorMessage(`파일 저장 중 오류가 발생했습니다: ${fileErr}`);
                }
            }
            else {
                outputChannel.appendLine('No tables found');
            }
        }
        else {
            outputChannel.appendLine('No recordsets found');
        }
        // 콘솔에도 출력 (디버깅용)
        console.log('Table list result:', result.recordsets);
    }
    catch (err) {
        console.error('Table list query error:', err);
        // VS Code Output 패널에 오류 출력
        const outputChannel = vscode.window.createOutputChannel('Database Results');
        outputChannel.show();
        outputChannel.appendLine('=== Database Error ===');
        outputChannel.appendLine(`Error occurred at: ${new Date().toLocaleString()}`);
        outputChannel.appendLine(`Error details: ${err}`);
        // 사용자에게 오류 알림
        if (err instanceof Error) {
            vscode.window.showErrorMessage(`Database error: ${err.message}`);
        }
        else {
            vscode.window.showErrorMessage(`Database error: ${err}`);
        }
    }
    finally {
        // 연결 풀 닫기
        if (pool) {
            try {
                await pool.close();
                console.log('Database connection closed');
            }
            catch (closeErr) {
                console.error('Error closing connection:', closeErr);
            }
        }
    }
}
// spTable.txt 파일에서 존재하지 않는 테이블 정보를 제거하는 함수
async function cleanSpTableFile() {
    try {
        const fs = require('fs');
        const path = require('path');
        const spTablePath = path.join(__dirname, '..', 'out', 'spTable.txt');
        const tableListPath = path.join(__dirname, '..', 'out', 'tableList.txt');
        // spTable.txt 파일이 존재하는지 확인
        if (!fs.existsSync(spTablePath)) {
            console.log('spTable.txt file not found. Cannot clean.');
            return;
        }
        // tableList.txt 파일이 존재하는지 확인
        if (!fs.existsSync(tableListPath)) {
            console.log('tableList.txt file not found. Cannot clean.');
            return;
        }
        // spTable.txt 파일 내용 읽기
        const spTableContent = fs.readFileSync(spTablePath, 'utf8');
        const spTableLines = spTableContent.split('\n');
        // tableList.txt 파일 내용 읽기
        const tableListContent = fs.readFileSync(tableListPath, 'utf8');
        const tableListLines = tableListContent.split('\n');
        // tableList.txt에서 실제 존재하는 테이블명 수집
        const existingTables = new Set();
        for (const line of tableListLines) {
            if (line.trim() && !line.startsWith('---') && !line.startsWith('===') && !line.startsWith('Generated') && !line.startsWith('Server') && !line.startsWith('Database') && !line.startsWith('Total')) {
                // 테이블명만 추출 (스키마 정보 제거)
                const tableName = line.trim();
                if (tableName && !tableName.includes('(') && !tableName.includes(')')) {
                    existingTables.add(tableName);
                }
            }
        }
        // spTable.txt에서 테이블별로 사용하는 프로시저 정보를 수집
        const tableProcedureMap = new Map();
        let currentTable = '';
        let currentProcedures = [];
        let currentTotalProcedures = 0;
        for (const line of spTableLines) {
            if (line.startsWith('--- ') && line.endsWith(' ---')) {
                // 이전 테이블 정보 저장
                if (currentTable && currentProcedures.length > 0) {
                    tableProcedureMap.set(currentTable, {
                        procedures: [...currentProcedures],
                        totalProcedures: currentTotalProcedures
                    });
                }
                // 새 테이블 시작
                currentTable = line.replace(/^--- | ---$/g, '').trim();
                currentProcedures = [];
                currentTotalProcedures = 0;
            }
            else if (line.startsWith('Used by procedures:')) {
                const procNames = line.replace('Used by procedures:', '').trim().split(',');
                currentProcedures = procNames.map((proc) => proc.trim()).filter((proc) => proc.length > 0);
            }
            else if (line.startsWith('Total procedures:')) {
                const totalMatch = line.match(/Total procedures: (\d+)/);
                if (totalMatch) {
                    currentTotalProcedures = parseInt(totalMatch[1]);
                }
            }
        }
        // 마지막 테이블 정보 저장
        if (currentTable && currentProcedures.length > 0) {
            tableProcedureMap.set(currentTable, {
                procedures: [...currentProcedures],
                totalProcedures: currentTotalProcedures
            });
        }
        // 새로운 spTable.txt 내용 생성 (존재하는 테이블만 포함)
        const newSpTableLines = [];
        newSpTableLines.push('=== Stored Procedure Table Mapping ===');
        newSpTableLines.push(`Generated at: ${new Date().toLocaleString()}`);
        newSpTableLines.push(`Total procedures analyzed: ${Array.from(tableProcedureMap.values()).reduce((sum, info) => sum + info.totalProcedures, 0)}`);
        newSpTableLines.push('');
        // JSON 형식으로 테이블-프로시저 매핑 생성
        const tableProcedureMapping = {};
        const existingTablesArray = Array.from(existingTables).sort();
        for (const table of existingTablesArray) {
            const tableInfo = tableProcedureMap.get(table);
            if (tableInfo) {
                tableProcedureMapping[table] = tableInfo.procedures;
            }
        }
        // JSON 형태로 출력
        newSpTableLines.push('=== JSON Format ===');
        newSpTableLines.push(JSON.stringify(tableProcedureMapping, null, 2));
        newSpTableLines.push('');
        // 사람이 읽기 쉬운 형태로도 출력
        newSpTableLines.push('=== Human Readable Format ===');
        for (const table of existingTablesArray) {
            const tableInfo = tableProcedureMap.get(table);
            if (tableInfo) {
                newSpTableLines.push(`--- ${table} ---`);
                newSpTableLines.push(`Used by procedures: ${tableInfo.procedures.join(', ')}`);
                newSpTableLines.push(`Total procedures: ${tableInfo.totalProcedures}`);
                newSpTableLines.push('');
            }
        }
        // 파일 생성
        if (newSpTableLines.length > 0) {
            const cleanedSpTablePath = path.join(__dirname, '..', 'out', 'spTable.txt');
            fs.writeFileSync(cleanedSpTablePath, newSpTableLines.join('\n'), 'utf8');
            console.log(`Cleaned spTable.txt: ${cleanedSpTablePath}`);
            // JSON 파일도 별도로 생성
            const jsonFilePath = path.join(__dirname, '..', 'out', 'spTableMapping.json');
            if (fs.existsSync(jsonFilePath)) {
                fs.unlinkSync(jsonFilePath);
            }
            fs.writeFileSync(jsonFilePath, JSON.stringify(tableProcedureMapping, null, 2), 'utf8');
            console.log(`JSON mapping file created: ${jsonFilePath}`);
            // 제거된 테이블 정보 로깅
            const removedTables = Array.from(tableProcedureMap.keys()).filter(table => !existingTables.has(table));
            if (removedTables.length > 0) {
                console.log(`Removed tables from spTable.txt: ${removedTables.join(', ')}`);
            }
        }
        else {
            console.log('No tables to keep in spTable.txt');
            // spTable.txt가 비어있거나 모든 테이블이 존재하지 않는 경우, 파일을 삭제
            if (fs.existsSync(spTablePath)) {
                fs.unlinkSync(spTablePath);
                console.log(`Deleted empty spTable.txt: ${spTablePath}`);
            }
        }
    }
    catch (err) {
        console.error('Error cleaning spTable.txt:', err);
    }
}
// 저장 프로시저 코드를 AI API로 분석하여 정리하는 함수
async function analyzeStoredProceduresWithAI() {
    try {
        const fs = require('fs');
        const path = require('path');
        const spInfoPath = path.join(__dirname, '..', 'out', 'spInfo.txt');
        // spInfo.txt 파일이 존재하는지 확인
        if (!fs.existsSync(spInfoPath)) {
            console.log('spInfo.txt file not found. Please run getSpInfo first.');
            return;
        }
        // VS Code Output 패널에 진행 상황 표시
        const outputChannel = vscode.window.createOutputChannel('AI Analysis Results');
        outputChannel.show();
        outputChannel.appendLine('=== AI Analysis of Stored Procedures ===');
        outputChannel.appendLine(`Started at: ${new Date().toLocaleString()}`);
        outputChannel.appendLine('');
        // 파일 내용 읽기
        const fileContent = fs.readFileSync(spInfoPath, 'utf8');
        // 저장 프로시저 정보 파싱
        const procedures = [];
        const lines = fileContent.split('\n');
        let currentProc = null;
        let isReadingDefinition = false;
        for (const line of lines) {
            if (line.startsWith('--- Procedure')) {
                if (currentProc) {
                    procedures.push(currentProc);
                }
                currentProc = { name: '', definition: '' };
                isReadingDefinition = false;
            }
            else if (line.startsWith('ProcedureName:')) {
                if (currentProc) {
                    currentProc.name = line.replace('ProcedureName:', '').trim();
                }
            }
            else if (line.startsWith('ProcedureDefinition:')) {
                isReadingDefinition = true;
            }
            else if (isReadingDefinition && currentProc && line.trim() && !line.startsWith('---') && !line.startsWith('===')) {
                // ProcedureDefinition 내용 수집
                if (currentProc.definition) {
                    currentProc.definition += ' ' + line.trim();
                }
                else {
                    currentProc.definition = line.trim();
                }
            }
        }
        // 마지막 프로시저 추가
        if (currentProc && currentProc.name) {
            procedures.push(currentProc);
        }
        outputChannel.appendLine(`Total procedures to analyze: ${procedures.length}`);
        outputChannel.appendLine('');
        // AI 분석 결과를 저장할 배열
        const analysisResults = [];
        // API 설정
        const apiUrl = "https://ai-openapi.lotte.net:32001/api/lottegpt";
        const token = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJoeXVuamlrLmxlZSIsImlzcyI6ImFpX3BsYXRmb3JtIiwiZ3JvdXAiOiIwMzMxMDAiLCJhdXRob3JpdGllcyI6IlJPTEVfVVNFUl9JRCIsInR5cGUiOiJBQ0NFU1MiLCJleHAiOjM4ODc2MDgwOTZ9.Av3kIIIa2HMlJfx0KUdKwN30xadIfC7AmZXNP2go8PlfqlGA_WpoOGmHqFaYYevr3fYCr17ZP2-Sjk7SDi2gkQ";
        // 각 저장 프로시저별로 AI 분석 요청
        for (let i = 0; i < procedures.length; i++) {
            const proc = procedures[i];
            if (proc.name && proc.definition) {
                try {
                    outputChannel.appendLine(`Analyzing procedure ${i + 1}/${procedures.length}: ${proc.name}`);
                    // AI API 호출
                    const response = await fetch(apiUrl, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            query: `아래 프로시저 코드의 주요 로직을 요약 정리해줘.(sql 코드정리와 sql 예시코드 제외) ${proc.definition}`,
                            history: ""
                        }),
                    });
                    if (response.ok) {
                        const result = await response.json();
                        const analysis = result.response || result.message || '분석 결과를 가져올 수 없습니다.';
                        // 결과 저장
                        analysisResults.push({
                            procedureName: proc.name,
                            analysis: analysis,
                            timestamp: new Date().toLocaleString()
                        });
                        outputChannel.appendLine(`✓ Analysis completed for ${proc.name}`);
                        outputChannel.appendLine(`  ${analysis.substring(0, 100)}...`);
                        outputChannel.appendLine('');
                        // 진행률 표시
                        const progress = Math.round(((i + 1) / procedures.length) * 100);
                        vscode.window.showInformationMessage(`AI 분석 진행률: ${progress}% (${i + 1}/${procedures.length})`);
                    }
                    else {
                        outputChannel.appendLine(`✗ API call failed for ${proc.name}: ${response.status} ${response.statusText}`);
                        analysisResults.push({
                            procedureName: proc.name,
                            analysis: `API 호출 실패: ${response.status} ${response.statusText}`,
                            timestamp: new Date().toLocaleString()
                        });
                    }
                    // API 호출 간격 조절 (너무 빠른 요청 방지)
                    if (i < procedures.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
                    }
                }
                catch (error) {
                    console.error(`Error analyzing procedure ${proc.name}:`, error);
                    outputChannel.appendLine(`✗ Error analyzing ${proc.name}: ${error}`);
                    analysisResults.push({
                        procedureName: proc.name,
                        analysis: `분석 오류: ${error}`,
                        timestamp: new Date().toLocaleString()
                    });
                }
            }
        }
        // 분석 결과를 파일로 저장
        if (analysisResults.length > 0) {
            try {
                const outDir = path.join(__dirname, '..', 'out');
                const analysisFilePath = path.join(outDir, 'spAIAnalysis.txt');
                // out 디렉토리가 없으면 생성
                if (!fs.existsSync(outDir)) {
                    fs.mkdirSync(outDir, { recursive: true });
                }
                // 기존 파일이 존재하면 삭제
                if (fs.existsSync(analysisFilePath)) {
                    fs.unlinkSync(analysisFilePath);
                    outputChannel.appendLine('Existing analysis file removed');
                }
                // 분석 결과 파일 생성
                const analysisContent = [];
                for (const result of analysisResults) {
                    analysisContent.push(`--- ${result.procedureName} ---`);
                    analysisContent.push(result.analysis);
                    analysisContent.push('');
                }
                fs.writeFileSync(analysisFilePath, analysisContent.join('\n'), 'utf8');
                vscode.window.showInformationMessage(`AI 분석 완료! ${analysisResults.length}개 프로시저 분석 결과가 저장되었습니다.`);
            }
            catch (fileErr) {
                console.error('File save error:', fileErr);
                outputChannel.appendLine(`\n=== File Save Error ===`);
                outputChannel.appendLine(`Error saving analysis file: ${fileErr}`);
                vscode.window.showErrorMessage(`분석 결과 파일 저장 중 오류가 발생했습니다: ${fileErr}`);
            }
        }
    }
    catch (err) {
        console.error('Error in AI analysis:', err);
        vscode.window.showErrorMessage(`AI 분석 중 오류가 발생했습니다: ${err}`);
    }
}
// 테이블별 속성을 분석하여 tableAttributes.txt에 정리하는 함수
async function analyzeTableAttributes() {
    const query = `
        SELECT
          s.name AS schema_name,
          tab.name AS table_name,
          c.name AS column_name,
          t.name AS data_type,
          CASE 
              WHEN c.max_length = -1 THEN 'MAX'
              WHEN t.name IN ('nvarchar', 'varchar', 'char', 'nchar') 
              THEN CAST(c.max_length / 2 AS VARCHAR(10))
              WHEN t.name IN ('decimal', 'numeric') 
              THEN CAST(c.precision AS VARCHAR(10)) + ',' + CAST(c.scale AS VARCHAR(10))
              ELSE CAST(c.max_length AS VARCHAR(10))
          END AS column_type,
          CASE 
              WHEN pk.column_id IS NOT NULL THEN 'PK'
              WHEN fk.referenced_object_id IS NOT NULL THEN 'FK'
              ELSE ''
          END AS key_type,
          c.is_nullable,
          c.column_id
        FROM 
          sys.columns c
        INNER JOIN 
          sys.types t ON c.user_type_id = t.user_type_id
        INNER JOIN 
          sys.tables tab ON c.object_id = tab.object_id
        INNER JOIN 
          sys.schemas s ON tab.schema_id = s.schema_id
        LEFT JOIN 
          sys.index_columns pk ON c.object_id = pk.object_id 
          AND c.column_id = pk.column_id
          AND pk.index_id = (SELECT TOP 1 i.index_id FROM sys.indexes i WHERE i.object_id = c.object_id AND i.is_primary_key = 1)
        LEFT JOIN 
          sys.foreign_key_columns fk ON c.object_id = fk.parent_object_id 
          AND c.column_id = fk.parent_column_id
        ORDER BY 
          s.name, tab.name, c.column_id;
      `;
    let pool = null;
    try {
        // 데이터베이스 연결
        pool = await mssql.connect(dbConfig_1.default);
        console.log('Database connected for table attributes analysis');
        // VS Code Output 패널에 연결 성공 정보 출력
        const outputChannel = vscode.window.createOutputChannel('Table Attributes Analysis');
        outputChannel.show();
        outputChannel.appendLine('=== Database Connection ===');
        outputChannel.appendLine(`Connected successfully at: ${new Date().toLocaleString()}`);
        outputChannel.appendLine(`Server: ${dbConfig_1.default.server}:${dbConfig_1.default.port}`);
        outputChannel.appendLine(`Database: ${dbConfig_1.default.database}`);
        // 쿼리 실행
        const result = await pool.request().query(query);
        // VS Code Output 패널에 결과 출력
        outputChannel.appendLine('\n=== Table Attributes Analysis Results ===');
        outputChannel.appendLine(`Query executed at: ${new Date().toLocaleString()}`);
        // 타입 안전한 결과 처리
        if (result.recordsets && Array.isArray(result.recordsets) && result.recordsets.length > 0) {
            const firstRecordset = result.recordsets[0];
            if (firstRecordset.length > 0) {
                // 파일로 저장할 내용을 위한 배열
                const fileContent = [];
                fileContent.push('=== Database Table Attributes Analysis ===');
                fileContent.push(`Generated at: ${new Date().toLocaleString()}`);
                fileContent.push(`Server: ${dbConfig_1.default.server}:${dbConfig_1.default.port}`);
                fileContent.push(`Database: ${dbConfig_1.default.database}`);
                fileContent.push(`Total columns analyzed: ${firstRecordset.length}`);
                fileContent.push('');
                // 테이블별로 컬럼 정보를 그룹화
                const tableGroups = new Map();
                firstRecordset.forEach((column) => {
                    // 스키마명과 테이블명을 결합하여 키 생성
                    const tableKey = `${column.schema_name || 'dbo'}.${column.table_name || 'unknown'}`;
                    if (!tableGroups.has(tableKey)) {
                        tableGroups.set(tableKey, []);
                    }
                    tableGroups.get(tableKey).push(column);
                });
                // 스키마별로 정렬하여 출력
                const sortedTables = Array.from(tableGroups.keys()).sort();
                for (const tableKey of sortedTables) {
                    const columns = tableGroups.get(tableKey);
                    const [schemaName, tableName] = tableKey.split('.');
                    outputChannel.appendLine(`\n--- Table: ${tableName} (${columns.length} columns) ---`);
                    fileContent.push(`\n--- Table: ${tableName} (${columns.length} columns) ---`);
                    // 컬럼별로 정렬하여 출력
                    const sortedColumns = columns.sort((a, b) => a.column_id - b.column_id);
                    // 테이블 헤더 출력
                    const header = `Column Name | Data Type | Key Type`;
                    outputChannel.appendLine(header);
                    fileContent.push(header);
                    fileContent.push('-'.repeat(header.length));
                    sortedColumns.forEach((column) => {
                        const columnInfo = `${column.column_name} | ${column.data_type} | ${column.key_type}`;
                        outputChannel.appendLine(columnInfo);
                        fileContent.push(columnInfo);
                    });
                    // 테이블 요약 정보
                    const pkColumns = sortedColumns.filter((col) => col.key_type === 'PK');
                    const fkColumns = sortedColumns.filter((col) => col.key_type === 'FK');
                    const nullableColumns = sortedColumns.filter((col) => col.is_nullable);
                    const summary = `\nSummary: PK(${pkColumns.length}), FK(${fkColumns.length}), Nullable(${nullableColumns.length})`;
                    outputChannel.appendLine(summary);
                    fileContent.push(summary);
                }
                // 파일로 저장
                try {
                    const fs = require('fs');
                    const path = require('path');
                    const outDir = path.join(__dirname, '..', 'out');
                    const filePath = path.join(outDir, 'tableAttributes.txt');
                    // out 디렉토리가 없으면 생성
                    if (!fs.existsSync(outDir)) {
                        fs.mkdirSync(outDir, { recursive: true });
                    }
                    // 기존 파일이 존재하면 삭제
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        outputChannel.appendLine('Existing file removed');
                    }
                    // 파일에 내용 쓰기
                    fs.writeFileSync(filePath, fileContent.join('\n'), 'utf8');
                    outputChannel.appendLine(`\n=== File Saved ===`);
                    outputChannel.appendLine(`File saved to: ${filePath}`);
                    vscode.window.showInformationMessage(`테이블 속성 분석 결과가 ${filePath}에 저장되었습니다.`);
                }
                catch (fileErr) {
                    console.error('File save error:', fileErr);
                    outputChannel.appendLine(`\n=== File Save Error ===`);
                    outputChannel.appendLine(`Error saving file: ${fileErr}`);
                    vscode.window.showErrorMessage(`파일 저장 중 오류가 발생했습니다: ${fileErr}`);
                }
            }
            else {
                outputChannel.appendLine('No columns found');
            }
        }
        else {
            outputChannel.appendLine('No recordsets found');
        }
        // 콘솔에도 출력 (디버깅용)
        console.log('Table attributes result:', result.recordsets);
    }
    catch (err) {
        console.error('Table attributes analysis error:', err);
        // VS Code Output 패널에 오류 출력
        const outputChannel = vscode.window.createOutputChannel('Table Attributes Analysis');
        outputChannel.show();
        outputChannel.appendLine('=== Database Error ===');
        outputChannel.appendLine(`Error occurred at: ${new Date().toLocaleString()}`);
        outputChannel.appendLine(`Error details: ${err}`);
        // 사용자에게 오류 알림
        if (err instanceof Error) {
            vscode.window.showErrorMessage(`Database error: ${err.message}`);
        }
        else {
            vscode.window.showErrorMessage(`Database error: ${err}`);
        }
    }
    finally {
        // 연결 풀 닫기
        if (pool) {
            try {
                await pool.close();
                console.log('Database connection closed');
            }
            catch (closeErr) {
                console.error('Error closing connection:', closeErr);
            }
        }
    }
}
// tableAttributes.txt를 읽어서 AI API에 mermaid 코드 생성 요청하는 함수
async function generateTableMermaidWithAI() {
    try {
        const fs = require('fs');
        const path = require('path');
        const tableAttributesPath = path.join(__dirname, '..', 'out', 'tableAttributes.txt');
        // tableAttributes.txt 파일이 존재하는지 확인
        if (!fs.existsSync(tableAttributesPath)) {
            console.log('tableAttributes.txt file not found. Please run analyzeTableAttributes first.');
            return;
        }
        // VS Code Output 패널에 진행 상황 표시
        const outputChannel = vscode.window.createOutputChannel('Table Mermaid Generation');
        outputChannel.show();
        outputChannel.appendLine('=== AI Mermaid Code Generation for Tables ===');
        outputChannel.appendLine(`Started at: ${new Date().toLocaleString()}`);
        outputChannel.appendLine('');
        // 파일 내용 읽기
        const fileContent = fs.readFileSync(tableAttributesPath, 'utf8');
        // 테이블별로 정보 파싱
        const tables = [];
        const lines = fileContent.split('\n');
        let currentTable = null;
        let isReadingColumns = false;
        for (const line of lines) {
            if (line.startsWith('--- Schema:')) {
                // 이전 테이블 정보 저장
                if (currentTable && currentTable.columns.length > 0) {
                    tables.push(currentTable);
                }
                // 새 테이블 시작
                const match = line.match(/--- Schema: ([^,]+), Table: ([^(]+) \((\d+) columns\) ---/);
                if (match) {
                    currentTable = {
                        schema: match[1].trim(),
                        name: match[2].trim(),
                        columns: []
                    };
                    isReadingColumns = false;
                }
            }
            else if (line.includes('Column Name | Data Type | Key Type')) {
                isReadingColumns = true;
            }
            else if (line.startsWith('-') && line.includes('-')) {
                // 구분선 무시
                continue;
            }
            else if (isReadingColumns && currentTable && line.trim() && !line.startsWith('Summary:') && !line.startsWith('---')) {
                // 컬럼 정보 파싱
                const columnParts = line.split('|').map((part) => part.trim());
                if (columnParts.length >= 3) {
                    currentTable.columns.push({
                        name: columnParts[0],
                        dataType: columnParts[1],
                        keyType: columnParts[2]
                    });
                }
            }
        }
        // 마지막 테이블 추가
        if (currentTable && currentTable.columns.length > 0) {
            tables.push(currentTable);
        }
        outputChannel.appendLine(`Total tables to process: ${tables.length}`);
        outputChannel.appendLine('');
        // AI 분석 결과를 저장할 배열
        const mermaidResults = [];
        // API 설정
        const apiUrl = "https://ai-openapi.lotte.net:32001/api/lottegpt";
        const token = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJoeXVuamlrLmxlZSIsImlzcyI6ImFpX3BsYXRmb3JtIiwiZ3JvdXAiOiIwMzMxMDAiLCJhdXRob3JpdGllcyI6IlJPTEVfVVNFUl9JRCIsInR5cGUiOiJBQ0NFU1MiLCJleHAiOjM4ODc2MDgwOTZ9.Av3kIIIa2HMlJfx0KUdKwN30xadIfC7AmZXNP2go8PlfqlGA_WpoOGmHqFaYYevr3fYCr17ZP2-Sjk7SDi2gkQ";
        // 각 테이블별로 AI mermaid 코드 생성 요청
        for (let i = 0; i < tables.length; i++) {
            const table = tables[i];
            try {
                outputChannel.appendLine(`Processing table ${i + 1}/${tables.length}: ${table.schema}.${table.name}`);
                // 테이블 정보를 구조화된 텍스트로 변환
                const tableInfo = `
테이블명: ${table.schema}.${table.name}
컬럼 정보:
${table.columns.map(col => `- ${col.name}: ${col.dataType}${col.keyType ? ` (${col.keyType})` : ''}`).join('\n')}
            `.trim();
                // AI API 호출
                const response = await fetch(apiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        query: `아래 테이블 구조를 mermaid ERD(Entity Relationship Diagram) 코드로 변환해주세요. PK는 기본키, FK는 외래키를 나타내세요. ${tableInfo}`,
                        history: ""
                    }),
                });
                if (response.ok) {
                    const result = await response.json();
                    let mermaidCode = result.response || result.message || 'Mermaid 코드를 생성할 수 없습니다.';
                    // ``` ``` 사이에 있는 mermaid 코드만 추출
                    const mermaidMatch = mermaidCode.match(/```(?:mermaid)?\s*([\s\S]*?)```/);
                    if (mermaidMatch) {
                        mermaidCode = mermaidMatch[1].trim();
                    }
                    // 결과 저장
                    mermaidResults.push({
                        tableName: `${table.schema}.${table.name}`,
                        mermaidCode: mermaidCode,
                        timestamp: new Date().toLocaleString()
                    });
                    outputChannel.appendLine(`✓ Mermaid code generated for ${table.schema}.${table.name}`);
                    outputChannel.appendLine(`  ${mermaidCode.substring(0, 100)}...`);
                    outputChannel.appendLine('');
                    // 진행률 표시
                    const progress = Math.round(((i + 1) / tables.length) * 100);
                    vscode.window.showInformationMessage(`Mermaid 생성 진행률: ${progress}% (${i + 1}/${tables.length})`);
                }
                else {
                    outputChannel.appendLine(`✗ API call failed for ${table.schema}.${table.name}: ${response.status} ${response.statusText}`);
                    mermaidResults.push({
                        tableName: `${table.schema}.${table.name}`,
                        mermaidCode: `API 호출 실패: ${response.status} ${response.statusText}`,
                        timestamp: new Date().toLocaleString()
                    });
                }
                // API 호출 간격 조절 (너무 빠른 요청 방지)
                if (i < tables.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
                }
            }
            catch (error) {
                console.error(`Error generating mermaid for table ${table.schema}.${table.name}:`, error);
                outputChannel.appendLine(`✗ Error generating mermaid for ${table.schema}.${table.name}: ${error}`);
                mermaidResults.push({
                    tableName: `${table.schema}.${table.name}`,
                    mermaidCode: `오류 발생: ${error}`,
                    timestamp: new Date().toLocaleString()
                });
            }
        }
        // 전체 테이블 관계를 위한 통합 mermaid 코드 생성
        if (mermaidResults.length > 0) {
            try {
                const outDir = path.join(__dirname, '..', 'out');
                const mermaidFilePath = path.join(outDir, 'tableAttributeMermaid.txt');
                // out 디렉토리가 없으면 생성
                if (!fs.existsSync(outDir)) {
                    fs.mkdirSync(outDir, { recursive: true });
                }
                // 기존 파일이 존재하면 삭제
                if (fs.existsSync(mermaidFilePath)) {
                    fs.unlinkSync(mermaidFilePath);
                    outputChannel.appendLine('Existing mermaid file removed');
                }
                // mermaid 결과 파일 생성
                const mermaidContent = [];
                // 개별 테이블 mermaid 코드
                for (const result of mermaidResults) {
                    mermaidContent.push(result.mermaidCode);
                    mermaidContent.push('');
                }
                // 통합 mermaid 코드 생성 (모든 테이블 관계)
                // mermaidContent.push('```mermaid');
                // mermaidContent.push('erDiagram');
                // 파일에 내용 쓰기
                fs.writeFileSync(mermaidFilePath, mermaidContent.join('\n'), 'utf8');
                outputChannel.appendLine(`=== Mermaid Generation Complete ===`);
                outputChannel.appendLine(`Mermaid codes saved to: ${mermaidFilePath}`);
                outputChannel.appendLine(`Total tables processed: ${mermaidResults.length}`);
                vscode.window.showInformationMessage(`Mermaid 코드 생성 완료! ${mermaidResults.length}개 테이블의 ERD 코드가 저장되었습니다.`);
            }
            catch (fileErr) {
                console.error('File save error:', fileErr);
                outputChannel.appendLine(`\n=== File Save Error ===`);
                outputChannel.appendLine(`Error saving mermaid file: ${fileErr}`);
                vscode.window.showErrorMessage(`Mermaid 파일 저장 중 오류가 발생했습니다: ${fileErr}`);
            }
        }
    }
    catch (err) {
        console.error('Error in mermaid generation:', err);
        vscode.window.showErrorMessage(`Mermaid 생성 중 오류가 발생했습니다: ${err}`);
    }
}
//# sourceMappingURL=extension.js.map