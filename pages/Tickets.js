const { useState, useEffect, useCallback } = React;

const TicketsPage = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getZammadTickets();
      // Zammad returns an array of tickets or a paginated object
      const ticketsList = Array.isArray(data) ? data : data.tickets || [];
      setTickets(ticketsList);
      setError(null);
    } catch (e) {
      setError(e.message || "Failed to load Zammad tickets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 60000);
    return () => clearInterval(interval);
  }, [fetchTickets]);

  // Zammad attributes: state_id maps to names, but some payloads have state name directly. 
  // Let's create robust mapping helpers.
  const getStateDetails = (ticket) => {
    const stateId = ticket.state_id;
    // Map standard Zammad state IDs
    const states = {
      1: { label: 'New', bg: '#eff6ff', text: '#1d4ed8' },
      2: { label: 'Open', bg: '#fffbeb', text: '#b45309' },
      3: { label: 'Closed', bg: '#ecfdf5', text: '#047857' },
      4: { label: 'Merged', bg: '#f1f5f9', text: '#475569' },
      7: { label: 'Pending', bg: '#faf5ff', text: '#6b21a8' }
    };
    return states[stateId] || { label: ticket.state || `State ${stateId}`, bg: '#f8fafc', text: '#64748b' };
  };

  const getPriorityDetails = (ticket) => {
    const priorityId = ticket.priority_id;
    const priorities = {
      1: { label: 'Low', bg: '#f1f5f9', text: '#475569' },
      2: { label: 'Normal', bg: '#eff6ff', text: '#1d4ed8' },
      3: { label: 'High', bg: '#fef2f2', text: '#b91c1c' }
    };
    return priorities[priorityId] || { label: ticket.priority || `Priority ${priorityId}`, bg: '#f1f5f9', text: '#475569' };
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = (t.title || '').toLowerCase().includes(search.toLowerCase()) || 
                          (t.number || '').toLowerCase().includes(search.toLowerCase());
    
    const stateDetails = getStateDetails(t);
    const stateLabel = stateDetails.label.toLowerCase();
    
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'open' && (stateLabel === 'open' || stateLabel === 'new')) ||
                          (statusFilter === 'closed' && stateLabel === 'closed') ||
                          (statusFilter === 'new' && stateLabel === 'new');

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Zammad Tickets</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and resolve customer support requests</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchTickets} disabled={loading}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`mr-2 ${loading ? 'animate-spin' : ''}`}><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      <Card className="border-blue-100 shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Search Tickets</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by ticket # or title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</label>
              <div className="flex p-1 bg-slate-100 rounded-lg">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'new', label: 'New' },
                  { id: 'open', label: 'Open / New' },
                  { id: 'closed', label: 'Closed' }
                ].map(status => (
                  <button
                    key={status.id}
                    onClick={() => setStatusFilter(status.id)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                      statusFilter === status.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Card */}
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
              <Button onClick={fetchTickets}>Retry Connection</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="bg-slate-50/50">
                  <tr className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <th className="py-4 px-6 font-semibold">Ticket #</th>
                    <th className="py-4 px-4 font-semibold">Title</th>
                    <th className="py-4 px-4 font-semibold">Status</th>
                    <th className="py-4 px-4 font-semibold">Priority</th>
                    <th className="py-4 px-4 font-semibold">Created</th>
                    <th className="py-4 px-6 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedTickets.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-20 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-4xl opacity-20">🎫</span>
                          <p className="text-slate-400 font-medium">No tickets found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedTickets.map(t => {
                      const stateDetails = getStateDetails(t);
                      const priorityDetails = getPriorityDetails(t);
                      const createdTime = t.created_at ? new Date(t.created_at).toLocaleString() : 'N/A';
                      
                      return (
                        <tr key={t.id} className="group hover:bg-blue-50/30 transition-colors">
                          <td className="py-4 px-6 text-xs font-mono font-semibold text-blue-600 whitespace-nowrap">
                            #{t.number}
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-xs font-medium text-slate-800 line-clamp-2 max-w-[400px]" title={t.title}>
                              {t.title}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge style={{ backgroundColor: stateDetails.bg, color: stateDetails.text }} className="font-semibold">
                              {stateDetails.label}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <Badge style={{ backgroundColor: priorityDetails.bg, color: priorityDetails.text }} className="font-semibold">
                              {priorityDetails.label}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-xs text-slate-500 whitespace-nowrap">
                            {createdTime}
                          </td>
                          <td className="py-4 px-6 text-right whitespace-nowrap">
                            <a
                              href={`https://nonperforated-jeffery-unsalutatory.ngrok-free.dev/#ticket/zoom/${t.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              Open in Zammad
                              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            </a>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
          {!loading && !error && filteredTickets.length > 0 && (
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
window.TicketsPage = TicketsPage;
