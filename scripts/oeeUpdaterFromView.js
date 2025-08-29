import pool from "../db/index.js";

const updateOEEFromView = async () => {
  try {
    const { rows } = await pool.query(`SELECT id, oee FROM shift_oee_view WHERE oee IS NOT NULL`);

    for (const row of rows) {
      await pool.query(
        `UPDATE shift_summary SET oee = $1 WHERE id = $2`,
        [row.oee, row.id]
      );
    }
//  console.log("OEE updated")
  } catch (err) {
    console.error("Error updating OEE from view:", err);
  }
};
  setInterval(updateOEEFromView,10*1000);
export default updateOEEFromView;




