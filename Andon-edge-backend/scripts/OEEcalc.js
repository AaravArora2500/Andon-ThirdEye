// import pool from "../db/index.js";

// function calculateOEE({ runTimeSec, plannedTimeSec, actualOutput, targetOutput, goodOutput }) {
//   const availability = runTimeSec / plannedTimeSec;
//   const performance = actualOutput / targetOutput;
//   const quality = 1;
//   const oee = availability * performance * quality;
//   return Number((oee * 100).toFixed(2));
// }

// const updateOEEForShifts = async () => {
//   try {
//     //Fetch from the view of shift_summary
//     const { rows } = await pool.query(`SELECT * FROM shift_oee_view`);

//     for (const shift of rows) {
//       let shiftStart = new Date(shift.created_on);
//       let shiftEnd = new Date(shift.updated_on);

//       if (shiftEnd < shiftStart) {
//         [shiftStart, shiftEnd] = [shiftEnd, shiftStart];
//       }

//       const shiftDurationSec = (shiftEnd - shiftStart) / 1000;
//       const plannedProductionTimeSec = shiftDurationSec;
//       const runTimeSec = shiftDurationSec;

//       const actualOutput = shift.production_quantity;
//       const targetOutput = shift.target_quantity;
//       const goodOutput = actualOutput;

//       if (plannedProductionTimeSec <= 0 || actualOutput <= 0 || targetOutput <= 0) {
//         console.log(`Skipping shift ID ${shift.id} due to invalid data`);
//         continue;
//       }

//       const oee = calculateOEE({
//         runTimeSec,
//         plannedTimeSec: plannedProductionTimeSec,
//         actualOutput,
//         targetOutput,
//         goodOutput,
//       });

//       // 2. Update the original shift_summary table
//       await pool.query(
//         `UPDATE shift_summary SET oee = $1 WHERE id = $2`,
//         [oee, shift.id]
//       );

//       console.log(`Updated OEE ${oee}% for shift ID: ${shift.id}`);
//     }
//   } catch (err) {
//     console.error("Error updating OEE:", err);
//   }
// };

// updateOEEForShifts();

// export default updateOEEForShifts;





