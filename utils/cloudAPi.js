
import pool from "../db/index.js"
import dotenv from "dotenv"

dotenv.config();
let API = process.env.CLOUD

async function syncMachines(data) {
  try {
    // 1. Fetch ALL machines for this plant
    // const { data } = await axios.get(`${CLOUD_API}?plantId=${plantId}`);
    // if (!Array.isArray(data) || data.length === 0) {
    //   throw new Error(`No machines found for plant ${plantId}`);
    // }

    // 2. Clear the local table ONCE
   console.log(data);
    await pool.query(`TRUNCATE TABLE machine RESTART IDENTITY;`);
   
    // 3. Insert all machines
    for (const machine of data) {
      let cycleTime = machine?.intermittentStrokes ? machine?.intermittentStrokes : machine?.cycleTime;
      cycleTime = cycleTime || 0;
      const mapped = {
        company_id: (machine.companyId || "jbm").toLowerCase(),
        plant_id: machine.plantId,
        line_id: machine.lineId,
        cycle_time: cycleTime,
        machine_type: machine.machineType || "unknown",
        process_type: machine.processType || "stamping",
        machine_name: machine.machineName || "unknown",
        uom: machine.productionParameterUnit || "strokes",
        active: machine.machineInclusion ?? true,
        variant: machine.slotId || null,
      };

      await pool.query(
        `
        INSERT INTO machine (company_id, plant_id, line_id, cycle_time, machine_type, process_type, machine_name, uom, active, variant)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10);
        `,
        [
          mapped.company_id,
          mapped.plant_id,
          mapped.line_id,
          mapped.cycle_time,
          mapped.machine_type,
          mapped.process_type,
          mapped.machine_name,
          mapped.uom,
          mapped.active,
          mapped.variant,
        ]
      );
    }

    console.log(`Synced ${data.length} machines for plant ${plantId}`);
  } catch (err) {
    console.error("Error syncing machines:", err.message);
  } 
}

async function syncShifts(shifts) {
  try {
    // 1. Fetch plant data from cloud API
    // const { data } = await axios.get(`${CLOUD_API}?plantCode=${plantId}`);
    // if (!Array.isArray(data) || data.length === 0) {
    //   throw new Error(`No plant data found for plant ${plantId}`);
    // }

    // const plant = data[0];
    // const shifts = plant.shifts || [];
    if (!shifts.length) {
      throw new Error(`No shifts found`);
    }

    // 2. Clear old shifts for this plant
    await pool.query(`TRUNCATE TABLE shift CASCADE;`);

    // 3. Insert shifts
    for (const shift of shifts) {
      await pool.query(
        `
        INSERT INTO shift (
          shiftcode, shiftname, shiftstartdate,
          startdatecorrection, shiftsequence,
          enddatecorrection, shiftended,
          shiftstarttime, shiftendtime
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (shiftcode) DO UPDATE
        SET
          shiftname = EXCLUDED.shiftname,
          shiftstartdate = EXCLUDED.shiftstartdate,
          startdatecorrection = EXCLUDED.startdatecorrection,
          shiftsequence = EXCLUDED.shiftsequence,
          enddatecorrection = EXCLUDED.enddatecorrection,
          shiftended = EXCLUDED.shiftended,
          shiftstarttime = EXCLUDED.shiftstarttime,
          shiftendtime = EXCLUDED.shiftendtime;
        `,
        [
          shift.shiftCode,
          shift.shiftName,
          shift.shiftStartDate,
          shift.startDateCorrection === 1,
          shift.shiftSequence,
          shift.endDateCorrection === 1,
          false, // shiftended default
          shift.shiftStartTime,
          shift.shiftEndTime,
        ]
      );
    }

    console.log(`Synced ${shifts.length} shifts for plant ${plantId}`);
  } catch (err) {
    console.error("Error syncing shifts:", err.message);
  }
}

// Sync shift breaks only
export async function syncShiftBreaks(shifts) {
  for (const shift of shifts) {
    const shiftBreaks = shift.shiftBreaks || [];
    for (const sb of shiftBreaks) {
      await pool.query(
        `
        INSERT INTO shiftbreak (
          shiftbreakcode, shiftbreakdescription, shiftbreaknumber,
          shiftbreakstarttime, shiftbreakendtime, shiftcode
        )
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (shiftbreakcode) DO UPDATE SET
          shiftbreakdescription = EXCLUDED.shiftbreakdescription,
          shiftbreaknumber = EXCLUDED.shiftbreaknumber,
          shiftbreakstarttime = EXCLUDED.shiftbreakstarttime,
          shiftbreakendtime = EXCLUDED.shiftbreakendtime,
          shiftcode = EXCLUDED.shiftcode;
        `,
        [
          sb.shiftBreakCode,
          sb.shiftBreakDescription,
          parseInt(sb.shiftBreakNumber || "1", 10),
          sb.shiftBreakStartTime,
          sb.shiftBreakEndTime,
          shift.shiftCode, // FK to shift
        ]
      );
    }
  }
  console.log(`Synced all shift breaks`);
}

export async function syncDowntimeTags(tags) {
  // Delete old tags for this plant
  await pool.query(`TRUNCATE TABLE downtime_tags CASCADE;`);

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

//   console.log(`Synced ${tags.length} downtime tags for plant ${plantId}`);
}


export const fetchMachineData = async(plantId)=>{
    //api
    //fetch plant id from setup table sync cloud to populate machine table 
  try{  let res = await fetch(`${API}/edge/machine-info?plantId=${plantId}`, {method: 'GET', headers: {
        'auth': 'edge@123'
    }});
    res = await res.json();
    // console.log(res);
    
syncMachines(res)
}
 catch(err){
    console.log(err);
 }
}
export const fetchDownTimeReasons = async(plantId)=>{
    //api
    let res = await fetch(`${API}/edge/downtime-reasons?plantId=${plantId}`, {method: 'GET', headers: {
        'auth': 'edge@123'
    }});
    res = await res.json() || [];
    syncDowntimeTags(res);
}
export const fetchPlantDetails = async(plantId)=>{
    //api
    let res = await fetch(`${API}/edge/plant-info?plantId=${plantId}`, {method: 'GET', headers: {
        'auth': 'edge@123'
    }});
    res = await res.json();
    let plant = res[0] || {};
    let shifts = plant?.shifts || []  
     syncShifts(shifts);  
     syncShiftBreaks(shifts);
}
