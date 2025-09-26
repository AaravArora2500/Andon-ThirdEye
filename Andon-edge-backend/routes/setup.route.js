import { Router } from "express";
import pool from "../db/index.js";
import { fetchDownTimeReasons, fetchMachineData, fetchPlantDetails } from "../utils/cloudApi.js";

const router = Router();

// Setup Page
router.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
  <html>
  <head>
    <title>Andon Setup</title>
    <style>
      body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f3f4f6; }
      .container { background: #fff; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); width: 400px; }
      h1 { text-align: center; margin-bottom: 1.5rem; }
      label { display: block; margin-bottom: 0.3rem; font-weight: bold; }
      input { width: 100%; padding: 0.5rem; margin-bottom: 1rem; border: 1px solid #ccc; border-radius: 6px; }
      button { width: 100%; padding: 0.7rem; background: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; }
      button:hover { background: #1d4ed8; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Plant Setup</h1>
      <form id="setup-form">
        <label>Plant ID</label><input type="text" name="plantId" required>
        <label>Plant Name</label><input type="text" name="plantName" required>
        <button type="submit">Submit</button>
      </form>
      <script>
        document.getElementById('setup-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const body = {
            plantId: e.target.plantId.value,
            plantName: e.target.plantName.value
          };
          try {
            const res = await fetch('/setup/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error("Network error");
            const data = await res.json();
            if (data.success) {
              window.location.href = '/admin';
            } else {
              alert(data.error || 'Setup failed.');
            }
          } catch (err) {
            console.error("Submit error:", err);
            alert("Something went wrong.");
          }
        });
      </script>
    </div>
  </body>
  </html>`);
});

//Form Submission
router.post("/submit", async (req, res) => {
  try {
    const { plantId, plantName } = req.body;

    if (!plantId || !plantName) {
      return res.status(400).json({ error: "plantId and plantName are required" });
    }


    //calling apis
await fetchMachineData(plantId)
await fetchPlantDetails(plantId);
await fetchDownTimeReasons(plantId);
    // Save or update in DB
    await pool.query(`
      INSERT INTO setup_info (plant_id, plant_name, setup_completed)
      VALUES ($1, $2, $3)
      ON CONFLICT (plant_id) DO UPDATE
      SET plant_name = $2, setup_completed = $3
    `, [plantId, plantName, true]);

    res.json({ success: true });
  } catch (err) {
    alert("Error saving data");
    console.error("Setup error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
