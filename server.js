const express = require('express');

const session =require('express-session');

const path = require('path');

require("dotenv").config();

const passport =require("passport");

require("./config/passport");


const app = express();

const PORT =
process.env.PORT || 3000;

const connectDB =require("./config/db");

connectDB();



// ROUTES

const userRoutes =require("./routes/userRoutes");

const adminRoutes =require("./routes/adminRoutes");

const guestRoutes =require("./routes/guestRoutes");


// VIEW ENGINE

app.set('view engine', 'ejs');

app.set(
  'views',
  path.join(__dirname, 'views')
);



// STATIC

app.use(express.static("public"));

app.use("/uploads",express.static("public/uploads"));



// BODY PARSER

app.use(express.urlencoded({extended: true}));

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

const flash = require('connect-flash');
app.use(flash());
app.use((req, res, next) => {
  res.locals.flashMessages = req.flash();
  next();
});

// PASSPORT

app.use(passport.initialize());

app.use(passport.session());



// ROUTES

app.use("/", guestRoutes);

app.use("/", userRoutes);

app.use("/", adminRoutes);


// SERVER

app.listen(PORT, () => {

  console.log(
    `Server running on http://localhost:${PORT}`
  );

});