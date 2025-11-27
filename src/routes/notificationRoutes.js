// src/routes/notificationRoutes.js
const express = require('express');
const { testSend, registerPush, listNotifications } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware'); // adapt path

const router = express.Router();

router.post('/test', protect, testSend);
router.post('/subscribe', protect, registerPush);
router.get('/me', protect, listNotifications);

module.exports = router;
