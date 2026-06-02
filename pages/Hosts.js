const { useState, useEffect, useMemo } = React;

const HostsPage = ({ hosts, loading, onSelectHost }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('any'); // any, enabled, disabled
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filteredHosts = useMemo(() => {
    return hosts.filter(h => {
      const matchesSearch = h.name.toLowerCase().includes(search.toLowerCase()) || 
                           (h.interfaces?.[0]?.ip || '').includes(search);
      const matchesStatus = statusFilter === 'any' || 
                           (statusFilter === 'enabled' && h.status === '0') ||
                           (statusFilter === 'disabled' && h.status === '1');
      return matchesSearch && matchesStatus;
    });
  }, [hosts, search, statusFilter]);

  const totalPages = Math.ceil(filteredHosts.length / itemsPerPage);
  const paginatedHosts = filteredHosts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const getProblemCounts = (host) => {
    const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    (host.triggers || []).forEach(t => {
      if (t.value === '1' && t.status === '0') {
        counts[t.priority] = (counts[t.priority] || 0) + 1;
      }
    });
    return counts;
  };

  const AvailabilityBadge = ({ type, available }) => {
    const labels = { '1': 'ZBX', '2': 'SNMP', '3': 'IPMI', '4': 'JMX' };
    const label = labels[type] || '???';
    
    let colors = 'bg-slate-100 text-slate-400'; // Unknown / disabled
    if (available === '1') colors = 'bg-emerald-500 text-white';
    if (available === '2') colors = 'bg-red-500 text-white';

    return (
      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${colors}`}>
        {label}
      </span>
    );
  };

  const ProblemBadges = ({ counts }) => {
    const severities = [5, 4, 3, 2, 1, 0]; // Disaster to Interface Issue
    return (
      <div className="flex gap-1">
        {severities.map(s => {
          if (counts[s] === 0) return null;
          const sev = SEVERITY[s];
          return (
            <span 
              key={s}
              className="min-w-[18px] h-[18px] flex items-center justify-center rounded text-[10px] font-bold text-white px-1"
              style={{ backgroundColor: sev.color }}
              title={sev.label}
            >
              {counts[s]}
            </span>
          );
        })}
        {Object.values(counts).every(c => c === 0) && (
          <span className="text-emerald-500 text-[10px]">None</span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader 
        title="Hosts" 
        subtitle="Manage and monitor network devices"
      >
        <Button size="sm">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create host
        </Button>
      </PageHeader>

      {/* Filter Bar */}
      <Card className="border-blue-100 shadow-sm">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter by name or IP..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</span>
              <div className="flex p-1 bg-slate-100 rounded-lg">
                {['any', 'enabled', 'disabled'].map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${
                      statusFilter === s ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={() => { setSearch(''); setStatusFilter('any'); }}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Hosts Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead className="bg-slate-50/50">
                <tr className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="py-4 px-6 font-semibold">Name</th>
                  <th className="py-4 px-4 font-semibold">Interface</th>
                  <th className="py-4 px-4 font-semibold">Availability</th>
                  <th className="py-4 px-4 font-semibold">Tags</th>
                  <th className="py-4 px-4 font-semibold text-center">Status</th>
                  <th className="py-4 px-4 font-semibold">Problems</th>
                  <th className="py-4 px-4 font-semibold">Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  [...Array(10)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan="7" className="p-4"><Skeleton className="h-8 w-full" /></td>
                    </tr>
                  ))
                ) : paginatedHosts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-20 text-center">
                      <EmptyState icon="🖥️" message="No hosts found" />
                    </td>
                  </tr>
                ) : (
                  paginatedHosts.map(h => {
                    const iface = h.interfaces?.[0] || {};
                    const interfaceStr = iface.ip ? `${iface.ip}:${iface.port}` : '-';
                    const problemCounts = getProblemCounts(h);
                    
                    return (
                      <tr key={h.hostid} className="group hover:bg-blue-50/30 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span 
                              className="text-sm font-bold text-blue-600 hover:underline cursor-pointer"
                              onClick={() => onSelectHost(h)}
                            >
                              {h.name}
                            </span>
                            {h.description && <span className="text-[10px] text-slate-400 truncate max-w-[200px]">{h.description}</span>}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-xs font-mono text-slate-600">
                          {interfaceStr}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex gap-1">
                            {h.interfaces?.filter(i => i.main === '1').map(i => (
                              <AvailabilityBadge key={i.interfaceid} type={i.type} available={i.available} />
                            ))}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1 max-w-[300px]">
                            {h.tags?.slice(0, 3).map((t, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-medium border border-slate-200">
                                {t.tag}: {t.value}
                              </span>
                            ))}
                            {h.tags?.length > 3 && (
                              <span className="text-[9px] text-slate-400">+{h.tags.length - 3}</span>
                            )}
                            {(!h.tags || h.tags.length === 0) && <span className="text-slate-300 text-[9px]">-</span>}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {h.status === '0' ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold uppercase tracking-tight">Enabled</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase tracking-tight">Disabled</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <ProblemBadges counts={problemCounts} />
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-tight text-slate-400">
                            <span className="hover:text-blue-600 cursor-pointer">Latest</span>
                            <span className="hover:text-blue-600 cursor-pointer">Graphs</span>
                            <span className="hover:text-blue-600 cursor-pointer">Dash</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            onPageChange={setCurrentPage} 
          />
        </CardContent>
      </Card>
    </div>
  );
};

window.HostsPage = HostsPage;
