const express = require('express');
const router = express.Router();
const oxidizedService = require('../services/oxidizedService');
const cache = require('../middleware/cache');

// GET nodes (Cached for 30s)
router.get('/nodes', cache(30), async (req, res) => {
  try {
    const data = await oxidizedService.getNodes();
    res.json({ success: true, data, message: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

module.exports = router;
