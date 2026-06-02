const axios = require('axios');
const logger = require('../middleware/logger');

let zabbixToken = null;
let apiVersion = null;

async function getApiVersion() {
  if (apiVersion) return apiVersion;
  try {
    const res = await axios.post(process.env.ZABBIX_URL, {
      jsonrpc: '2.0',
      method: 'apiinfo.version',
      params: [],
      id: 1
    }, { timeout: 10000 });
    apiVersion = res.data.result;
    return apiVersion;
  } catch (err) {
    logger.error(`Zabbix version check failed: ${err.message}`);
    throw err;
  }
}

function isVersionAtLeast(version, min) {
  if (!version) return true;
  const [maj, minor] = version.split('.').map(Number);
  const [rMaj, rMin] = min.split('.').map(Number);
  return maj > rMaj || (maj === rMaj && minor >= rMin);
}

async function login() {
  const version = await getApiVersion();
  const useHeader = isVersionAtLeast(version, '5.4');
  const params = isVersionAtLeast(version, '5.4')
    ? { username: process.env.ZABBIX_USER, password: process.env.ZABBIX_PASSWORD }
    : { user: process.env.ZABBIX_USER, password: process.env.ZABBIX_PASSWORD };

  try {
    const res = await axios.post(process.env.ZABBIX_URL, {
      jsonrpc: '2.0',
      method: 'user.login',
      params,
      id: 1
    }, { timeout: 10000 });
    
    if (res.data.error) {
      throw new Error(res.data.error.data || res.data.error.message);
    }
    
    zabbixToken = res.data.result;
    return zabbixToken;
  } catch (err) {
    logger.error(`Zabbix login failed: ${err.message}`);
    throw err;
  }
}

async function call(method, params = {}) {
  if (!zabbixToken) {
    await login();
  }
  
  const version = await getApiVersion();
  const useHeader = isVersionAtLeast(version, '5.4');
  
  const body = {
    jsonrpc: '2.0',
    method,
    params,
    id: 1
  };
  
  if (!useHeader) {
    body.auth = zabbixToken;
  }
  
  const headers = { 'Content-Type': 'application/json' };
  if (useHeader) {
    headers['Authorization'] = `Bearer ${zabbixToken}`;
  }
  
  try {
    const res = await axios.post(process.env.ZABBIX_URL, body, { headers, timeout: 10000 });
    if (res.data.error) {
      // If session expired, retry login once
      if (res.data.error.code === -32611 || (res.data.error.message && res.data.error.message.includes('Session'))) {
        logger.info('Zabbix token expired. Re-authenticating...');
        await login();
        return await call(method, params);
      }
      throw new Error(res.data.error.data || res.data.error.message);
    }
    return res.data.result;
  } catch (err) {
    logger.error(`Zabbix API Call [${method}] failed: ${err.message}`);
    throw err;
  }
}

module.exports = {
  call,
  getApiVersion,
  login
};
