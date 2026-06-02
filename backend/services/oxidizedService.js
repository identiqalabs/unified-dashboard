const axios = require('axios');
const logger = require('../middleware/logger');

const oxidizedClient = axios.create({
  baseURL: process.env.OXIDIZED_URL,
  timeout: 10000
});

async function getNodes() {
  try {
    const res = await oxidizedClient.get('/nodes.json');
    return res.data;
  } catch (err) {
    logger.error(`Oxidized getNodes failed: ${err.message}`);
    throw err;
  }
}

module.exports = {
  getNodes,
  oxidizedClient
};
