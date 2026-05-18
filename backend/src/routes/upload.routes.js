const express = require('express');
const multer = require('multer');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const { uploadImagem } = require('../controller/upload.controller');

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authMiddleware);
router.post('/', upload.single('imagem'), uploadImagem);

module.exports = router;
