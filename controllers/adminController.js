const Admin = require('../models/adminModel');
const bcrypt = require('bcrypt');
const User = require("../models/userModel");

exports.getAdminLogin=(req, res) => {
  
   if (req.session.admin) {
    return res.redirect("/admin-dashboard");
  }

    res.render("pages/guest/admin-login", { 
        title: 'Velora - Admin Login', 
        isLoggedIn: false
    });
};


exports.postAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.render(
        "pages/guest/admin-login",
        {
          title: 'Admin Login',
          error: ['Invalid email or password'],
          isLoggedIn: false,
        }
      );
    }

    const isMatch =
      await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.render(
        "pages/guest/admin-login",
        {
          title: 'Admin Login',
          error: ['Invalid email or password'],
          isLoggedIn: false
        }
      );
    }

    req.session.admin = {
      id: admin._id,
      email: admin.email
    };


    req.session.save(err => {
      if (err) {
        console.log(err);
        return res.redirect("/admin-login");
      }
      return res.redirect("/admin-dashboard");
    });
  }

  catch (err) {
    console.log(err);
    res.redirect('/admin-login');
  }
}

exports.getAdminDashboard= (req, res) => {

    // In a real app, you'd check auth state here.

const activities = [
    {
      name: "John Doe",
      email: "john@example.com",
      course: "React Mastery",
      status: "completed",
      amount: 120
    },
    {
      name: "Sarah Lee",
      email: "sarah@example.com",
      course: "Node.js Bootcamp",
      status: "pending",
      amount: 80
    }
  ];

    res.render('pages/admin/dashboard/dashboard', { 
        title: 'Velora - Admin Dashboard', 
        isLoggedIn: true,
        activities,
        isAdmin: true
    });
  }


exports.getAdminUsers = async (req, res) => {

  try {

    // SEARCH
    const search =
      req.query.search || "";

    // PAGINATION
    const page =
      parseInt(req.query.page) || 1;

    const limit = 5;

    const skip =
      (page - 1) * limit;

    // FILTER
    const filter = {

      isDeleted: false,

      $or: [

        {
          name: {
            $regex: search,
            $options: "i"
          }
        },

        {
          email: {
            $regex: search,
            $options: "i"
          }
        },

        {
          status: {
            $regex: search,
            $options: "i"
          }
        }

      ]

    };

    // USERS
    const users =
      await User.find(filter)

      .sort({ createdAt: -1 })

      .skip(skip)

      .limit(limit);

    // TOTAL USERS
    const totalUsers =
      await User.countDocuments(filter);

    // TOTAL PAGES
    const totalPages =
      Math.ceil(totalUsers / limit);

    res.render(
      "pages/admin/user-management/users",
      {

        title:
          "Velora - Admin Users",

        isLoggedIn: true,
        
        isAdmin: true,

        users,

        currentPage: page,

        totalPages,
        
        totalUsers,

        search

      }
    );

  }

  catch (err) {

    console.log(err);

    res.redirect("/admin-dashboard");

  }

};

exports.getAdminCreateUser = (req, res) => {
    res.render('pages/admin/user-management/create-user', { 
        title: 'Velora - Admin Create User', 
        isLoggedIn: true,
        isAdmin: true
    });
};

exports.postAdminCreateUser = async (req, res) => {

  try {

    const {
      name,
      email,
      phone,
      password,
      status
    } = req.body;



    // TRIM VALUES

    const trimmedName =
      name?.trim();

    const trimmedEmail =
      email?.trim();

    const trimmedPhone =
      phone?.trim();

    const trimmedPassword =
      password?.trim();



    // REGEX

    const nameRegex =
      /^[A-Za-z ]{3,30}$/;

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const phoneRegex =
      /^[0-9]{10}$/;

    const passwordRegex =
      /^(?=.*[A-Z])(?=.*[0-9]).{6,}$/;



    // REQUIRED FIELD VALIDATION

    if (
      !trimmedName ||
      !trimmedEmail ||
      !trimmedPassword
    ) {

      req.flash(
        "error",
        "Name, email and password are required"
      );

      return res.redirect(
        "/admin-create-user"
      );
    }



    // NAME VALIDATION

    if (
      !nameRegex.test(trimmedName)
    ) {

      req.flash(
        "error",
        "Name should contain only letters"
      );

      return res.redirect(
        "/admin-create-user"
      );
    }



    // EMAIL VALIDATION

    if (
      !emailRegex.test(trimmedEmail)
    ) {

      req.flash(
        "error",
        "Invalid email format"
      );

      return res.redirect(
        "/admin-create-user"
      );
    }



    // PHONE VALIDATION
    // OPTIONAL FIELD

    if (
      trimmedPhone &&
      !phoneRegex.test(trimmedPhone)
    ) {

      req.flash(
        "error",
        "Enter valid 10 digit phone number"
      );

      return res.redirect(
        "/admin-create-user"
      );
    }



    // PASSWORD VALIDATION

    if (
      !passwordRegex.test(
        trimmedPassword
      )
    ) {

      req.flash(
        "error",

        "Password must contain uppercase letter, number and minimum 6 characters"
      );

      return res.redirect(
        "/admin-create-user"
      );
    }



    // DUPLICATE EMAIL CHECK

    const existingUser =
      await User.findOne({

        email: trimmedEmail

      });

    if (existingUser) {

      req.flash(
        "error",
        "Email already exists"
      );

      return res.redirect(
        "/admin-create-user"
      );
    }



    // HASH PASSWORD

    const hashedPassword =
      await bcrypt.hash(
        trimmedPassword,
        10
      );



    // IMAGE

    let avatar = "";

    if (req.file) {

      avatar =
        "/uploads/" +
        req.file.filename;
    }



    // CREATE USER

    await User.create({

      name: trimmedName,

      email: trimmedEmail,

      phone: trimmedPhone,

      password: hashedPassword,

      status,

      avatar

    });



    req.flash(
      "success",
      "User created successfully"
    );



    res.redirect(
      "/admin-users"
    );

  }

  catch (err) {

    console.log(err);

    req.flash(
      "error",
      "Something went wrong"
    );

    res.redirect(
      "/admin-create-user"
    );

  }

};

