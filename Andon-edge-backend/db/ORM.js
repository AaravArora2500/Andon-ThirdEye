import { DataTypes} from 'sequelize'
import sequelize from './sequelize.js'

// Downtime Tags
const DowntimeTags = sequelize.define('downtime_tags', {
  code: {
    type: DataTypes.STRING(20),
    primaryKey: true
  },
  category: DataTypes.STRING(50),
  department: DataTypes.STRING(50),
  description: DataTypes.TEXT,
  plant_id: DataTypes.INTEGER,
  process_type: DataTypes.STRING(50),
  sub_category: DataTypes.STRING(50),
  target_duration: DataTypes.REAL
}, {
  tableName: 'downtime_tags',
  timestamps: false
})
//To get the data from the cloud and the edge data to sync and also to note that the data shall not be duplicated 
// Shift
const Shift = sequelize.define('shift', {
  shiftcode: {
    type: DataTypes.TEXT,
    primaryKey: true
  },
  shiftname: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  shiftstartdate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  startdatecorrection: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  shiftsequence: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  enddatecorrection: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  shiftended: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  shiftstarttime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  shiftendtime: {
    type: DataTypes.TIME,
    allowNull: false
  }
}, {
  tableName: 'shift',
  timestamps: false
})
//ShiftBreaks
const ShiftBreak = sequelize.define('shiftbreak',{
  shiftbreakcode: {
    type: DataTypes.TEXT,
    primaryKey: true
  },
  shiftbreakdescription:{
    type: DataTypes.TEXT,
    allowNull:false
  },
  shiftbreaknumber:{
    type: DataTypes.INTEGER,
    allowNull:false
  },
  shiftbreakstarttime:{
    type: DataTypes.TIME,
    allowNull:false
  },
  shiftbreakendtime:{
    type: DataTypes.TIME,
    allowNull:false
  },
  shiftcode:{
 type: DataTypes.TEXT,
  allowNull:false
  }

},{
  tableName:'shiftbreak',
  timestamps: false
})
// Machine
const Machine = sequelize.define('machine', {
  machine_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  company_id: {
    type: DataTypes.TEXT,
    defaultValue: 'jbm'
  },
  plant_id: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  line_id: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  cycle_time: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  machine_type: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  process_type: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  machine_name: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  uom: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  variant: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'machine',
  timestamps: false
})

export { DowntimeTags, Shift, Machine, ShiftBreak }
