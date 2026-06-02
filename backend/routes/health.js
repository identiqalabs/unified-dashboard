const express = require('express');
const router = express.Router();
const zabbixService = require('../services/zabbixService');
const { zammadClient } = require('../services/zammadService');
const { oxidizedClient } = require('../services/oxidizedService');
const lokiService = require('../services/lokiService');

router.get('/', async (req, res) => {
  const healthStatus = {
    status: 'healthy',
    zabbix: false,
    zammad: false,
    loki: false,
    oxidized: false,
    lokiVersion: 'unknown',
    detectedLabels: []
  };

  const checks = [
    // Zabbix check
    zabbixService.getApiVersion()
      .then(() => { healthStatus.zabbix = true; })
      .catch(() => { healthStatus.zabbix = false; }),

    // Zammad check
    zammadClient.get('/tickets?limit=1')
      .then(() => { healthStatus.zammad = true; })
      .catch(() => { healthStatus.zammad = false; }),

    // Loki readiness check
    lokiService.checkLokiConnection()
      .then((isReady) => { healthStatus.loki = isReady; })
      .catch(() => { healthStatus.loki = false; }),

    // Oxidized check
    oxidizedClient.get('/nodes.json')
      .then(() => { healthStatus.oxidized = true; })
      .catch(() => { healthStatus.oxidized = false; })
  ];

  await Promise.all(checks);

  if (healthStatus.loki) {
    try {
      const [buildInfo, labels] = await Promise.all([
        lokiService.lokiClient.get('/loki/api/v1/status/buildinfo').catch(() => null),
        lokiService.getAvailableLabels().catch(() => [])
      ]);
      if (buildInfo && buildInfo.data && buildInfo.data.version) {
        healthStatus.lokiVersion = buildInfo.data.version;
      }
      healthStatus.detectedLabels = labels || [];
    } catch (e) {
      // Ignore: fallback values already set
    }
  }

  const allConnected = healthStatus.zabbix && healthStatus.zammad && healthStatus.loki && healthStatus.oxidized;
  if (!allConnected) {
    healthStatus.status = 'warning';
  }

  res.json({
    success: true,
    data: healthStatus,
    message: null,
    status: healthStatus.status,
    zabbix: healthStatus.zabbix,
    loki: healthStatus.loki,
    oxidized: healthStatus.oxidized,
    zammad: healthStatus.zammad,
    lokiVersion: healthStatus.lokiVersion,
    detectedLabels: healthStatus.detectedLabels
  });
});

module.exports = router;
