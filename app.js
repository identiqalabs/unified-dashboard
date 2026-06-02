const { useState, useEffect, useCallback } = React;

// ── Icons (Minimalist SVG Paths)
const Icons = {
  overview: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
  problems: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>,
  topology: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22v-5" /><path d="M9 7V2h6v5" /><path d="M3 13v-5h6v5" /><path d="M15 13v-5h6v5" /><path d="M9 17v-5h6v5" /><path d="M12 17v-5" /></svg>,
  hosts: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>,
  groups: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>,
  tophosts: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
  trends: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
  logs: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>,
  tickets: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>,
  settings: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
  chevron: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
};

const App = () => {
  const [data, setData] = useState({ hosts: [], problems: [], triggers: [], hostgroups: [], oxidizedNodes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [currentPage, setCurrentPage] = useState('overview');
  const [selectedHost, setSelectedHost] = useState(null);
  const [activeTab, setActiveTab] = useState(localStorage.getItem('host_active_tab') || 'overview');
  const [apiVersion, setApiVersion] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    localStorage.setItem('host_active_tab', tabId);
  };

  const fetchAll = useCallback(async () => {
    try {
      const [hosts, problems, triggers, hostgroups, oxidizedNodes] = await Promise.all([
        api.getHosts(),
        api.getProblems(),
        api.getTriggers(),
        api.getHostGroups(),
        api.getOxidizedNodes(),
      ]);

      // Enrich problems with trigger priority
      const enrichedProblems = problems.map(p => {
        const trigger = triggers.find(t => t.triggerid === p.objectid);
        return {
          ...p,
          severity: trigger ? trigger.priority : p.severity
        };
      });

      setData({ hosts, problems: enrichedProblems, triggers, hostgroups, oxidizedNodes });

      // Update selectedHost if open to keep it fresh
      if (selectedHost) {
        const fresh = hosts.find(h => h.hostid === selectedHost.hostid);
        if (fresh) setSelectedHost(fresh);
      }

      setStatus('connected');
      setError(null);
    } catch (e) {
      setError(e.message);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  }, [selectedHost]);

  useEffect(() => {
    (async () => {
      try {
        await api.login();
        setApiVersion(api.apiVersion);
        await fetchAll();
      } catch (e) {
        setError(e.message);
        setStatus('error');
        setLoading(false);
      }
    })();
  }, []);

  // Auto-refresh countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { fetchAll(); return REFRESH_INTERVAL; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [fetchAll]);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Icons.overview },
    { id: 'problems', label: 'Problems', icon: Icons.problems, count: data.problems.filter(p => p.value === '1').length },
    { id: 'topology', label: 'Topology', icon: Icons.topology },
    { id: 'hosts', label: 'All Hosts', icon: Icons.hosts },
    { id: 'tophosts', label: 'Top Hosts', icon: Icons.tophosts },
    { id: 'logs', label: 'Logs', icon: Icons.logs },
    { id: 'tickets', label: 'Tickets', icon: Icons.tickets },
  ];

  const statusColors = {
    connected: { dot: 'bg-emerald-400', text: 'text-emerald-300', label: 'Connected' },
    error: { dot: 'bg-red-400', text: 'text-red-300', label: 'Error' },
    connecting: { dot: 'bg-blue-400', text: 'text-blue-300', label: 'Connecting…' },
  };
  const sc = statusColors[status] || statusColors.connecting;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* ── Sidebar */}
      <aside style={{
        width: isCollapsed ? 68 : 240,
        background: 'hsl(222 47% 11%)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 50,
      }}>

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            position: 'absolute', right: 10, top: 24, width: 24, height: 24,
            borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'transform 0.3s',
            transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          {Icons.chevron}
        </button>

        {/* Logo */}
        <div style={{
          padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden', display: 'flex', justifyContent: 'center',
        }}>
          <div style={{
            width: isCollapsed ? 44 : 180, height: 60,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.3s',
          }}>
            <img
              src="Assets/Identiqa-Logo.png"
              alt="Identiqa Logo"
              style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
            />
          </div>
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: '12px 10px' }}>
          {navItems.map(item => {
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentPage(item.id);
                  setSelectedHost(null);
                }}
                title={isCollapsed ? item.label : ''}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                  background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                  marginBottom: 4, transition: 'all 0.15s', textAlign: 'left',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                }}
              >
                <span style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }}>{item.icon}</span>
                {!isCollapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                {!isCollapsed && item.count > 0 && (
                  <span style={{
                    background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700,
                    padding: '1px 6px', borderRadius: 10, fontFamily: 'JetBrains Mono',
                  }}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User / Status Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            justifyContent: isCollapsed ? 'center' : 'flex-start',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(59,130,246,0.25)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#93c5fd', flexShrink: 0,
            }}>
              {ZABBIX_USER?.slice(0, 2).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div>
                <p style={{ color: '#fff', fontSize: 12, fontWeight: 500, margin: 0 }}>{ZABBIX_USER}</p>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'JetBrains Mono', margin: 0 }}>
                  {countdown}s
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Content */}
      <main style={{
        flex: 1, overflowY: 'auto',
        padding: isCollapsed ? '32px 48px' : '32px 36px',
        minWidth: 0, transition: 'padding 0.3s',
      }}>

        {/* Error Banner */}
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
            padding: '12px 16px', marginBottom: 20, display: 'flex',
            alignItems: 'center', gap: 10, fontSize: 13, color: '#b91c1c',
          }}>
            ⚠️ <strong>Connection Error:</strong> {error}
          </div>
        )}

        {/* ── Page Router */}
        {selectedHost ? (
          <HostDetailsPage
            host={selectedHost}
            onBack={() => setSelectedHost(null)}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            oxidizedNodes={data.oxidizedNodes}
          />
        ) : (
          <>
            {/* Overview — now receives onSelectHost for group tab row clicks */}
            {currentPage === 'overview' && (
              <OverviewPage
                hosts={data.hosts}
                problems={data.problems}
                triggers={data.triggers}
                hostgroups={data.hostgroups}
                loading={loading}
                onSelectHost={setSelectedHost}
              />
            )}

            {currentPage === 'problems' && (
              <ProblemsPage />
            )}

            {currentPage === 'topology' && (
              <TopologyPage
                hosts={data.hosts}
                problems={data.problems}
                triggers={data.triggers}
              />
            )}

            {currentPage === 'hosts' && (
              <HostsPage
                hosts={data.hosts}
                loading={loading}
                onSelectHost={setSelectedHost}
              />
            )}

            {currentPage === 'logs' && (
              <LogsPage />
            )}

            {currentPage === 'tickets' && (
              <TicketsPage />
            )}

            {/* Coming Soon pages */}
            {!['overview', 'problems', 'topology', 'hosts', 'logs', 'tickets'].includes(currentPage) && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: 400, color: '#94a3b8', gap: 12,
              }}>
                <span style={{ fontSize: 48 }}>🚧</span>
                <p style={{ fontSize: 16, fontWeight: 600, color: '#475569' }}>Coming soon</p>
                <button
                  onClick={() => setCurrentPage('overview')}
                  style={{
                    padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0',
                    background: '#fff', cursor: 'pointer', fontSize: 13, color: '#475569',
                  }}
                >
                  ← Back to Overview
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));