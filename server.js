const express = require('express');

const session =require('express-session');

const path = require('path');

require("dotenv").config();

const passport =require("passport");

require("./config/passport");

const flash =require("connect-flash");

const app = express();

const PORT =
process.env.PORT || 3000;

const connectDB =require("./config/db");

connectDB();



// ROUTES

const userRoutes =require("./routes/userRoutes");

const adminRoutes =require("./routes/adminRoutes");


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



// PASSPORT

app.use(passport.initialize());

app.use(passport.session());


// FLASH

app.use(flash());



// GLOBAL FLASH

app.use((req, res, next) => {

  res.locals.error =
    req.flash("error");

  res.locals.success =
    req.flash("success");

  next();

});



// ROUTES

app.use("/", userRoutes);

app.use("/", adminRoutes);



// SERVER

app.listen(PORT, () => {

  console.log(
    `Server running on http://localhost:${PORT}`
  );

});