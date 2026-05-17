const express = require('express');
const router = express.Router();
const { login, callback, status, logout } = require('../controller/auth.controller');

router.get('/login', login);
router.get('/callback', callback);
router.get('/status', status);
router.post('/logout', logout);

module.exports = router;
