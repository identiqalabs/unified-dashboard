const express = require('express');
const router = express.Router();
const zabbixService = require('../services/zabbixService');
const cache = require('../middleware/cache');

// Standard response helper
const handleRequest = async (res, method, params) => {
  try {
    const data = await zabbixService.call(method, params);
    res.json({ success: true, data, message: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
};

// GET hosts (Cached for 30s)
router.get('/hosts', cache(30), (req, res) => {
  handleRequest(res, 'host.get', {
    output: ['hostid', 'host', 'name', 'status', 'description', 'inventory_mode'],
    selectInterfaces: ['interfaceid', 'type', 'available', 'ip', 'dns', 'port', 'main', 'useip'],
    selectHostGroups: 'extend',
    selectInventory: 'extend',
    selectTags: 'extend',
    selectParentTemplates: ['templateid', 'name'],
    selectTriggers: ['triggerid', 'description', 'priority', 'value', 'status'],
    limit: 1000
  });
});

// GET problems (NO CACHE)
router.get('/problems', (req, res) => {
  handleRequest(res, 'event.get', {
    source: 0,
    object: 0,
    value: [0, 1],
    output: ['eventid', 'objectid', 'clock', 'value', 'name', 'severity', 'acknowledged'],
    selectHosts: ['hostid', 'name'],
    selectAcknowledges: 'extend',
    selectTags: 'extend',
    sortfield: ['clock', 'eventid'],
    sortorder: 'DESC',
    limit: 100
  });
});

// GET triggers (NO CACHE)
router.get('/triggers', (req, res) => {
  handleRequest(res, 'trigger.get', {
    output: ['triggerid', 'description', 'priority', 'status', 'value', 'lastchange'],
    selectHosts: ['hostid', 'name'],
    monitored: true,
    sortfield: 'priority',
    sortorder: 'DESC',
    limit: 500
  });
});

// GET hostgroups (Cached for 60s)
router.get('/hostgroups', cache(60), (req, res) => {
  handleRequest(res, 'hostgroup.get', {
    output: ['groupid', 'name'],
    selectHosts: 'count',
    with_hosts: true
  });
});

// GET items for a host
router.get('/items/:hostid', (req, res) => {
  handleRequest(res, 'item.get', {
    hostids: req.params.hostid,
    output: ['itemid', 'name', 'key_', 'value_type', 'units', 'lastvalue'],
    filter: { status: 0 }
  });
});

// GET history for items
router.post('/history', (req, res) => {
  const { itemid, valueType, limit } = req.body;
  handleRequest(res, 'history.get', {
    itemids: itemid,
    history: valueType,
    output: 'extend',
    sortfield: 'clock',
    sortorder: 'DESC',
    limit: limit || 100
  });
});

// GET trends for items
router.post('/trends', (req, res) => {
  const { itemid, timeFrom, limit } = req.body;
  handleRequest(res, 'trend.get', {
    itemids: itemid,
    time_from: timeFrom,
    output: 'extend',
    limit: limit || 1000
  });
});

// GET alerts for a host
router.get('/alerts/:hostid', (req, res) => {
  handleRequest(res, 'alert.get', {
    output: 'extend',
    hostids: [req.params.hostid],
    limit: 50,
    sortfield: 'clock',
    sortorder: 'DESC'
  });
});

module.exports = router;
