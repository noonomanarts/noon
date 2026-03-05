const {Pool} = require('pg');
(async()=>{
  const pool = new Pool({connectionString: process.env.DATABASE_URL});
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
    console.log('Public tables:\n' + res.rows.map(r=>r.table_name).join('\n'));
  } catch(e){ console.error(e); process.exit(1); } finally { await pool.end(); }
})();
