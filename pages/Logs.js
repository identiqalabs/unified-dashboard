const { useState, useEffect, useMemo, useCallback } = React;

const LogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [range, setRange] = useState(86400);
  const [level, setLevel] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [allSources, setAllSources] = useState([]);
  const [hostLabel, setHostLabel] = useState('host');
  const [lokiStats, setLokiStats] = useState({ total: 0, errors: 0, warnings: 0, critical: 0 });
  const limit = 50;

  const getSourceLabel = useCallback((m) => {
    if (!m) return '';
    return (
      m.source ??
      m.hostname ??
      m.host ??
      m.syslog_hostname ??
      m.syslog_source ??
      m.gl2_remote_ip ??
      ''
    );
  }, []);

  // Fetch host label name from capabilities
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/logs/capabilities').then(r => r.json());
        if (res.success && res.data && res.data.hostLabel) {
          setHostLabel(res.data.hostLabel);
        }
      } catch (e) {
        console.error('Failed to get capabilities:', e);
      }
    })();
  }, []);

  // Discover all unique sources via Loki label values API
  useEffect(() => {
    (async () => {
      try {
        const vals = await api.getLabelValues(hostLabel);
        if (vals && Array.isArray(vals)) {
          setAllSources(vals.map(name => ({ name, count: 0 })));
        } else {
          setAllSources([]);
        }
      } catch (e) {
        console.error('Failed to fetch Loki sources:', e);
        // Fallback: show All Logs/empty instead of crashing
        setAllSources([]);
      }
    })();
  }, [hostLabel, range]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Map range seconds into standard since durations
    let sinceVal = '24h';
    if (range === 900) sinceVal = '15m';
    else if (range === 3600) sinceVal = '1h';
    else if (range === 21600) sinceVal = '6h';
    else if (range === 86400) sinceVal = '24h';
    else if (range === 604800) sinceVal = '7d';
    else if (range === 157680000) sinceVal = '30d';

    try {
      let res;
      if (sourceFilter !== 'all') {
        res = await api.getLogsByHost(sourceFilter, limit, sinceVal);
      } else if (searchQuery) {
        res = await api.searchLogs(searchQuery, limit, sinceVal);
      } else {
        res = await api.getRecentLogs(limit, sinceVal);
      }

      if (res.error) {
        setError(res.error);
      } else {
        setLogs(res.logs || []);
        
        // Update stats or fallback to 0
        const statsObj = res.stats || { total: 0, errors: 0, warnings: 0, critical: 0 };
        setLokiStats(statsObj);
        setTotal(statsObj.total || 0);
      }
    } catch (e) {
      setError(e.message);
      setLokiStats({ total: 0, errors: 0, warnings: 0, critical: 0 });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, range, sourceFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    let interval;
    if (autoRefresh && !loading) {
      interval = setInterval(fetchLogs, 30000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs, loading]);

  const stats = useMemo(() => {
    return {
      total: lokiStats.total || 0,
      errors: lokiStats.errors || 0,
      warnings: lokiStats.warnings || 0,
      sourceCount: allSources.length
    };
  }, [lokiStats, allSources]);

  const getLevelBadge = (lvl) => {
    const l = String(lvl).toLowerCase();
    if (l === 'error' || l === 'err' || l === '3' || l === 'emerg' || l === 'emergency' || l === 'crit' || l === 'critical') {
      return <span className="px-2 py-0.5 rounded text-[9px] font-black bg-red-500 text-white">ERROR</span>;
    }
    if (l === 'warn' || l === 'warning' || l === '4') {
      return <span className="px-2 py-0.5 rounded text-[9px] font-black bg-orange-500 text-white">WARN</span>;
    }
    if (l === 'info' || l === 'information' || l === '6' || l === 'notice' || l === '5') {
      return <span className="px-2 py-0.5 rounded text-[9px] font-black bg-blue-500 text-white">INFO</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[9px] font-black bg-slate-600 text-slate-300">DEBUG</span>;
  };

  const handleSearch = () => {
    setPage(1);
    setSearchQuery(searchInput);
  };

  if (error) return (
    <div className="space-y-6">
      <h1 className="text-xl font-black text-slate-800 uppercase tracking-wider">Centralized Logs</h1>
      <Card className="p-12 text-center border-red-500/20 bg-red-50/30 rounded-2xl shadow-2xl">
        <div className="text-4xl mb-4">⚠️</div>
        <p className="font-bold text-red-600 uppercase tracking-widest">Grafana Loki unavailable</p>
        <p className="text-xs mt-2 text-slate-500">{error}</p>
        <div className="mt-8 p-4 bg-white rounded-xl border border-red-100 text-[10px] text-slate-500 font-medium max-w-sm mx-auto text-left">
          <p className="font-black mb-2 text-red-500 uppercase">Troubleshooting:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li>Ensure the Grafana Loki server is running at <b>http://192.168.1.180:3100</b>.</li>
            <li>Check network connectivity and firewall rules between this app and Loki.</li>
            <li>Verify Loki service state and health via <code>/ready</code> endpoint.</li>
          </ul>
        </div>
        <Button onClick={fetchLogs} className="mt-6 bg-red-600 hover:bg-red-700 text-white border-0">Retry Connection</Button>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800 uppercase tracking-wider">Centralized Logs</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">Live feed from Grafana Loki • http://192.168.1.180:3100</p>
        </div>
        <div className="flex items-center gap-3">
          {autoRefresh && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Live</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Logs', value: stats.total.toLocaleString(), color: 'text-slate-800', bg: 'bg-white', icon: '📊' },
          { label: 'Error Count', value: stats.errors, color: 'text-red-600', bg: 'bg-red-50', icon: '🚨' },
          { label: 'Warning Count', value: stats.warnings, color: 'text-orange-600', bg: 'bg-orange-50', icon: '⚠️' },
          { label: 'Sources Count', value: stats.sourceCount, color: 'text-blue-600', bg: 'bg-blue-50', icon: '🖥️' }
        ].map((s, i) => (
          <Card key={i} className={`p-5 border-slate-200 shadow-sm ${s.bg}`}>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{s.label}</p>
            <div className="flex items-end justify-between">
              <p className={`text-3xl font-black ${s.color} tracking-tighter`}>{s.value}</p>
              <span className="text-2xl opacity-20">{s.icon}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Search & Filters */}
      <Card className="p-5 border-slate-200 shadow-lg rounded-2xl">
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Search all logs by keyword (e.g. 'SSH', 'auth failure', 'login')..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button
            onClick={handleSearch}
            className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest px-8 rounded-xl transition-all shadow-lg"
          >
            Search
          </Button>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {[
              { val: 900, label: '15m' },
              { val: 3600, label: '1h' },
              { val: 21600, label: '6h' },
              { val: 86400, label: '24h' },
              { val: 604800, label: '7d' },
              { val: 157680000, label: 'All' }
            ].map(t => (
              <button
                key={t.val}
                onClick={() => { setRange(t.val); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${range === t.val ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-slate-200" />

          <select
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            value={level}
            onChange={(e) => { setLevel(e.target.value); setPage(1); }}
          >
            <option value="all">All Levels</option>
            <option value="0">Emergency</option>
            <option value="1">Alert</option>
            <option value="2">Critical</option>
            <option value="3">Error</option>
            <option value="4">Warning</option>
            <option value="5">Notice</option>
            <option value="6">Info</option>
            <option value="7">Debug</option>
          </select>

          <select
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            value={sourceFilter}
            onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
          >
            <option value="all">All Sources ({allSources.length})</option>
            {allSources.map(s => <option key={s.name} value={s.name}>{s.name} ({s.count.toLocaleString()})</option>)}
          </select>

          <div className="flex-1" />

          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Auto-Refresh (30s)</span>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </div>

          <Button onClick={fetchLogs} variant="outline" size="sm" className="h-9 px-4 text-[10px] font-black uppercase tracking-widest border-slate-200">
            ↻ Refresh
          </Button>
        </div>
      </Card>

      {/* Log Table */}
      <Card className="border-slate-200 shadow-xl overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="p-4 text-[9px] font-black uppercase tracking-widest w-48">Timestamp</th>
                <th className="p-4 text-[9px] font-black uppercase tracking-widest w-24">Level</th>
                <th className="p-4 text-[9px] font-black uppercase tracking-widest w-44">Source</th>
                <th className="p-4 text-[9px] font-black uppercase tracking-widest">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && !logs.length ? (
                <tr>
                  <td colSpan="4" className="p-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Grafana Loki Database...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-24 text-center text-slate-400">
                    <div className="text-5xl mb-6 opacity-20">📡</div>
                    <p className="text-sm font-black uppercase tracking-widest">No logs match your filters</p>
                    <p className="text-xs text-slate-400 mt-2">Try adjusting the time range or clearing your search query.</p>
                  </td>
                </tr>
              ) : logs.map((log, i) => {
                const m = typeof log.message === 'object' && log.message !== null ? log.message : {
                  timestamp: log.timestamp || new Date().toISOString(),
                  message: typeof log.message === 'string' ? log.message : (log.message?.message || ''),
                  level: log.labels?.level || log.labels?.severity || '6',
                  host: log.host || 'unknown',
                  job: log.job || 'unknown',
                  filename: log.filename || 'unknown',
                  ...log.labels,
                  ...log
                };
                const isExpanded = expandedId === i;
                return (
                  <React.Fragment key={i}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : i)}
                      className={`cursor-pointer hover:bg-slate-50 transition-all group ${isExpanded ? 'bg-blue-50/50' : ''}`}
                    >
                      <td className="p-4 font-mono text-[10px] text-slate-500">
                        {new Date(m.timestamp).toLocaleString()}
                      </td>
                      <td className="p-4">{getLevelBadge(m.level)}</td>
                      <td className="p-4">
                        <span className="text-[10px] font-black text-slate-500 truncate block max-w-[170px]">{getSourceLabel(m) || '—'}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[11px] font-mono text-slate-600 truncate max-w-3xl leading-relaxed">
                            {m.message}
                          </span>
                          <span className={`text-slate-300 group-hover:text-blue-500 transition-all text-[8px] flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-l-4 border-blue-500">
                        <td colSpan="4" className="p-0 bg-slate-900">
                          <div className="p-8 animate-in slide-in-from-top-4 duration-300">
                            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Log Inspection Panel</h4>
                              </div>
                              <span className="font-mono text-[10px] text-slate-500">Event ID: {m._id || m.id || i}</span>
                            </div>
                            <div className="bg-black/50 p-6 rounded-2xl border border-white/5 mb-6 shadow-inner">
                              <pre className="text-[12px] font-mono text-emerald-400 leading-loose whitespace-pre-wrap">
                                {m.message}
                              </pre>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-12 gap-y-5">
                              {Object.entries(m).filter(([k]) => k !== 'message' && k !== 'full_message').map(([key, val]) => (
                                <div key={key} className="space-y-1">
                                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{key}</p>
                                  <p className="text-[11px] font-mono text-slate-300 break-all">{String(val)}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {Math.ceil(total / limit) > 1 && (
        <Card className="flex items-center justify-between p-4 border-slate-200 shadow-sm rounded-2xl">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Showing <span className="text-slate-700">{(page - 1) * limit + 1}</span> — <span className="text-slate-700">{Math.min(page * limit, total)}</span> of <span className="text-blue-600">{total.toLocaleString()}</span> entries
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-9 px-4 text-[10px] font-black uppercase tracking-widest border-slate-200"
            >
              Previous
            </Button>
            <div className="flex items-center px-5 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">
              Page {page}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page * limit >= total}
              className="h-9 px-4 text-[10px] font-black uppercase tracking-widest border-slate-200"
            >
              Next
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
