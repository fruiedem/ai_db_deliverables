// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as mssql from 'mssql';
import dbConfig, { validateDbConfig, getDbConfigInfo } from './config/dbConfig';

/******************** 기본 설정 및 변수 정의 ********************/
// DB 설정 정보 load 및 검증
if (!validateDbConfig()) {
  console.error('Database configuration is invalid. Please check your .env file.');
  vscode.window.showErrorMessage('Database configuration is invalid. Please check your .env file.');
}

// SP 리스트 : <map>
const spArray = [];


/******************** VSCode Commands 정의 ********************/
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "visualdb" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const helloWorld = vscode.commands.registerCommand('wf-visualdb.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
    // Display a message box to the user
    console.log('helloWorld')
    console.log('dbConfig: '+JSON.stringify(dbConfig))  // db 정보 load 확인용
		vscode.window.showInformationMessage('Hello World from visualdb!');
	});

  context.subscriptions.push(helloWorld);


  // stored procedure 정보 가져오는 커맨드
  const SpInfo = vscode.commands.registerCommand('wf-visualdb.getSpInfo', async () => {

    console.log('getSpInfo')
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

}

/******************** 기능 정의 ********************/

    // 데이터베이스 연결 상태 확인
    async function checkDatabaseConnection() {
      if (!validateDbConfig()) {
        vscode.window.showErrorMessage('Database configuration is invalid. Please check your .env file.');
        return;
      }

      let pool: mssql.ConnectionPool | null = null;
      try {
        vscode.window.showInformationMessage('Testing database connection...');
        console.log('Testing connection with config:', getDbConfigInfo());
        
        pool = await mssql.connect(dbConfig);
        console.log('Database connection successful!');
        vscode.window.showInformationMessage('Database connection successful!');
        
        // 간단한 쿼리로 연결 테스트
        const result = await pool.request().query('SELECT 1 as test');
        console.log('Test query result:', result.recordsets);
        
      } catch (err) {
        console.error('Database connection failed:', err);
        vscode.window.showErrorMessage(`Database connection failed: ${err}`);
      } finally {
        if (pool) {
          await pool.close();
        }
      }
    }

    // 저장 프로시저 정보 가져오기 ==> ProcedureDefinition 참고
    async function getSpInfo(schemaName: string) {
      const query = `
        SELECT o.name AS ProcedureName, m.definition AS ProcedureDefinition
        FROM sys.objects o
        JOIN sys.sql_modules m ON o.object_id = m.object_id
        WHERE o.type = 'P';
        `;
      let pool: mssql.ConnectionPool | null = null;
      try{
        // 데이터베이스 연결
        pool = await mssql.connect(dbConfig);
        console.log('pool:',pool)
        // 매개변수 전달 및 쿼리 실행
        const result = await pool.request()
          // .input('schemaName', mssql.VarChar, schemaName) // 매개변수 전달
          .query(query)
        console.log('Result:',result.recordsets)
        } catch (err) {
          console.log('SQL Error:', err)
        } finally {
          // 연결 풀 닫기
          if (pool) {
            await pool.close();
          }
        }

    }
    
    // 저장 프로시저 정보 