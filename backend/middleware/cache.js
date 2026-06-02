const NodeCache = require('node-cache');
const myCache = new NodeCache({ stdTTL: 30, checkperiod: 120 }); // 30s default TTL

const cacheMiddleware = (duration = 30) => {
  return (req, res, next) => {
    const key = req.originalUrl || req.url;
    const cachedResponse = myCache.get(key);
    
    if (cachedResponse) {
      return res.json(cachedResponse);
    } else {
      res.originalJson = res.json;
      res.json = (body) => {
        // Only cache successful API responses
        if (body && body.success !== false) {
          myCache.set(key, body, duration);
        }
        res.originalJson(body);
      };
      next();
    }
  };
};

module.exports = cacheMiddleware;
