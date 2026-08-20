const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('./models/adminModel');

mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/velora-trial")
  .then(() => console.log("DB connected"))
  .catch(err => console.log(err));

async function createAdmin() {
  const hashedPassword = await bcrypt.hash('admin123', 10);

  await Admin.create({
    email: 'admin@velora.com',
    password: hashedPassword
  });

  console.log("Admin created successfully");
  process.exit(); // stops script
}

createAdmin();