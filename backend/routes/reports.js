const express = require('express');
const router = express.Router();
const zabbixService = require('../services/zabbixService');
const logger = require('../middleware/logger');

// Key patterns to search for (in order of preference)
const CPU_KEYS    = ['system.cpu.util', 'system.cpu.util[,user]', 'system.cpu.util[all,user]'];
const MEM_KEYS    = ['vm.memory.size[pused]', 'vm.memory.utilization', 'vm.memory.size[pavailable]'];
const UPTIME_KEYS = ['system.uptime', 'system.uptime[]'];

// Resolve seconds from period label
function periodToSeconds(period) {
  if (period === 'monthly') return 30 * 24 * 3600;
  return 7 * 24 * 3600; // default weekly
}

// Compute average from trend records
function avgTrend(records) {
  if (!records || records.length === 0) return null;
  const sum = records.reduce((acc, r) => acc + parseFloat(r.value_avg || r.value || 0), 0);
  return Math.round((sum / records.length) * 100) / 100;
}

// Format uptime seconds → human-readable
function formatUptime(secs) {
  if (!secs && secs !== 0) return 'N/A';
  const s = parseFloat(secs);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// GET /api/reports?period=weekly|monthly
router.get('/', async (req, res) => {
  const period = req.query.period || 'weekly';
  const periodSecs = periodToSeconds(period);
  const timeFrom = Math.floor(Date.now() / 1000) - periodSecs;

  try {
    // 1. Get all monitored hosts
    const hosts = await zabbixService.call('host.get', {
      output: ['hostid', 'host', 'name', 'status'],
      selectInterfaces: ['ip', 'type', 'main'],
      selectHostGroups: ['name'],
      filter: { status: 0 }, // enabled only
      limit: 500
    });

    if (!hosts || hosts.length === 0) {
      return res.json({ success: true, data: [], message: null });
    }

    const hostIds = hosts.map(h => h.hostid);

    // 2. Fetch all relevant items for all hosts in one call
    const allItems = await zabbixService.call('item.get', {
      output: ['itemid', 'name', 'key_', 'value_type', 'lastvalue', 'lastclock', 'units', 'hostid'],
      hostids: hostIds,
      filter: { status: 0 },
      search: { key_: 'system' },
      searchByAny: true,
    });

    // Also fetch memory items separately (different key prefix)
    const memItems = await zabbixService.call('item.get', {
      output: ['itemid', 'name', 'key_', 'value_type', 'lastvalue', 'lastclock', 'units', 'hostid'],
      hostids: hostIds,
      filter: { status: 0 },
      search: { key_: 'vm.memory' },
    });

    const itemPool = [...allItems, ...memItems];

    // Helper: find best matching item for a host from key priority list
    function findItem(hostid, keyList) {
      for (const key of keyList) {
        const found = itemPool.find(i => i.hostid === hostid && i.key_.startsWith(key));
        if (found) return found;
      }
      return null;
    }

    // 3. Collect item IDs we need trends for
    const trendItemIds = [];
    const hostItemMap = {}; // hostid → { cpu, mem, uptime }

    for (const host of hosts) {
      const cpuItem    = findItem(host.hostid, CPU_KEYS);
      const memItem    = findItem(host.hostid, MEM_KEYS);
      const uptimeItem = findItem(host.hostid, UPTIME_KEYS);

      hostItemMap[host.hostid] = { cpuItem, memItem, uptimeItem };

      if (cpuItem)    trendItemIds.push(cpuItem.itemid);
      if (memItem)    trendItemIds.push(memItem.itemid);
      // uptime: just use lastvalue, no trend needed
    }

    // 4. Fetch trends for CPU and Memory items
    let trends = [];
    if (trendItemIds.length > 0) {
      try {
        trends = await zabbixService.call('trend.get', {
          output: ['itemid', 'clock', 'value_avg', 'value_min', 'value_max'],
          itemids: [...new Set(trendItemIds)],
          time_from: timeFrom,
          limit: 100000
        });
      } catch (e) {
        logger.warn(`trend.get failed, falling back to lastvalue only: ${e.message}`);
      }
    }

    // Group trends by itemid
    const trendsByItem = {};
    for (const t of trends) {
      if (!trendsByItem[t.itemid]) trendsByItem[t.itemid] = [];
      trendsByItem[t.itemid].push(t);
    }

    // 5. Build report rows
    const reportRows = hosts.map(host => {
      const { cpuItem, memItem, uptimeItem } = hostItemMap[host.hostid];

      const cpuTrends = cpuItem ? (trendsByItem[cpuItem.itemid] || []) : [];
      const memTrends = memItem ? (trendsByItem[memItem.itemid] || []) : [];

      // Avg from trends, fall back to lastvalue
      let cpuAvg = avgTrend(cpuTrends);
      if (cpuAvg === null && cpuItem) cpuAvg = parseFloat(cpuItem.lastvalue) || null;

      let memAvg = avgTrend(memTrends);
      // If key is pavailable, invert to get pused
      if (memAvg !== null && memItem && memItem.key_.includes('pavailable')) {
        memAvg = Math.round((100 - memAvg) * 100) / 100;
      }
      if (memAvg === null && memItem) memAvg = parseFloat(memItem.lastvalue) || null;

      const uptimeSecs = uptimeItem ? parseFloat(uptimeItem.lastvalue) : null;

      const iface = host.interfaces ? host.interfaces.find(i => i.main === '1') || host.interfaces[0] : null;
      const groups = (host.hostgroups || []).map(g => g.name).join(', ');

      return {
        hostid:    host.hostid,
        name:      host.name || host.host,
        host:      host.host,
        ip:        iface ? iface.ip : 'N/A',
        groups,
        cpuAvg:    cpuAvg !== null ? cpuAvg : null,
        memAvg:    memAvg !== null ? memAvg : null,
        uptimeSecs,
        uptime:    formatUptime(uptimeSecs),
        period,
        hasCpu:    !!cpuItem,
        hasMem:    !!memItem,
        hasUptime: !!uptimeItem,
      };
    });

    res.json({ success: true, data: reportRows, message: null });

  } catch (err) {
    logger.error(`Reports generation failed: ${err.message}`);
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

module.exports = router;
