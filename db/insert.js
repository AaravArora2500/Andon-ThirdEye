// import pool from './index.js';

// const insertSummary = async () => {
//   const query = `
//     INSERT INTO shift_summary (
//       plant_id, line_id, machine_id, summary_date,
//       shift_code, variant, production_quantity,
//       target_quantity, last_counter, updated_on, active,uom,production_rate,actual_run_time,
//   planned_production_time
//     ) VALUES (
//       $1, $2, $3, $4,
//       $5, $6, $7,
//       $8, $9, $10, $11, $12, $13,$14,$15
//     );
//   `;
// //uom
//   const values = [
//     'PLANT_1',
//     'LINE_A',
//     'MACH_01',
//     '2025-06-27',
//     'SHIFT_A',
//     'VariantX',
//     120,
//     150,
//     95,
//     new Date(),
//     false,
//     'pcs',
//      10,
//      3600,
//      1500
//   ];

//   try {
//     await pool.query(query, values);
//     console.log("Sample shift summary inserted");
//   } catch (err) {
//     console.error("Insert error:", err);
//   } finally {
//     await pool.end();
//   }
// };

// insertSummary();
