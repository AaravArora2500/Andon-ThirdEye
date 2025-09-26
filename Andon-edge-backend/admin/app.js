import AdminJS from 'adminjs'
import AdminJSExpress from '@adminjs/express'
import AdminJSSequelize from '@adminjs/sequelize'
import session from 'express-session'
import connectSessionSequelize from 'connect-session-sequelize'
import sequelize from '../db/sequelize.js'
import { DowntimeTags, Shift, Machine, ShiftBreak } from '../db/ORM.js'
import dotenv from 'dotenv'

dotenv.config()
AdminJS.registerAdapter(AdminJSSequelize)

const DEFAULT_ADMIN = {
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_PASSWORD,
}

const authenticate = async (email, password) => {
  if (email === DEFAULT_ADMIN.email && password === DEFAULT_ADMIN.password) {
    return Promise.resolve(DEFAULT_ADMIN)
  }
  return null
}

const setupAdmin = async (app) => {
  const admin = new AdminJS({
    rootPath: '/admin',
    resources: [
      {
        resource: DowntimeTags,
        options: {
          navigation: 'Andon Management & Setup',
          listProperties: [
            'code',
            'category',
            'department',
            'description',
            'plant_id',
            'process_type',
            'sub_category',
            'target_duration'
          ],
          properties: {
            code: { isTitle: true },
          },
        },
      },
      {
        resource: Shift,
        options: {
          navigation: 'Andon Management & Setup',
          listProperties: [
            'shiftcode',
            'shiftname',
            'shiftstartdate',
            'shiftsequence',
            'shiftstarttime',
            'shiftendtime',
            'startdatecorrection',
            'enddatecorrection',
            'shiftended'
          ],
          properties: {
            shiftcode: { isTitle: true },
          },
        },
      },{ 
        resource: ShiftBreak,
        options:{
          navigation: 'Andon Management & Setup',
          listProperties:[
          'shiftbreakcode',
            'shiftbreakdescription',
            'shiftbreaknumber',
            'shiftbreakstarttime',
            'shiftbreakendtime',
            'shiftcode'
          ],
          // properties:{
          //   shiftcode: { isTitle: true},
          // }      
        }
      },
      {
        resource: Machine,
        options: {
          navigation: 'Andon Management & Setup',
          listProperties: [
            'machine_id',
            'company_id',
            'plant_id',
            'line_id',
            'cycle_time',
            'machine_type',
            'process_type',
            'machine_name',
            'uom',
            'active',
            'variant'
          ],
          properties: {
            machine_id: { isVisible: { list: true, filter: true, show: true, edit: false } },
          },
        },
      },
    ],
    branding: {
      companyName: 'Andon Admin',
      logo: false,
      softwareBrothers: false,
    },
  })

  const SequelizeStore = connectSessionSequelize(session.Store)
  const sessionStore = new SequelizeStore({
    db: sequelize,
    tableName: 'sessions',
  })
  await sessionStore.sync()

  const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
    admin,
    {
      authenticate,
      cookieName: 'adminjs',
      cookiePassword: 'sessionsecret',
    },
    null,
    {
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      secret: 'sessionsecret',
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      },
      name: 'adminjs',
    }
  )

  app.use(admin.options.rootPath, adminRouter)

  console.log(`AdminJS is running at http://localhost:3000${admin.options.rootPath}`)
}

export default setupAdmin
