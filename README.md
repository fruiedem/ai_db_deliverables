# wf-visualdb

Visual Database Extension for VS Code

## Database Configuration

This extension requires a `.env` file in the project root directory with the following database configuration:

```env
# Database Configuration
DB_HOST=your_server_name_or_ip
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database_name
DB_PORT=1433

# Optional Database Options
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
```

### Required Environment Variables:
- `DB_HOST`: SQL Server hostname or IP address
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password  
- `DB_NAME`: Database name
- `DB_PORT`: SQL Server port (default: 1433)

### Optional Environment Variables:
- `DB_ENCRYPT`: Enable encryption (default: false)
- `DB_TRUST_SERVER_CERTIFICATE`: Trust server certificate (default: true)

## Commands

- `wf-visualdb.helloWorld`: Hello World command
- `wf-visualdb.getSpInfo`: Get stored procedure information
- `wf-visualdb.checkDbConnection`: Test database connection
- ... existing commands ...

## Features

- Database connection management
- Stored procedure information retrieval
- Database schema visualization
- AI-powered database analysis

## Installation

1. Clone this repository
2. Run `npm install`
3. Create `.env` file with your database configuration
4. Run `npm run compile`
5. Press F5 to run the extension in VS Code

## Development

- `npm run compile`: Compile TypeScript to JavaScript
- `npm run watch`: Watch for changes and recompile
- `npm run lint`: Run ESLint
- `npm run test`: Run tests
