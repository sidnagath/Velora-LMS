const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('./models/adminModel');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("DB connected"))
  .catch(err => console.log(err));

async function createAdmin() {
  const hashedPassword = await bcrypt.hash('Velora@2026!', 10);

  await Admin.create({
    email: 'admin@velora.com',
    password: hashedPassword
  });

  console.log("Admin created successfully");
  process.exit(); // stops script
}

createAdmin();