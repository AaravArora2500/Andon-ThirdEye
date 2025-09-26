import pool from './index.js';

const fetchSummaries = async () => {
  try {
    const res = await pool.query("SELECT * FROM shift_summary;");
    console.table(res.rows);
  } catch (err) {
    console.error("Error fetching data:", err);
  } finally {
    await pool.end();
  }
};

fetchSummaries();
