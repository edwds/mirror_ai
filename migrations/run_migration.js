const postgres = require('postgres');
const fs = require('fs');

async function runMigration() {
  // 데이터베이스 연결 문자열 가져오기
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  // 데이터베이스 연결
  const sql = postgres(DATABASE_URL);

  try {
    // SQL 파일 읽기
    const migration = fs.readFileSync('./migrations/add_is_hidden_to_analyses.sql', 'utf8');
    
    // 마이그레이션 실행
    await sql.unsafe(migration);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

runMigration();