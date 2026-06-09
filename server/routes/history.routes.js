const express = require('express');
const router = express.Router();
const { getHistory, deleteHistory, clearHistory } = require('../controllers/history.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect); // all history routes require auth

router.get('/',        getHistory);
router.delete('/',     clearHistory);
router.delete('/:id',  deleteHistory);

module.exports = router;
