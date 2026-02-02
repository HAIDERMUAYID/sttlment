const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').slice(0, 20) || '.bin';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const ok = /\.(pdf|doc|docx|xls|xlsx|png|jpe?g|gif|txt)$/i.test(file.originalname);
    cb(null, !!ok);
  },
});

module.exports = { upload, uploadDir };
