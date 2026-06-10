const Admin = require('../../models/adminModel');
const User = require('../../models/userModel');
const Category = require('../../models/categoryModel');
const Course = require('../../models/courseModel');
const Module = require('../../models/moduleModel');
const Lesson = require('../../models/lessonModel');
const Resource = require('../../models/resourceModel');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const passport = require('passport');
const createTransporter = require('../../config/mail');

exports.getUserLogout = (req, res) => {

  delete req.session.user;

  req.session.save(err => {

    if (err) {
      console.log(err);
      return res.redirect("/login");
    }

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private"
    );

    res.redirect("/login");
  });

};

