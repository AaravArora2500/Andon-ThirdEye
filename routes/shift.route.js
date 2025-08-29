import express from "express";
import pool from "../db/index.js";

const router = express.Router();

// GET all shift summaries
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM shift_summary");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching shift summaries:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET shift summary by composite key
router.get("/:plant_id/:line_id/:machine_id/:shift_code", async (req, res) => {
  const { plant_id, line_id, machine_id, shift_code } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM shift_summary 
       WHERE plant_id = $1 AND line_id = $2 AND machine_id = $3 AND shift_code = $4`,
      [plant_id, line_id, machine_id, shift_code]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Shift summary not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching shift summary:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST create a new shift summary
router.post("/", async (req, res) => {
  const {
    plant_id,
    line_id,
    machine_id,
    summary_date,
    shift_code,
    variant,
    production_quantity,
    target_quantity,
    last_counter,
    updated_on,
    active = false,
    uom,
    production_rate,
    actual_run_time,
    planned_production_time
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO shift_summary (
        plant_id, line_id, machine_id, summary_date,
        shift_code, variant, production_quantity,
        target_quantity, last_counter, updated_on, active,
        uom, production_rate, actual_run_time, planned_production_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        plant_id, line_id, machine_id, summary_date,
        shift_code, variant, production_quantity,
        target_quantity, last_counter, updated_on, active,
        uom, production_rate, actual_run_time, planned_production_time
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error inserting shift summary:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT update a shift summary
router.put("/:plant_id/:line_id/:machine_id/:shift_code", async (req, res) => {
  const { plant_id, line_id, machine_id, shift_code } = req.params;
  const {
    variant,
    production_quantity,
    target_quantity,
    last_counter,
    updated_on,
    active,
    actual_run_time,
    planned_production_time
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE shift_summary
       SET variant = $1,
           production_quantity = $2,
           target_quantity = $3,
           last_counter = $4,
           updated_on = $5,
           active = $6,
           actual_run_time = $7,
           planned_production_time = $8
       WHERE plant_id = $9 AND line_id = $10 AND machine_id = $11 AND shift_code = $12
       RETURNING *`,
      [
        variant,
        production_quantity,
        target_quantity,
        last_counter,
        updated_on,
        active,
        actual_run_time,
        planned_production_time,
        plant_id,
        line_id,
        machine_id,
        shift_code
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Shift summary not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating shift summary:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE shift summary
router.delete("/:plant_id/:line_id/:machine_id/:shift_code", async (req, res) => {
  const { plant_id, line_id, machine_id, shift_code } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM shift_summary
       WHERE plant_id = $1 AND line_id = $2 AND machine_id = $3 AND shift_code = $4
       RETURNING *`,
      [plant_id, line_id, machine_id, shift_code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Shift summary not found" });
    }

    res.json({ message: "Shift summary deleted successfully", data: result.rows[0] });
  } catch (err) {
    console.error("Error deleting shift summary:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH: Activate a variant for a specific machine (deactivates others)
router.patch("/:plant_id/:line_id/:machine_id/:variant/activate", async (req, res) => {
  const { plant_id, line_id, machine_id, variant } = req.params;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE shift_summary
       SET active = false
       WHERE plant_id = $1 AND line_id = $2 AND machine_id = $3`,
      [plant_id, line_id, machine_id]
    );

    const result = await client.query(
      `UPDATE shift_summary
       SET active = true
       WHERE plant_id = $1 AND line_id = $2 AND machine_id = $3 AND variant = $4
       RETURNING *`,
      [plant_id, line_id, machine_id, variant]
    );

    await client.query("COMMIT");

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Variant not found for activation" });
    }

    res.json({ message: "Variant activated", data: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error activating variant:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
});

// Function for insertion
async function addShiftSummary(data) {
  const {
    plant_id,
    line_id,
    machine_id,
    summary_date,
    shift_code,
    variant,
    production_quantity,
    target_quantity,
    last_counter,
    updated_on,
    active = false,
    uom,
    production_rate,
    actual_run_time,
    planned_production_time
  } = data;

  try {
    const result = await pool.query(
      `INSERT INTO shift_summary (
        plant_id, line_id, machine_id, summary_date,
        shift_code, variant, production_quantity,
        target_quantity, last_counter, updated_on, active,
        uom, production_rate, actual_run_time, planned_production_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        plant_id, line_id, machine_id, summary_date,
        shift_code, variant, production_quantity,
        target_quantity, last_counter, updated_on, active,
        uom, production_rate, actual_run_time, planned_production_time
      ]
    );
    return result.rows[0];
  } catch (err) {
    console.error("Error inserting shift summary:", err.message);
    return null;
  }
}

export default router;
export { addShiftSummary };
