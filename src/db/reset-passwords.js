require('dotenv').config();
const pool = require('./pool');
const bcrypt = require('bcryptjs');

async function resetPasswords() {
  const client = await pool.connect();
  try {
    const adminHash  = await bcrypt.hash('Cat2025!', 10);
    const agenteHash = await bcrypt.hash('Agente2025!', 10);

    await client.query(
      `UPDATE profiles SET password_hash = $1 WHERE email = $2`,
      [adminHash, 'aricciardiwolfenson@buenosaires.gob.ar']
    );
    console.log('✓ Admin: Cat2025!');

    await client.query(
      `UPDATE profiles SET password_hash = $1 WHERE email = $2`,
      [agenteHash, 'cmenendez@buenosaires.gob.ar']
    );
    console.log('✓ Agente: Agente2025!');

    console.log('\n✅ Contraseñas restablecidas.');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

resetPasswords();
