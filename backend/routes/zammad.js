const express = require('express');
const router = express.Router();
const zammadService = require('../services/zammadService');
const cache = require('../middleware/cache');

// GET tickets (Cached for 30s)
router.get('/tickets', cache(30), async (req, res) => {
  try {
    const data = await zammadService.getTickets();
    
    if (Array.isArray(data)) {
      data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (data && Array.isArray(data.tickets)) {
      data.tickets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    
    res.json({ success: true, data, message: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

module.exports = router;
