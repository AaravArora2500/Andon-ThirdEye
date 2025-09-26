import pool from './index.js';

const deleteSummaries = async () => {
  try {
    const res = await pool.query("DELETE FROM shift_summary;");
    console.log(`Deleted ${res.rowCount} row(s)`);
  } catch (err) {
    console.error("Error deleting data:", err);
  } finally {
    await pool.end();
  }
};

deleteSummaries();
