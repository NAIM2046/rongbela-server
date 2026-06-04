const {Client} = require('pg');
const c = new Client({
  host: 'ep-orange-pond-amgwq3lz.c-5.us-east-1.aws.neon.tech',
  port: 5432,
  user: 'neondb_owner',
  password: 'npg_kMABq5IL3zCf',
  database: 'neondb',
  ssl: { rejectUnauthorized: false }
});
c.connect()
  .then(() => { console.log('OK - Connected!'); c.end(); })
  .catch(e => console.error('FAILED:', e.message, 'Code:', e.code));