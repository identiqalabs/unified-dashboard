const { useState, useEffect, useCallback } = React;

const ReportsPage = () => {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [period, setPeriod]     = useState('weekly');
  const [search, setSearch]     = useState('');
  const [sortKey, setSortKey]   = useState('name');
  const [sortDir, setSortDir]   = useState('asc');
  const [generated, setGenerated] = useState(null);

  const fetchReport = useCallback(async (p) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getReports(p);
      setRows(Array.isArray(data) ? data : []);
      setGenerated(new Date().toLocaleString());
    } catch (e) {
      setError(e.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReport(period); }, [period]);

  // ── Sorting
  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <span style={{ opacity: 0.2, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4, color: '#3b82f6' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  // ── Filtered + sorted rows
  const filtered = rows
    .filter(r => {
      const q = search.toLowerCase();
      return (r.name || '').toLowerCase().includes(q) ||
             (r.ip || '').toLowerCase().includes(q) ||
             (r.groups || '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  // ── Summary stats
  const cpuValues  = filtered.filter(r => r.cpuAvg !== null).map(r => r.cpuAvg);
  const memValues  = filtered.filter(r => r.memAvg !== null).map(r => r.memAvg);
  const avgCpu = cpuValues.length ? (cpuValues.reduce((a,b)=>a+b,0)/cpuValues.length).toFixed(1) : 'N/A';
  const avgMem = memValues.length ? (memValues.reduce((a,b)=>a+b,0)/memValues.length).toFixed(1) : 'N/A';
  const highCpuCount = cpuValues.filter(v => v > 80).length;
  const highMemCount = memValues.filter(v => v > 85).length;

  // ── CSV Download
  const downloadCSV = () => {
    const headers = ['Device Name','Host','IP','Group','Avg CPU %','Avg Memory %','Uptime','Period'];
    const csvRows = [
      headers.join(','),
      ...filtered.map(r => [
        `"${r.name}"`,
        `"${r.host}"`,
        `"${r.ip}"`,
        `"${r.groups}"`,
        r.cpuAvg !== null ? r.cpuAvg : 'N/A',
        r.memAvg !== null ? r.memAvg : 'N/A',
        `"${r.uptime}"`,
        period
      ].join(','))
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `iq-nms-report-${period}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Util bar rendering
  const UtilBar = ({ value, warn = 70, danger = 85 }) => {
    if (value === null || value === undefined) {
      return <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>N/A</span>;
    }
    const pct = Math.min(100, Math.max(0, value));
    const color = pct >= danger ? '#ef4444' : pct >= warn ? '#f59e0b' : '#10b981';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden', minWidth: 80 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'JetBrains Mono', minWidth: 38 }}>{pct.toFixed(1)}%</span>
      </div>
    );
  };

  const periodLabel = period === 'weekly' ? 'Last 7 Days' : 'Last 30 Days';

  return (
    <div className="space-y-6">
      {/* ── Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Device Reports</h1>
          <p className="text-sm text-slate-500 mt-1">
            CPU, Memory & Uptime utilization — <span className="font-semibold text-blue-600">{periodLabel}</span>
            {generated && <span className="text-slate-400 ml-2">· Generated {generated}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadCSV}
            disabled={loading || filtered.length === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: loading || filtered.length === 0 ? '#f1f5f9' : '#10b981',
              color: loading || filtered.length === 0 ? '#94a3b8' : '#fff',
              border: 'none', cursor: loading || filtered.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download CSV
          </button>
          <Button onClick={() => fetchReport(period)} disabled={loading}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`mr-2 ${loading ? 'animate-spin' : ''}`}>
              <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Controls */}
      <Card className="border-blue-100">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Period selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Report Period</label>
              <div style={{ display: 'flex', padding: 4, background: '#f1f5f9', borderRadius: 10, gap: 4 }}>
                {[
                  { id: 'weekly',  label: '📅  Weekly (7 days)' },
                  { id: 'monthly', label: '📆  Monthly (30 days)' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setPeriod(opt.id); }}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                      background: period === opt.id ? '#fff' : 'transparent',
                      color:      period === opt.id ? '#2563eb' : '#64748b',
                      boxShadow:  period === opt.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >{opt.label}</button>
                ))}
              </div>
            </div>
            {/* Search */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Search Devices</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter by name, IP or group..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Summary Cards */}
      {!loading && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Devices', value: filtered.length, icon: '🖥️', color: '#3b82f6', bg: '#eff6ff' },
            { label: 'Avg CPU Util', value: avgCpu === 'N/A' ? avgCpu : `${avgCpu}%`, icon: '⚡', color: parseFloat(avgCpu) > 70 ? '#ef4444' : '#10b981', bg: parseFloat(avgCpu) > 70 ? '#fef2f2' : '#ecfdf5' },
            { label: 'Avg Memory Util', value: avgMem === 'N/A' ? avgMem : `${avgMem}%`, icon: '🧠', color: parseFloat(avgMem) > 80 ? '#ef4444' : '#10b981', bg: parseFloat(avgMem) > 80 ? '#fef2f2' : '#ecfdf5' },
            { label: 'High-Load Devices', value: Math.max(highCpuCount, highMemCount), icon: '🔥', color: '#f59e0b', bg: '#fffbeb' },
          ].map(card => (
            <Card key={card.label}>
              <CardContent style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {card.icon}
                </div>
                <div>
                  <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{card.label}</p>
                  <p style={{ fontSize: 24, fontWeight: 700, color: card.color, margin: 0, fontFamily: 'JetBrains Mono' }}>{card.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Data Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 space-y-4">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : error ? (
            <div className="p-20 text-center space-y-4">
              <div className="text-4xl">⚠️</div>
              <p className="text-red-500 font-medium">{error}</p>
              <Button onClick={() => fetchReport(period)}>Retry</Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-20 text-center">
              <span style={{ fontSize: 40, opacity: 0.2 }}>📊</span>
              <p className="text-slate-400 font-medium mt-3">No devices found matching your filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" style={{ minWidth: 900 }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
                    {[
                      { key: 'name',    label: 'Device Name' },
                      { key: 'ip',      label: 'IP Address' },
                      { key: 'groups',  label: 'Group' },
                      { key: 'cpuAvg',  label: `Avg CPU (${periodLabel})` },
                      { key: 'memAvg',  label: `Avg Memory (${periodLabel})` },
                      { key: 'uptimeSecs', label: 'Uptime' },
                    ].map(col => (
                      <th
                        key={col.key}
                        onClick={() => toggleSort(col.key)}
                        style={{ padding: '12px 16px', fontWeight: 600, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                      >
                        {col.label}<SortIcon col={col.key} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, idx) => {
                    const cpuLevel = row.cpuAvg >= 85 ? 'high' : row.cpuAvg >= 70 ? 'warn' : 'ok';
                    const memLevel = row.memAvg >= 85 ? 'high' : row.memAvg >= 70 ? 'warn' : 'ok';
                    const rowBg = (cpuLevel === 'high' || memLevel === 'high') ? 'rgba(239,68,68,0.03)' : 'transparent';

                    return (
                      <tr key={row.hostid} style={{ borderBottom: '1px solid #f1f5f9', background: rowBg, transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = rowBg}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{row.name}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'JetBrains Mono', marginTop: 2 }}>{row.host}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: '#475569', background: '#f1f5f9', padding: '2px 8px', borderRadius: 6 }}>{row.ip}</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b', maxWidth: 160 }}>
                          <span style={{ background: '#f0f9ff', color: '#0369a1', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                            {row.groups || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', minWidth: 160 }}>
                          <UtilBar value={row.cpuAvg} warn={70} danger={85} />
                        </td>
                        <td style={{ padding: '12px 16px', minWidth: 160 }}>
                          <UtilBar value={row.memAvg} warn={70} danger={85} />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontSize: 12, fontFamily: 'JetBrains Mono', fontWeight: 600,
                            color: row.uptimeSecs !== null ? '#10b981' : '#94a3b8'
                          }}>
                            {row.uptime}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!loading && !error && filtered.length > 0 && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', background: '#fafafa', fontSize: 12, color: '#94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{filtered.length} device{filtered.length !== 1 ? 's' : ''} shown</span>
              <span style={{ fontFamily: 'JetBrains Mono' }}>{periodLabel} · {generated}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

window.ReportsPage = ReportsPage;
