const {Pool} = require('pg');
const bcrypt = require('bcryptjs');
const { resolveDatabaseUrl } = require('./db-connection');
(async()=>{
  const pool = new Pool({connectionString: resolveDatabaseUrl()});
  try {
    const res = await pool.query('SELECT email, password FROM users WHERE email = $1', ['admin@noonomanarts.com']);
    if (res.rows.length === 0) {
      console.log('Admin user not found');
      process.exit(2);
    }
    const hash = res.rows[0].password;
    const ok = await bcrypt.compare('admin123', hash);
    console.log(ok ? 'Admin credentials are valid (admin@noonomanarts.com / admin123)' : 'Admin credentials are INVALID');
  } catch (e) {
    console.error('Error checking admin credentials:', e.message || e);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
