app.post("/config", async (req, res) => {
  const { plantId, plantName } = req.body;

  if (!plantId || !plantName) {
    return res.status(400).json({ error: "plantId and plantName are required" });
  }

  try {
    // Check if the plant exists
    const result = await pool.query(
      "SELECT * FROM setup_info WHERE plant_id = $1",
      [plantId]
    );

    if (result.rows.length > 0) {
      // Plant already exists, return its config
      return res.json({
        exists: true,
        plant: result.rows[0],
      });
    }

    // Create new record (setup not completed yet)
    const insert = await pool.query(
      `INSERT INTO setup_info (plant_id, plant_name, api_token, setup_completed)
       VALUES ($1, $2, '', false)
       RETURNING *`,
      [plantId, plantName]
    );

    return res.json({
      exists: false,
      plant: insert.rows[0],
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error while fetching/creating config." });
  }
});
