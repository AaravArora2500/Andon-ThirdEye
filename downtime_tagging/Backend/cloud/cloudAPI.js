import pool from "../db/dbconfig.js";
import dotenv from "dotenv";

dotenv.config();
let API = process.env.CLOUD;

export async function syncDowntimeTags(tags) {
  try {
    // Clear existing tags
    await pool.query(`TRUNCATE TABLE downtime_tags CASCADE;`);

    // Insert new tags
    for (const tag of tags) {
      await pool.query(
        `
        INSERT INTO downtime_tags (
          code, category, department, description,
          plant_id, process_type, sub_category, target_duration
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (code) DO UPDATE SET
          category = EXCLUDED.category,
          department = EXCLUDED.department,
          description = EXCLUDED.description,
          plant_id = EXCLUDED.plant_id,
          process_type = EXCLUDED.process_type,
          sub_category = EXCLUDED.sub_category,
          target_duration = EXCLUDED.target_duration;
        `,
        [
          tag.code,
          tag.category,
          tag.department,
          tag.description,
          parseInt(tag.plantId, 10),
          tag.processType,
          tag.subCategory,
          parseFloat(tag.targetDuration || 0),
        ]
      );
    }

    console.log(`Synced ${tags.length} downtime tags`);
  } catch (err) {
    console.error("Error syncing downtime tags:", err.message);
  }
}

/**
 * Fetch downtime tags from cloud API and sync them
 */
export const fetchDownTimeReasons = async (plantId) => {
  try {
    let res = await fetch(`${API}/edge/downtime-tags?plantId=${plantId}`, {
      method: "GET",
      headers: { auth: "edge@123" },
    });

    res = await res.json();

    if (!Array.isArray(res) || res.length === 0) {
      throw new Error(`No downtime tags found for plant ${plantId}`);
    }

    await syncDowntimeTags(res);
  } catch (err) {
    console.error("Error fetching downtime tags:", err.message);
  }
};
