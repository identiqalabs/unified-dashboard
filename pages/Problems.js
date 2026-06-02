const { useState, useEffect, useCallback } = React;

const ProblemsPage = () => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  
  // Filter States
  const [search, setSearch] = useState('');
  const [selectedSeverities, setSelectedSeverities] = useState([]);
  const [showType, setShowType] = useState('recent'); // recent, problems, history
  const [ackStatus, setAckStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchProblems = useCallback(async () => {
    setLoading(true);
    try {
      // In a real app, we'd pass these filters to the API
      // For now, we'll fetch a large batch and filter locally or refine the query
      const [problemsData, triggersData] = await Promise.all([
        api.getProblems(),
        api.getTriggers()
      ]);
      
      // Enrich problems with trigger priority
      const enriched = problemsData.map(p => {
        const trigger = triggersData.find(t => t.triggerid === p.objectid);
        return {
          ...p,
          severity: trigger ? trigger.priority : p.severity
        };
      });

      setProblems(enriched);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProblems();
    const interval = setInterval(fetchProblems, 60000);
    return () => clearInterval(interval);
  }, [fetchProblems]);

  const toggleSeverity = (sev) => {
    setSelectedSeverities(prev => 
      prev.includes(sev) ? prev.filter(s => s !== sev) : [...prev, sev]
    );
  };

  // Client-side filtering for immediate responsiveness
  const filteredProblems = problems.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                         (p.hosts?.[0]?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = selectedSeverities.length === 0 || selectedSeverities.includes(p.severity);
    const matchesAck = ackStatus === 'all' || 
                      (ackStatus === 'unack' && p.acknowledged === '0') ||
                      (ackStatus === 'ack' && p.acknowledged === '1');
    
    return matchesSearch && matchesSeverity && matchesAck;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredProblems.length / itemsPerPage);
  const paginatedProblems = filteredProblems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedSeverities, ackStatus, showType]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Problems</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor and manage system events</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsFilterOpen(!isFilterOpen)}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            {isFilterOpen ? 'Hide Filters' : 'Show Filters'}
          </Button>
          <Button onClick={fetchProblems} disabled={loading}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`mr-2 ${loading ? 'animate-spin' : ''}`}><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      {isFilterOpen && (
        <Card className="border-blue-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Show Toggle */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Show Mode</label>
                <div className="flex p-1 bg-slate-100 rounded-lg">
                  {['recent', 'problems', 'history'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => setShowType(mode)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                        showType === mode ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Problem/Host Search */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Search</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Problem or host name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
              </div>

              {/* Acknowledgement */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Acknowledgement</label>
                <div className="flex p-1 bg-slate-100 rounded-lg">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'unack', label: 'Unacknowledged' },
                    { id: 'ack', label: 'Acknowledged' }
                  ].map(status => (
                    <button
                      key={status.id}
                      onClick={() => setAckStatus(status.id)}
                      className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all uppercase ${
                        ackStatus === status.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity Checkboxes */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Severity Filter</label>
                <div className="flex flex-wrap gap-2">
                  {[0, 1, 2, 3, 4, 5].map(s => (
                    <button
                      key={s}
                      onClick={() => toggleSeverity(s.toString())}
                      className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all border ${
                        selectedSeverities.includes(s.toString())
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {SEVERITY[s].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => {
                setSearch('');
                setSelectedSeverities([]);
                setAckStatus('all');
                setShowType('recent');
              }}>Reset Filters</Button>
              <Button size="sm" onClick={fetchProblems}>Apply Filters</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Card */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : error ? (
            <div className="p-20 text-center space-y-4">
              <div className="text-4xl">⚠️</div>
              <p className="text-red-500 font-medium">{error}</p>
              <Button onClick={fetchProblems}>Retry Connection</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="bg-slate-50/50">
                  <tr className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <th className="py-4 px-6 font-semibold">Time</th>
                    <th className="py-4 px-4 font-semibold">Status</th>
                    <th className="py-4 px-4 font-semibold">Severity</th>
                    <th className="py-4 px-4 font-semibold">Host</th>
                    <th className="py-4 px-4 font-semibold">Problem</th>
                    <th className="py-4 px-4 font-semibold">Ack</th>
                    <th className="py-4 px-6 font-semibold text-right">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedProblems.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-20 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-4xl opacity-20">🔍</span>
                          <p className="text-slate-400 font-medium">No problems found matching your filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedProblems.map(p => {
                      const isResolved = p.value === '0';
                      const time = new Date(p.clock * 1000).toLocaleTimeString();
                      const host = p.hosts?.[0]?.name || 'Unknown';
                      
                      return (
                        <tr key={p.eventid} className="group hover:bg-blue-50/30 transition-colors">
                          <td className="py-4 px-6 text-xs font-mono text-blue-600 whitespace-nowrap">{time}</td>
                          <td className="py-4 px-4">
                            {isResolved ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase">Resolved</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase pulse-danger">Problem</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <SeverityBadge severity={p.severity} />
                          </td>
                          <td className="py-4 px-4 text-xs font-semibold text-slate-700">{host}</td>
                          <td className="py-4 px-4">
                            <div className="text-xs font-medium text-slate-800 line-clamp-2 max-w-[350px]" title={p.name}>
                              {p.name}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {p.acknowledged === '1' ? (
                              <span className="text-emerald-500 text-[10px] font-bold uppercase bg-emerald-50 px-2 py-1 rounded-full">Yes</span>
                            ) : (
                              <span className="text-slate-400 text-[10px] font-bold uppercase bg-slate-50 px-2 py-1 rounded-full border border-slate-100">No</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right text-xs font-mono text-slate-500 whitespace-nowrap">
                            {getDuration(p.clock)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
          {!loading && !error && filteredProblems.length > 0 && (
            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={setCurrentPage} 
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Assign to window for accessibility
window.ProblemsPage = ProblemsPage;
