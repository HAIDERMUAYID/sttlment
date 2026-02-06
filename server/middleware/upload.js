const multer = require('multer');
const path = require('path');
const { getAvatarsDir } = require('../utils/uploadPath');

// إعداد multer لرفع الصور (المسار من UPLOAD_PATH إن وُجد — للتخزين الدائم)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, getAvatarsDir());
  },
  filename: (req, file, cb) => {
    // اسم الملف: userId_timestamp.extension
    const userId = req.user?.id || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${userId}_${timestamp}${ext}`;
    cb(null, filename);
  },
});

// فلترة الملفات - قبول الصور فقط
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('يُسمح فقط بملفات الصور (JPEG, JPG, PNG, GIF, WEBP)'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: fileFilter,
});

module.exports = upload;
