const axios = require('axios');
const logger = require('../middleware/logger');

const zammadClient = axios.create({
  baseURL: process.env.ZAMMAD_URL,
  timeout: 10000,
  headers: {
    'ngrok-skip-browser-warning': '69420'
  }
});

// Setup Authorization header dynamically using base64 credentials from env
const authHeader = 'Basic ' + Buffer.from(`${process.env.ZAMMAD_EMAIL}:${process.env.ZAMMAD_PASSWORD}`).toString('base64');
zammadClient.defaults.headers.common['Authorization'] = authHeader;

async function getTickets() {
  try {
    const res = await zammadClient.get('/tickets/search?query=*&expand=true');
    return res.data;
  } catch (err) {
    logger.error(`Zammad getTickets failed: ${err.message}`);
    throw err;
  }
}

module.exports = {
  getTickets,
  zammadClient
};
