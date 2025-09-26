import express from "express";
import dotenv from "dotenv";
import pool from "./db/index.js";
import cors from "cors";
import sequelize from "./db/sequelize.js";
import setupAdmin from "./admin/app.js";
import setupRoutes from "./routes/setup.route.js";
import addShiftSummary from "./routes/shift.route.js";
import downtimeRoutes from "./routes/downtime.route.js";
// import { Machine, DowntimeTags } from "./db/ORM.js";
// import { fetchMachineData, fetchPlantDetails } from "./utils/cloudApi.js";
import updateOEEFromView from "./scripts/oeeUpdaterFromView.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/setup", setupRoutes);
app.use("/api/downtime", downtimeRoutes);
app.use("/api/shiftsummary", addShiftSummary);

// --- SSE (Server-Sent Events) ---
let clients = [];
app.get("/events/machine_updates", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  clients.push(res);
  console.log(`Client connected. Total clients: ${clients.length}`);

  req.on("close", () => {
    clients = clients.filter((c) => c !== res);
    console.log(`Client disconnected. Remaining: ${clients.length}`);
  });
});

function broadcastEvent(type, payload) {
  const event = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  clients.forEach((client) => client.write(event));
}

const downtimeMachines = {};

function startDowntime(machineKey, durationMinutes = 2, reason = "Auto-detected") {
  const resumeAt = Date.now() + durationMinutes * 60 * 1000;
  downtimeMachines[machineKey] = { until: resumeAt, reason };

  const [plant_id, line_id, machine_id] = machineKey.split("_");

  console.log(`Downtime started: ${machineKey} until ${new Date(resumeAt).toLocaleTimeString()}`);
}

// --- Machine Event Handler ---
app.post("/api/machine/event", async (req, res) => {
  try {
    console.log("Received from Node-RED:", req.body);

      const {
      plant_id, line_id, machine_id, shift_code, variant,
      production_quantity, last_counter,
      production_rate, actual_run_time, planned_production_time,
      is_downtime, downtime_duration,
    
    } = req.body;

    const now = new Date();
    const summary_date = now.toISOString().split("T")[0];
    const machineKey = `${plant_id}_${line_id}_${machine_id}`;

    function calculateTargetQuantity(shiftDateStr, startTimeStr, endTimeStr, cycleTimeSec) {
      if (!shiftDateStr || !startTimeStr || !endTimeStr || !cycleTimeSec || cycleTimeSec <= 0) return 0;

      const startDateTime = new Date(`${shiftDateStr}T${startTimeStr}`);
      const endDateTime = new Date(`${shiftDateStr}T${endTimeStr}`);
      if (endDateTime <= startDateTime) endDateTime.setDate(endDateTime.getDate() + 1);

      const shiftDurationMin = (endDateTime - startDateTime) / (1000 * 60);
      const availableTimeMin = shiftDurationMin - 45;
      const targetQty = availableTimeMin * (60 / cycleTimeSec);

      return isNaN(targetQty) ? 0 : Math.floor(targetQty);
    }

    const shiftResult = await pool.query(
      `SELECT shiftstarttime, shiftendtime FROM shift WHERE shiftcode = $1`,
      [shift_code]
    );

    if (shiftResult.rows.length === 0) return res.status(404).json({ error: "Shift code not found" });

    const { shiftstarttime, shiftendtime } = shiftResult.rows[0];

    const machineResult = await pool.query(
      `SELECT cycle_time FROM machine WHERE machine_id = $1`,
      [machine_id]
    );

    if (machineResult.rows.length === 0) return res.status(404).json({ error: "Machine not found" });

    const { cycle_time } = machineResult.rows[0];

    const target_quantity = calculateTargetQuantity(summary_date, shiftstarttime, shiftendtime, cycle_time);
    console.log(`Target quantity for ${machine_id} in shift ${shift_code} is ${target_quantity}`);

    if (is_downtime) {
      if (!downtimeMachines[machineKey]?.active) {
        downtimeMachines[machineKey] = {
          active: true,
          startedAt: now,
          until: Date.now() + (downtime_duration || 2) * 60 * 1000,
          reason: "Auto-detected",
        };

        await pool.query(
          `INSERT INTO downtime (plant_id, line_id, machine_id, shift_code, start_time, reason)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [plant_id, line_id, machine_id, shift_code, now, "Auto-detected"]
        );

        console.log(`Downtime started for ${machineKey} at ${now.toLocaleTimeString()}`);
      }
      return res.json({ status: "downtime started or ongoing" });
    } else {
      if (downtimeMachines[machineKey]?.active) {
        await pool.query(
          `UPDATE downtime SET end_time = $1
           WHERE plant_id=$2 AND line_id=$3 AND machine_id=$4 AND shift_code=$5 AND end_time IS NULL
           ORDER BY start_time DESC LIMIT 1`,
          [now, plant_id, line_id, machine_id, shift_code]
        );

        console.log(`Downtime ended for ${machineKey}`);
        delete downtimeMachines[machineKey];
      }
    }

    const result = await pool.query(
      `INSERT INTO shift_summary (
        plant_id, line_id, machine_id, summary_date, shift_code, variant,
        production_quantity, target_quantity, last_counter, updated_on, active,
        uom, production_rate, actual_run_time, planned_production_time
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, true,
        'strokes', $11, $12, $13
      ) RETURNING *`,
      [
        plant_id, line_id, machine_id, summary_date, shift_code, variant,
        production_quantity, target_quantity, last_counter, now,
        production_rate, actual_run_time, planned_production_time,
      ]
    );

    const shiftSummary = result.rows[0];

    const downtimeResult = await pool.query(
      `SELECT * FROM downtime
       WHERE plant_id = $1 AND line_id = $2 AND machine_id = $3
         AND shift_code = $4 AND DATE(start_time) = $5
       ORDER BY start_time ASC`,
      [plant_id, line_id, machine_id, shift_code, summary_date]
    );

    const downtimeData = downtimeResult.rows;

    broadcastEvent("machine_update", {
      data: shiftSummary,
      downtime: downtimeData,
    });

    res.status(200).json({
      message: "Shift summary updated",
      summary: shiftSummary,
      downtime: downtimeData,
    });
  } catch (err) {
    console.error("Error handling machine event:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

updateOEEFromView();


const start = async () => {
  try {
    await sequelize.authenticate();
    console.log("Connected to PostgreSQL via Sequelize");
    await pool.query("SELECT NOW()");
    console.log("Connected to PostgreSQL via pg");
    await setupAdmin(app);

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start app:", err);
  }
};

start();

export { startDowntime, broadcastEvent };
