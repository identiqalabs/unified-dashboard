// ZabbixAPI class — now routes requests to local Node.js API Gateway

const REFRESH_INTERVAL = 60;
const ZABBIX_USER = 'IQLab'; // Only kept for UI display compatibility in app.js footer

class ZabbixAPI {
  constructor() {
    this.token = "session-managed";
    this.apiVersion = "6.0";
  }

  async login() {
    return this.token;
  }

  async logout() {
    return true;
  }

  async _fetch(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `HTTP error ${res.status}`);
    }
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'API Gateway Error');
    }
    return data.data;
  }

  async getHosts() {
    return this._fetch('/api/zabbix/hosts');
  }

  async getProblems() {
    return this._fetch('/api/zabbix/problems');
  }

  async getTriggers() {
    return this._fetch('/api/zabbix/triggers');
  }

  async getHostGroups() {
    return this._fetch('/api/zabbix/hostgroups');
  }

  async getItems(hostid) {
    return this._fetch(`/api/zabbix/items/${hostid}`);
  }

  async getHistory(itemid, valueType, limit = 100) {
    return this._fetch('/api/zabbix/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemid, valueType, limit })
    });
  }

  async getTrends(itemid, timeFrom, limit = 1000) {
    return this._fetch('/api/zabbix/trends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemid, timeFrom, limit })
    });
  }

  async getAlerts(hostid) {
    return this._fetch(`/api/zabbix/alerts/${hostid}`);
  }

  async getOxidizedNodes() {
    try {
      return await this._fetch('/api/oxidized/nodes');
    } catch (e) {
      return [];
    }
  }

  async getRecentLogs(limit = 100, since = '24h') {
    try {
      return await this._fetch(`/api/logs/recent?limit=${limit}&since=${since}`);
    } catch (e) {
      return { logs: [], stats: { total: 0, errors: 0, warnings: 0, critical: 0 }, error: e.message };
    }
  }

  async searchLogs(q = '', limit = 100, since = '24h') {
    try {
      return await this._fetch(`/api/logs/search?q=${encodeURIComponent(q)}&limit=${limit}&since=${since}`);
    } catch (e) {
      return { logs: [], stats: { total: 0, errors: 0, warnings: 0, critical: 0 }, error: e.message };
    }
  }

  async getLogsByHost(hostname, limit = 100, since = '24h') {
    try {
      return await this._fetch(`/api/logs/host/${encodeURIComponent(hostname)}?limit=${limit}&since=${since}`);
    } catch (e) {
      return { logs: [], stats: { total: 0, errors: 0, warnings: 0, critical: 0 }, error: e.message };
    }
  }

  async getAvailableLabels() {
    try {
      return await this._fetch('/api/logs/labels');
    } catch (e) {
      return [];
    }
  }

  async getLabelValues(label) {
    try {
      return await this._fetch(`/api/logs/labels/${encodeURIComponent(label)}/values`);
    } catch (e) {
      return [];
    }
  }

  async getZammadTickets() {
    try {
      return await this._fetch('/api/zammad/tickets');
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async getHealthStatus() {
    return this._fetch('/api/health');
  }

  async getReports(period = 'weekly') {
    return this._fetch(`/api/reports?period=${period}`);
  }
}

const api = new ZabbixAPI();
