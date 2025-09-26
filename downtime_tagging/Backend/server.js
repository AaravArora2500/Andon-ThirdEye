import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db/dbconfig.js';
import { fetchDownTimeReasons, syncDowntimeTags } from './cloud/cloudAPI.js'; 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Downtime Tags Server is running',
    timestamp: new Date().toISOString()
  });
});


app.get('/downtime-tags/:plantId', async (req, res) => {
  const { plantId } = req.params;

  try {
    // 1. Fetch from cloud API and sync to local DB
    const cloudTags = await fetchDownTimeReasons(plantId);
    await syncDowntimeTags(cloudTags);

    // 2. Read fresh tags from local DB
    const result = await pool.query(
      `SELECT 
         code AS id, 
         category, 
         department, 
         description, 
         process_type, 
         sub_category, 
         target_duration
       FROM downtime_tags 
       WHERE plant_id = $1
       ORDER BY code`,
      [plantId]
    );

    res.status(200).json({
      success: true,
      source: 'cloud-sync',
      plantId,
      count: result.rows.length,
      tags: result.rows
    });
  } catch (error) {
    console.error(`Error syncing downtime tags for plant ${plantId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch downtime tags',
      error: error.message,
      plantId,
      timestamp: new Date().toISOString()
    });
  }
});

// -------------------------------
// Assign Tag to Active Downtime
// -------------------------------
app.post('/downtime/:machineId/tag', async (req, res) => {
  const { machineId } = req.params;
  const { tag_code } = req.body;

  if (!tag_code) return res.status(400).json({ success: false, message: 'tag_code is required' });

  try {
    const result = await pool.query(
      `UPDATE downtime
       SET tag_id = $1
       WHERE machine_id = $2 AND end_time IS NULL
       RETURNING *`,
      [tag_code, machineId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: `No active downtime found for machine ${machineId}` });
    }

    res.status(200).json({
      success: true,
      message: `Tag ${tag_code} assigned to machine ${machineId}`,
      downtime: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to assign tag', error: err.message });
  }
});

// -------------------------------
// Remove Tag from Active Downtime
// -------------------------------
app.delete('/downtime/:machineId/tag', async (req, res) => {
  const { machineId } = req.params;

  try {
    const result = await pool.query(
      `UPDATE downtime
       SET tag_id = NULL
       WHERE machine_id = $1 AND end_time IS NULL
       RETURNING *`,
      [machineId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: `No active downtime found for machine ${machineId}` });
    }

    res.status(200).json({
      success: true,
      message: `Tag removed from machine ${machineId}`,
      downtime: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to remove tag', error: err.message });
  }
});

// -------------------------------
// Delete Downtime Tag Permanently
// -------------------------------
app.delete('/downtime-tags/:code', async (req, res) => {
  const { code } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM downtime_tags WHERE code = $1 RETURNING *`,
      [code]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: `Downtime tag with code ${code} not found`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Downtime tag deleted successfully',
      tag: result.rows[0]
    });
  } catch (error) {
    console.error(`Error deleting downtime tag ${code}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete downtime tag',
      error: error.message
    });
  }
});


app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'GET /downtime-tags/:plantId',
      'POST /downtime/:machineId/tag',
      'DELETE /downtime/:machineId/tag',
      'DELETE /downtime-tags/:code'
    ]
  });
});


app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Available endpoints: GET /health, GET /downtime-tags/:plantId, POST /downtime/:machineId/tag, DELETE /downtime/:machineId/tag, DELETE /downtime-tags/:code');
});

export default app;
