const {Pool} = require('pg');
(async()=>{
  const pool = new Pool({connectionString: process.env.DATABASE_URL});
  try {
    const res = await pool.query('SELECT id, email, password, created_at FROM users WHERE email = $1', ['admin@noonomanarts.com']);
    if (res.rows.length === 0) {
      console.log('Admin user not found');
      process.exit(2);
    }
    const row = res.rows[0];
    console.log('id:', row.id);
    console.log('email:', row.email);
    console.log('created_at:', row.created_at);
    console.log('password hash:', row.password);
  } catch (e) { console.error(e); process.exit(1); } finally { await pool.end(); }
})();
