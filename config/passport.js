const passport = require("passport");

const GoogleStrategy =
require("passport-google-oauth20")
.Strategy;


const User =
require("../models/userModel");


passport.use(

new GoogleStrategy(

{
  clientID:
    process.env.GOOGLE_CLIENT_ID,

  clientSecret:
    process.env.GOOGLE_CLIENT_SECRET,

  callbackURL:
    process.env.GOOGLE_CALLBACK_URL
},

async (
  accessToken,
  refreshToken,
  profile,
  done
) => {

  try {

    const email =
      profile.emails[0].value;


    let user =
      await User.findOne({
        email
      });

    // SIGNUP IF NEW

    if(!user){

      user =
await User.create({

  name:
    profile.displayName,

  email,

  avatar:
    profile.photos[0].value,

  password: "",

  authProvider:
    "google",

  googleId:
    profile.id

});

    }

    return done(null, user);

  }

  catch(err){

    return done(err, null);
  }

}));


passport.serializeUser(
(user, done) => {

  done(null, user.id);

});



passport.deserializeUser(
async (id, done) => {

  try {

    const user =
      await User.findById(id);

    done(null, user);

  }

  catch (err) {

    done(err, null);

  }

});