exports.getAdminEditUser = async(req, res) => {

try{

  const user=await User.findById(req.params.id);
  if(!user){
    return res.redirect("/admin-users");
  }
  
   res.render('pages/admin/user-management/edit-user', { 
        title: 'Velora - Admin Edit User', 
        isLoggedIn: true,
        isAdmin: true,
        user
    });
}

catch(err){
   console.log(err);
   res.redirect("/admin-users");
  }
   
};


exports.postAdminEditUser = async (req, res) => {

  try {

    const {
      name,
      email,
      phone,
      status,
      password
    } = req.body;



    // TRIM VALUES

    const trimmedName =
      name?.trim();

    const trimmedEmail =
      email?.trim();

    const trimmedPassword =
  password? password.trim(): "";

    const trimmedPhone =
    phone? String(phone).trim(): "";


    // REGEX

    const nameRegex =
      /^[A-Za-z ]{3,30}$/;

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const phoneRegex =
       /^[6-9]\d{9}$/;

    const passwordRegex =
      /^(?=.*[A-Z])(?=.*[0-9]).{6,}$/;


      // FIND CURRENT USER

    const currentUser =
      await User.findById(
        req.params.id
      );

    if (!currentUser) {

      req.flash(
        "error",
        "User not found"
      );

      return res.redirect(
        "/admin-users"
      );
    }

    // GOOGLE ACCOUNT PROTECTION

if (
  currentUser.authProvider ===
  "google"
) {

  // PHONE VALIDATION

  if (
    trimmedPhone &&
    !phoneRegex.test(trimmedPhone)
  ) {

    req.flash(
      "error",
      "Enter valid 10 digit phone number"
    );

    return res.redirect(
      `/admin-edit-user/${req.params.id}`
    );

  }



  await User.findByIdAndUpdate(

    req.params.id,

    {
      phone: trimmedPhone,
      status
    }

  );



  req.flash(

    "success",

    "Google account updated successfully"
  );



  return res.redirect(
    "/admin-users"
  );

}

    // REQUIRED VALIDATION

    if (
      !trimmedName ||
      !trimmedEmail
    ) {

      req.flash(
        "error",
        "Name and email are required"
      );

      return res.redirect(
        `/admin-edit-user/${req.params.id}`
      );
    }



    // NAME VALIDATION

    if (
      !nameRegex.test(trimmedName)
    ) {

      req.flash(
        "error",
        "Name should contain only letters"
      );

      return res.redirect(
        `/admin-edit-user/${req.params.id}`
      );
    }



    // EMAIL VALIDATION

    if (
      !emailRegex.test(trimmedEmail)
    ) {

      req.flash(
        "error",
        "Invalid email format"
      );

      return res.redirect(
        `/admin-edit-user/${req.params.id}`
      );
    }



    // PHONE VALIDATION
    // OPTIONAL FIELD

    if (
      trimmedPhone &&
      !phoneRegex.test(trimmedPhone)
    ) {

      req.flash(
        "error",
        "Enter valid 10 digit phone number"
      );

      return res.redirect(
        `/admin-edit-user/${req.params.id}`
      );
    }



    // PASSWORD VALIDATION
    // ONLY IF PASSWORD EXISTS

    if (
      trimmedPassword &&
      !passwordRegex.test(
        trimmedPassword
      )
    ) {

      req.flash(
        "error",

        "Password must contain uppercase letter, number and minimum 6 characters"
      );

      return res.redirect(
        `/admin-edit-user/${req.params.id}`
      );
    }


    // DUPLICATE EMAIL CHECK

    const existingUser =
      await User.findOne({

        email: trimmedEmail,

        _id: {
          $ne: req.params.id
        }

      });

    if (existingUser) {

      req.flash(
        "error",
        "Email already exists"
      );

      return res.redirect(
        `/admin-edit-user/${req.params.id}`
      );
    }



    // UPDATE DATA

    const updateData = {

      name: trimmedName,

      email: trimmedEmail,

      phone: trimmedPhone,

      status

    };



    // AVATAR

    if (req.file) {

      updateData.avatar =
        "/uploads/" +
        req.file.filename;
    }



    // PASSWORD UPDATE

    if (trimmedPassword) {

      updateData.password =
        await bcrypt.hash(
          trimmedPassword,
          10
        );
    }



    // UPDATE USER

    await User.findByIdAndUpdate(
      req.params.id,
      updateData
    );



    req.flash(
      "success",
      "User updated successfully"
    );



    res.redirect(
      "/admin-users"
    );

  }

  catch (err) {

    console.log(err);

    req.flash(
      "error",
      "Something went wrong"
    );

    res.redirect(
      "/admin-users"
    );

  }

};


exports.deleteUser = async (req, res) => {

  try {

    await User.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        status: "inactive"
      }
    );

    res.redirect("/admin-users");

  } catch (err) {

    console.log(err);

    res.redirect("/admin-users");
  }
};

exports.getAdminLogout=(req, res) => {
     req.session.destroy(err => {
    if (err) {
      console.log(err);
      return res.redirect('/');
    }

    res.clearCookie('connect.sid'); // important
    return res.redirect('/admin-login');
  });

}
