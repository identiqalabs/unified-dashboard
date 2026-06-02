require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const zabbixRoutes = require('./routes/zabbix');
const zammadRoutes = require('./routes/zammad');
const logsRoutes = require('./routes/logs');
const oxidizedRoutes = require('./routes/oxidized');
const healthRoutes = require('./routes/health');
const reportsRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Log HTTP requests using morgan piped into winston
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// API Routes
app.use('/api/zabbix', zabbixRoutes);
app.use('/api/zammad', zammadRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/oxidized', oxidizedRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/reports', reportsRoutes);

// Serve static frontend files (fallback when not behind Nginx)
app.use(express.static(path.join(__dirname, '../')));

// Fallback to index.html for single-page routing
app.get('*', (req, res, next) => {
  if (req.url.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Centralized error handler
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`IQ NMS API Gateway running on port ${PORT}`);
});
