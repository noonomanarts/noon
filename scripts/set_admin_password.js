const {Pool} = require('pg');
const bcrypt = require('bcryptjs');
const { resolveDatabaseUrl } = require('./db-connection');
(async()=>{
  const pool = new Pool({connectionString: resolveDatabaseUrl()});
  try {
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 10);
    const res = await pool.query('UPDATE users SET password = $1, updated_at = NOW() WHERE email = $2 RETURNING id', [hash, 'admin@noonomanarts.com']);
    if (res.rowCount === 0) {
      console.log('Admin user not found, no update performed');
      process.exit(2);
    }
    console.log('Admin password updated successfully');
  } catch (e) {
    console.error('Failed to update admin password:', e.message || e);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
