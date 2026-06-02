const { useState, useEffect, useCallback, useMemo } = React;

const TopologyPage = ({ hosts, problems, triggers }) => {
  const [maps, setMaps] = useState([]);
  const [selectedMapId, setSelectedMapId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewBox, setViewBox] = useState("0 0 1000 1000");

  const fetchMaps = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getMaps();
      setMaps(data);
      if (data.length > 0 && !selectedMapId) {
        setSelectedMapId(data[0].sysmapid);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedMapId]);

  useEffect(() => {
    fetchMaps();
  }, [fetchMaps]);

  // Helper to get element status and problem count
  const getElementInfo = (el) => {
    let elementId = null;
    let type = 'unknown';

    if (el.elementtype === '0') { // Host
      elementId = el.elements?.[0]?.hostid;
      type = 'host';
    } else if (el.elementtype === '3') { // Host Group
      elementId = el.elements?.[0]?.groupid;
      type = 'group';
    }

    if (!elementId) return { status: 'up', count: 0 };

    if (type === 'host') {
      const host = hosts?.find(h => String(h.hostid) === String(elementId));
      if (!host) return { status: 'unknown', count: 0 };

      const availability = getHostAvailability(host);
      const hostTriggers = triggers?.filter(t =>
        t.hosts?.some(th => String(th.hostid) === String(elementId))
      ) || [];

      const activeTriggers = hostTriggers.filter(t => t.value === '1');
      const count = activeTriggers.length;

      // Determine if it's a "Critical" problem (Average or higher)
      const hasCriticalProblem = activeTriggers.some(t => parseInt(t.priority) >= 3);

      // Only show as "down" if availability is explicitly down OR has a critical problem
      // AND the host is not disabled (status === '1')
      const isDown = (availability === 'down' || hasCriticalProblem) && host.status === '0';

      return {
        status: isDown ? 'down' : 'up',
        count: count,
        isDisabled: host.status === '1'
      };
    }

    return { status: 'up', count: 0 };
  };

  const activeMap = useMemo(() =>
    maps.find(m => m.sysmapid === selectedMapId),
    [maps, selectedMapId]
  );

  useEffect(() => {
    if (activeMap) {
      setViewBox(`0 0 ${activeMap.width} ${activeMap.height}`);
    }
  }, [activeMap]);

  if (loading && !maps.length) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-500 font-medium">Loading Topology Maps...</p>
    </div>
  );

  if (error) return (
    <Card className="bg-red-50 border-red-100">
      <CardContent className="p-8 text-center">
        <div className="text-3xl mb-3">⚠️</div>
        <p className="text-red-700 font-semibold">Failed to load maps</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
        <Button className="mt-4" onClick={fetchMaps}>Retry</Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header & Map Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Network Topology</h1>
          <p className="text-sm text-slate-500 mt-1">Visual map of infrastructure and dependencies</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedMapId || ''}
            onChange={(e) => setSelectedMapId(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg py-2 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
          >
            {maps.map(m => (
              <option key={m.sysmapid} value={m.sysmapid}>{m.name}</option>
            ))}
          </select>
          <Button variant="outline" onClick={fetchMaps} size="sm">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
          </Button>
        </div>
      </div>

      {!activeMap ? (
        <EmptyState icon="🗺️" message="No maps found in your Zabbix system" />
      ) : (
        <Card className="overflow-hidden bg-slate-50 border-slate-200 shadow-inner">
          <CardContent className="p-0 relative">
            {/* Map Toolbar */}
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              <div className="bg-white/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {activeMap.width} × {activeMap.height}
              </div>
            </div>

            {/* SVG Renderer */}
            <div className="overflow-auto min-h-[600px] flex items-center justify-center p-8">
              <svg
                viewBox={viewBox}
                width={activeMap.width}
                height={activeMap.height}
                className="bg-white shadow-xl rounded-md border border-slate-100"
                style={{ maxWidth: 'none' }}
              >
                {/* Defs for gradients/shadows */}
                <defs>
                  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                    <feOffset dx="0" dy="1" result="offsetblur" />
                    <feComponentTransfer>
                      <feFuncA type="linear" slope="0.1" />
                    </feComponentTransfer>
                    <feMerge>
                      <feMergeNode />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Links */}
                {activeMap.links?.map(link => {
                  const e1 = activeMap.selements.find(e => e.selementid === link.selementid1);
                  const e2 = activeMap.selements.find(e => e.selementid === link.selementid2);
                  if (!e1 || !e2) return null;

                  const info1 = getElementInfo(e1);
                  const info2 = getElementInfo(e2);
                  const isProblem = info1.status === 'down' || info2.status === 'down';

                  return (
                    <line
                      key={link.linkid}
                      x1={parseInt(e1.x) + 24}
                      y1={parseInt(e1.y) + 24}
                      x2={parseInt(e2.x) + 24}
                      y2={parseInt(e2.y) + 24}
                      stroke={isProblem ? '#ef4444' : (link.color === '000000' ? '#10b981' : `#${link.color}`)}
                      strokeWidth={isProblem ? 4 : (link.drawtype === '2' ? 3 : 1.5)}
                      strokeDasharray={link.drawtype === '3' ? "5,5" : "none"}
                      className={isProblem ? "animate-pulse" : ""}
                    />
                  );
                })}

                {/* Elements */}
                {activeMap.selements?.map(el => {
                  const x = parseInt(el.x);
                  const y = parseInt(el.y);
                  const info = getElementInfo(el);

                  return (
                    <g key={el.selementid} filter="url(#shadow)" className="cursor-pointer group">
                      {/* Node Shape */}
                      <rect
                        x={x} y={y} width={48} height={48} rx={12}
                        fill={info.status === 'down' ? '#fee2e2' : '#fff'}
                        stroke={info.status === 'down' ? '#ef4444' : '#e2e8f0'}
                        strokeWidth={info.status === 'down' ? 2 : 1}
                        className="group-hover:stroke-blue-400 transition-all"
                      />

                      {/* Icon Container */}
                      <g transform={`translate(${x + 12}, ${y + 12})`}>
                        {el.elementtype === '0' ? (
                          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={info.status === 'down' ? '#ef4444' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                        ) : (
                          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                        )}
                      </g>

                      {/* Status Dot */}
                      <circle
                        cx={x + 40} cy={y + 8} r={5}
                        fill={info.status === 'down' ? '#ef4444' : '#10b981'}
                        stroke="#fff" strokeWidth="1.5"
                      />

                      {/* Label */}
                      <text
                        x={x + 24} y={y + 68}
                        textAnchor="middle"
                        fontSize={11}
                        fontWeight="600"
                        fill={info.status === 'down' ? '#b91c1c' : '#475569'}
                        className="pointer-events-none drop-shadow-sm"
                      >
                        {el.label.replace('{HOST.NAME}', el.elements?.[0]?.name || 'Element')}
                      </text>

                      {/* Problem Count Label */}
                      {info.count > 0 && (
                        <text
                          x={x + 24} y={y + 82}
                          textAnchor="middle"
                          fontSize={9}
                          fontWeight="700"
                          fill="#ef4444"
                          className="pointer-events-none"
                        >
                          {info.count} {info.count === 1 ? 'problem' : 'problems'}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

window.TopologyPage = TopologyPage;
