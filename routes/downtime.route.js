import express from "express";
import pool from "../db/index.js";
import { broadcastEvent } from "../server.js";

const router = express.Router();

// GET: Fetch downtime records with filters
router.get("/", async (req, res) => {
  const { line_id, machine_id, shift_code, start_date, end_date } = req.query;

  try {
    const conditions = [];
    const values = [];

    if (line_id) {
      values.push(line_id);
      conditions.push(`line_id = $${values.length}`);
    }
    if (machine_id) {
      values.push(machine_id);
      conditions.push(`machine_id = $${values.length}`);
    }
    if (shift_code) {
      values.push(shift_code);
      conditions.push(`shift_code = $${values.length}`);
    }
    if (start_date) {
      values.push(start_date);
      conditions.push(`DATE(start_time) >= $${values.length}`);
    }
    if (end_date) {
      values.push(end_date);
      conditions.push(`DATE(end_time) <= $${values.length}`);
    }

    let query = `SELECT * FROM downtime`;
    if (conditions.length > 0) query += ` WHERE ` + conditions.join(" AND ");
    query += ` ORDER BY start_time DESC`;

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching downtime records:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET: Fetch all downtime tags (reasons)
router.get("/reasons", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM downtime_tags");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching downtime tags:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST: Node-RED triggers downtime (auto-logging)
router.post("/", async (req, res) => {
  console.log("Received Node-RED downtime payload:", req.body);

  const {
    plant_id,
    line_id,
    machine_id,
    shift_code,
    tag_id,
    start_time,
    end_time,
    variant,
  } = req.body;

  if (!plant_id || !line_id || !machine_id || !start_time) {
    return res.status(400).json({ error: "Missing required downtime fields" });
  }

  try {
    let downtimeEntry;

    if (end_time) {
      // This is a "downtime_end" event: close the matching record using start_time
      const closeResult = await pool.query(
        `UPDATE downtime 
         SET end_time = $1 
         WHERE plant_id = $2 AND line_id = $3 AND machine_id = $4 
           AND shift_code = $5 AND start_time = $6
         RETURNING *`,
        [end_time, plant_id, line_id, machine_id, shift_code, start_time]
      );

      if (closeResult.rows.length > 0) {
        downtimeEntry = closeResult.rows[0];
      } else {
        console.warn("No open downtime found to close for:", {
          plant_id,
          line_id,
          machine_id,
          shift_code,
          start_time,
        });
        downtimeEntry = null;
      }
    } else {
      // This is a "downtime_start" event: close any open one first, then create new
      await pool.query(
        `UPDATE downtime 
         SET end_time = NOW()
         WHERE plant_id = $1 AND line_id = $2 AND machine_id = $3 
           AND shift_code = $4 AND end_time IS NULL`,
        [plant_id, line_id, machine_id, shift_code]
      );

      const insertResult = await pool.query(
        `INSERT INTO downtime (
           plant_id, line_id, machine_id, shift_code,
           start_time, end_time, tag_id, variant
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          plant_id,
          line_id,
          machine_id,
          shift_code,
          start_time,
          null, // end_time starts as null
          tag_id,
          variant,
        ]
      );

      downtimeEntry = insertResult.rows[0];
    }

    if (downtimeEntry) {
      // Notify SSE clients
      broadcastEvent("downtime", {
        machineKey: `${plant_id}_${line_id}_${machine_id}`,
        plant_id,
        line_id,
        machine_id,
        shift_code,
        status: downtimeEntry.end_time ? "UP" : "DOWN",
        tag_id,
        variant,
        start_time: downtimeEntry.start_time,
        end_time: downtimeEntry.end_time,
      });
    }

    res.status(201).json({
      message: downtimeEntry
        ? `Downtime ${downtimeEntry.end_time ? "closed" : "logged"}`
        : "No matching downtime found to close",
      data: downtimeEntry,
    });
  } catch (err) {
    console.error("Error inserting/updating downtime:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Manual downtime logging (unchanged)
router.post("/manual", async (req, res) => {
  const {
    plant_id,
    line_id,
    machine_id,
    shift_code = "manual",
    duration_minutes,
    variant,
    reason = "LunchBreak",
    tag_id = "LB04",
  } = req.body;

  if (!plant_id || !line_id || !machine_id || !duration_minutes) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + duration_minutes * 60000);
  const machineKey = `${plant_id}_${line_id}_${machine_id}`;

  try {
    const result = await pool.query(
      `INSERT INTO downtime (
         plant_id, line_id, machine_id, shift_code,
         start_time, end_time, reason, tag_id, variant
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        plant_id,
        line_id,
        machine_id,
        shift_code,
        startTime.toISOString(),
        endTime.toISOString(),
        reason,
        tag_id,
        variant,
      ]
    );

    const downtimeEntry = result.rows[0];

    broadcastEvent("manual_downtime", {
      machineKey,
      ...downtimeEntry,
    });

    res.status(201).json({
      message: `Manual downtime started for machine ${machineKey}`,
      data: downtimeEntry,
    });
  } catch (err) {
    console.error("Error inserting manual downtime record:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update tag_id for a downtime record (unchanged)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  let { tag_id } = req.body;

  if (!tag_id && tag_id !== "") {
    return res.status(400).json({ error: "Missing 'tag_id' in request body" });
  }

  if (tag_id === "") tag_id = null;

  try {
    const result = await pool.query(
      `UPDATE downtime SET tag_id = $1 WHERE id = $2 RETURNING *`,
      [tag_id, parseInt(id, 10)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No downtime record found with that ID" });
    }

    res.status(200).json({
      message: "Downtime tag_id updated successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("ERROR updating tag_id:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

export default router;
