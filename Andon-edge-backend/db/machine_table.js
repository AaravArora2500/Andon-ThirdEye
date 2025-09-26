// import dotenv from "dotenv";
// import pool from "./index.js";

// dotenv.config();

// // Queries
// const dropUniqueVariantConstraint = `
//   DO $$
//   BEGIN
//     IF EXISTS (
//       SELECT 1
//       FROM information_schema.table_constraints
//       WHERE constraint_name = 'unique_variant'
//         AND table_name = 'shift_summary'
//     ) THEN
//       ALTER TABLE shift_summary DROP CONSTRAINT unique_variant;
//     END IF;
//   END$$;
// `;

// const addUniqueVariantConstraint = `
//   ALTER TABLE shift_summary
//   ADD CONSTRAINT unique_variant UNIQUE (variant);
// `;

// const insertMissingVariants = `
//   INSERT INTO shift_summary (
//     plant_id, line_id, machine_id, summary_date, shift_code,
//     variant, production_quantity, target_quantity
//   )
//   VALUES
//     ('PLANT001', 'LINE01', 'MACHINE1', CURRENT_DATE, 'SHIFT1', 'VARIANT_A', 100, 120),
//     ('PLANT002', 'LINE02', 'MACHINE2', CURRENT_DATE, 'SHIFT1', 'VARIANT_B', 80, 100)
//   ON CONFLICT (variant) DO NOTHING;
// `;

// const createMachineTableQuery = `
//   DROP TABLE IF EXISTS machine CASCADE;

//   CREATE TABLE machine (
//     machine_id SERIAL PRIMARY KEY,
//     company_id TEXT DEFAULT 'jbm',
//     plant_id TEXT NOT NULL,
//     line_id TEXT NOT NULL,
//     cycle_time INTEGER NOT NULL,
//     machine_type TEXT NOT NULL,
//     process_type TEXT NOT NULL,
//     machine_name TEXT NOT NULL,
//     uom TEXT NOT NULL,
//     active BOOLEAN DEFAULT TRUE,
//     variant TEXT,
//     CONSTRAINT fk_variant
//       FOREIGN KEY (variant)
//       REFERENCES shift_summary(variant)
//       ON DELETE SET NULL
//   );
// `;

// const machines = [
//   {
//     plant_id: 'PLANT001',
//     line_id: 'LINE01',
//     cycle_time: 45,
//     machine_type: 'Welding Robot',
//     process_type: 'Welding',
//     machine_name: 'WELD-X1',
//     uom: 'seconds',
//     active: true,
//     variant: 'VARIANT_A',
//   },
//   {
//     plant_id: 'PLANT001',
//     line_id: 'LINE01',
//     cycle_time: 60,
//     machine_type: 'Inspection Camera',
//     process_type: 'Inspection',
//     machine_name: 'CAM-INSPECT-A',
//     uom: 'seconds',
//     active: true,
//     variant: 'VARIANT_A',
//   },
//   {
//     plant_id: 'PLANT002',
//     line_id: 'LINE02',
//     cycle_time: 75,
//     machine_type: 'Press Machine',
//     process_type: 'Stamping',
//     machine_name: 'PRESS-7Z',
//     uom: 'seconds',
//     active: false,
//     variant: 'VARIANT_B',
//   }
// ];

// async function setupMachineTable() {
//   try {
//     console.log(" Dropping existing variant constraint (if exists)...");
//     try {
//       await pool.query(dropUniqueVariantConstraint);
//     } catch (err) {
//       console.warn(" Constraint may already be dropped:", err.message);
//     }

//     console.log(" Adding UNIQUE constraint on shift_summary.variant...");
//     try {
//       await pool.query(addUniqueVariantConstraint);
//     } catch (err) {
//       console.warn(" Constraint may already exist:", err.message);
//     }

//     console.log(" Inserting missing variants into shift_summary...");
//     await pool.query(insertMissingVariants);

//     console.log(" Creating machine table...");
//     await pool.query(createMachineTableQuery);

//     console.log(" Seeding machine table...");
//     for (const machine of machines) {
//       const {
//         plant_id,
//         line_id,
//         cycle_time,
//         machine_type,
//         process_type,
//         machine_name,
//         uom,
//         active,
//         variant
//       } = machine;

//       await pool.query(
//         `INSERT INTO machine 
//         (plant_id, line_id, cycle_time, machine_type, process_type, machine_name, uom, active, variant)
//         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
//         [plant_id, line_id, cycle_time, machine_type, process_type, machine_name, uom, active, variant]
//       );
//     }

//     console.log("Machine table created and seeded successfully.");
//   } catch (error) {
//     console.error(" Error in machine setup:", error);
//   } finally {
//     await pool.end();
//     console.log("PostgreSQL connection closed.");
//   }
// }

// setupMachineTable();
