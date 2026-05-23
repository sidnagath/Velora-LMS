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



const fileFilter =
(req, file, cb) => {

  // ALLOWED IMAGE MIME TYPES

  const allowedImageTypes = [

    "image/jpeg",
    "image/png",
    "image/webp"

  ];



  // ALLOWED VIDEO MIME TYPES

  const allowedVideoTypes = [

    "video/mp4",
    "video/quicktime"

  ];



  // =========================
  // THUMBNAIL / AVATAR
  // =========================

  if (

    file.fieldname === "thumbnail" ||

    file.fieldname === "avatar"

  ) {

    if (

      allowedImageTypes.includes(
        file.mimetype
      )

    ) {

      return cb(null, true);

    }



    return cb(
      new Error(
        "Only image files allowed"
      )
    );

  }



  // =========================
  // TRAILER VIDEO
  // =========================

  if (
    file.fieldname === "trailer" || file.fieldname === "video"
  ) {

    if (

      allowedVideoTypes.includes(
        file.mimetype
      )

    ) {

      return cb(null, true);

    }



    return cb(
      new Error(
        "Only MP4 or MOV videos allowed"
      )
    );

  }



  // =========================
  // COURSE MATERIALS
  // =========================

  if (file.fieldname === "resourceFile") {
    const allowedMimeTypes = [
      "application/pdf",
      "application/zip",
      "application/x-zip-compressed",
      "application/octet-stream",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/quicktime"
    ];

    if (
      allowedMimeTypes.includes(file.mimetype) ||
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("text/")
    ) {
      return cb(null, true);
    }

    return cb(
      new Error(
        "Invalid file type for resources. Allowed: PDF, ZIP, DOCX, TXT, Images, Videos"
      )
    );
  }

  // =========================
  // DEFAULT BLOCK
  // =========================

  cb(
    new Error(
      "Invalid file type"
    )
  );

};

const upload = multer({

  storage,

  fileFilter

});

module.exports = upload;