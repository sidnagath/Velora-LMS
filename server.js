import 'dotenv/config.js';
import express from 'express';
import session from 'express-session';
import path from 'path';
import passport from 'passport';
import { flashLocals } from './middleware/flashMiddleware.js';
import { noCache } from './middleware/noCache.js';
import { notFoundHandler } from './middleware/errorMiddleware.js';
import connectDB from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import guestRoutes from './routes/guestRoutes.js';
import flash from 'connect-flash';
import './config/passport.js';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



// CUSTOM MIDDLEWARE

const app = express();

const PORT =
  process.env.PORT || 3000;

connectDB();

// ROUTES

// VIEW ENGINE

app.set('view engine', 'ejs');

app.set(
  'views',
  path.join(__dirname, 'views')
);

// STATIC

app.use(express.static("public"));

app.use("/uploads", express.static("public/uploads"));

// BODY PARSER

app.use(express.urlencoded({ extended: true }));

app.use(express.json());

// SESSION

app.use(session({

  secret:
    process.env.SESSION_SECRET ||
    "veloraSecret",

  resave: false,

  saveUninitialized: false,

  cookie: {

    httpOnly: true,

    secure: false,

    maxAge:
      1000 * 60 * 60 * 24

  }

}));

app.use(flash());
app.use(flashLocals);

// PASSPORT

app.use(passport.initialize());

app.use(passport.session());

// DISABLE CACHE TO PREVENT BACK BUTTON ISSUES
app.use(noCache);

// ROUTES

app.use("/", guestRoutes);

app.use("/", userRoutes);

app.use("/", adminRoutes);

// 404 CATCH-ALL ROUTE
app.use(notFoundHandler);

// SERVER

app.listen(PORT, () => {

  console.log(
    `Server running on http://localhost:${PORT}`
  );

});