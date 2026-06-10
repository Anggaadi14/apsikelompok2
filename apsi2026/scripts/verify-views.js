const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    const [tables] = await connection.query("SHOW TABLES");
    for (const t of tables) {
      const tableName = Object.values(t)[0];
      if (tableName.startsWith('v_')) continue; // Skip views
      const [[{ count }]] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
      console.log(`Table: ${tableName.padEnd(25)} | Rows: ${count}`);
    }
  } catch (err) {
    console.error("Error reading row counts:", err);
  } finally {
    await connection.end();
  }
}
main();
