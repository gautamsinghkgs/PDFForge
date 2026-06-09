const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, changePassword, getDashboard } = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect); // all user routes require auth

router.get('/profile',         getProfile);
router.put('/profile',         updateProfile);
router.put('/change-password', changePassword);
router.get('/dashboard',       getDashboard);

module.exports = router;
