const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({

  destination: (req, file, cb) => {

    cb(null, "public/uploads");

  },

  filename: (req, file, cb) => {

    const uniqueName =
      Date.now() + path.extname(file.originalname);

    cb(null, uniqueName);

  }

});



const fileFilter = (req, file, cb) => {

  const allowedTypes = /jpg|jpeg|png|webp/;

  const ext =
    allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );

  const mime =
    allowedTypes.test(file.mimetype);

  if (ext && mime) {

    cb(null, true);

  }

  else {

    cb(new Error("Only images allowed"));

  }

};



const upload = multer({

  storage,

  fileFilter

});



module.exports = upload;