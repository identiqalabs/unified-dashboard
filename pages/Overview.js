// Overview Page — uses globals: React, Recharts, SEVERITY, getDuration, getHostAvailability, api

const {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} = Recharts;

const { useState, useEffect } = React;

// ── Stat Card with top accent
const StatCard = ({ label, value, sub, accentColor, loading, pulse = false }) => (
  <Card className={`relative overflow-hidden ${pulse ? 'pulse-danger' : ''}`}>
    <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ backgroundColor: accentColor }} />
    <CardContent className="pt-5">
      {loading ? (
        <>
          <Skeleton className="h-3 w-20 mb-3" />
          <Skeleton className="h-9 w-14 mb-2" />
          <Skeleton className="h-3 w-16" />
        </>
      ) : (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{label}</p>
          <p className="text-4xl font-bold text-slate-900 font-mono leading-none mb-1">
            {formatNumber(value)}
          </p>
          {sub && <p className="text-xs text-slate-400">{sub}</p>}
        </>
      )}
    </CardContent>
  </Card>
);

// ── Severity breakdown pie chart
const SeverityChart = ({ problems }) => {
  const data = Object.entries(SEVERITY)
    .map(([k, s]) => ({
      name: s.label,
      value: problems.filter(p => parseInt(p.severity) === parseInt(k)).length,
      color: s.color,
    }))
    .filter(d => d.value > 0);

  if (data.length === 0) return (
    <EmptyState icon="✅" message="No active problems" />
  );

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(val, name) => [val, name]}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(val) => <span style={{ fontSize: 11, color: '#64748b' }}>{val}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

// ── Top Triggers bar chart
const TopTriggersChart = ({ triggers }) => {
  if (!triggers || triggers.length === 0) return (
    <EmptyState icon="🔕" message="No active triggers" />
  );

  const data = triggers.slice(0, 10).map(t => ({
    name: t.description.length > 28 ? t.description.slice(0, 28) + '…' : t.description,
    host: t.hosts?.[0]?.name || 'Unknown',
    severity: parseInt(t.priority),
    color: SEVERITY[t.priority]?.color || '#94a3b8',
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={200}
          tick={{ fontSize: 11, fill: '#475569' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: '#f8fafc' }}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid #e2e8f0',
          }}
          formatter={(val, name, props) => [
            props.payload.host,
            SEVERITY[props.payload.severity]?.label || 'Unknown'
          ]}
        />
        <Bar dataKey="severity" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// ── Honeycomb Widget for Host Availability
const HoneycombWidget = ({ hosts }) => {
  const displayHosts = (hosts || []).filter(h => {
    const availability = getHostAvailability(h);
    return availability === 'up' || availability === 'down';
  });

  if (displayHosts.length === 0) return (
    <EmptyState icon="🖥️" message="No active hosts to display" />
  );

  // Group hosts into rows of 6 (or whatever fits well)
  const itemsPerRow = 8;
  const rows = [];
  for (let i = 0; i < displayHosts.length; i += itemsPerRow) {
    rows.push(displayHosts.slice(i, i + itemsPerRow));
  }

  return (
    <div className="honeycomb-container">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="hexagon-row">
          {row.map(host => {
            const availability = getHostAvailability(host);
            const statusClass =
              availability === 'up' ? 'hexagon-up' :
                availability === 'down' ? 'hexagon-down' :
                  'hexagon-unknown';

            return (
              <div
                key={host.hostid}
                className={`hexagon ${statusClass}`}
                title={`${host.name} (${availability.toUpperCase()})`}
              >
                <div className="px-2 overflow-hidden break-words">
                  {host.name.length > 15 ? host.name.slice(0, 12) + '...' : host.name}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// ── Top Triggers Table (Zabbix Style)
const TopTriggersTable = ({ problems }) => {
  if (!problems || problems.length === 0) return (
    <EmptyState icon="📊" message="No trigger data" />
  );

  // Aggregate problems by trigger ID
  const aggregation = problems.reduce((acc, p) => {
    const id = p.objectid;
    if (!acc[id]) {
      acc[id] = {
        id,
        name: p.name,
        host: p.hosts?.[0]?.name || 'Unknown',
        severity: p.severity,
        count: 0
      };
    }
    acc[id].count++;
    return acc;
  }, {});

  const topTriggers = Object.values(aggregation)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
            <th className="py-3 px-2 font-semibold">Host</th>
            <th className="py-3 px-2 font-semibold">Trigger</th>
            <th className="py-3 px-2 font-semibold text-center">Severity</th>
            <th className="py-3 px-2 font-semibold text-right">Problems</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {topTriggers.map(t => {
            const s = SEVERITY[t.severity] || SEVERITY[0];
            return (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-2 text-xs font-medium text-slate-600 truncate max-w-[120px]">{t.host}</td>
                <td className="py-3 px-2 text-xs text-slate-800 font-medium">
                  <div className="truncate max-w-[250px]" title={t.name}>{t.name}</div>
                </td>
                <td className="py-3 px-2">
                  <div
                    className="text-[10px] font-bold text-white px-2 py-1 rounded text-center uppercase"
                    style={{ backgroundColor: s.color }}
                  >
                    {s.label}
                  </div>
                </td>
                <td className="py-3 px-2 text-right text-xs font-mono font-bold text-slate-700">
                  {t.count}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
const CurrentProblems = ({ problems }) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  if (!problems || problems.length === 0) return (
    <EmptyState icon="✅" message="No current problems" />
  );

  const totalPages = Math.ceil(problems.length / itemsPerPage);
  const paginatedProblems = problems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <th className="py-4 px-3 font-semibold min-w-[120px]">Time</th>
              <th className="py-4 px-3 font-semibold min-w-[100px]">Status</th>
              <th className="py-4 px-3 font-semibold min-w-[150px]">Host</th>
              <th className="py-4 px-3 font-semibold">Event / Problem</th>
              <th className="py-4 px-3 font-semibold text-center min-w-[100px]">Severity</th>
              <th className="py-4 px-3 font-semibold text-right min-w-[100px]">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paginatedProblems.map(p => {
              const host = p.hosts?.[0]?.name || 'Unknown';
              const isResolved = p.value === '0';
              const time = new Date(p.clock * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const s = SEVERITY[p.severity] || SEVERITY[0];

              return (
                <tr key={p.eventid} className="group hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-3 text-xs font-mono text-blue-600 whitespace-nowrap">{time}</td>
                  <td className="py-4 px-3 whitespace-nowrap">
                    {isResolved ? (
                      <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-tight">Resolved</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-tight pulse-danger">Problem</span>
                    )}
                  </td>
                  <td className="py-4 px-3 text-xs font-semibold text-slate-700">{host}</td>
                  <td className="py-4 px-3">
                    <div className="text-xs font-medium text-slate-800 line-clamp-1 max-w-[400px]" title={p.name}>
                      {p.name}
                    </div>
                  </td>
                  <td className="py-4 px-3 text-center">
                    <SeverityBadge severity={p.severity} />
                  </td>
                  <td className="py-4 px-3 text-right text-xs font-mono text-slate-500 whitespace-nowrap">
                    {getDuration(p.clock)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

// ── Severity summary row (one card per severity)
const SeveritySummary = ({ problems }) => {
  const counts = Object.entries(SEVERITY).map(([k, s]) => ({
    ...s,
    key: parseInt(k),
    count: problems.filter(p => parseInt(p.severity) === parseInt(k)).length,
  })).filter(s => s.count > 0);

  if (counts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {counts.map(s => (
        <div
          key={s.key}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ backgroundColor: s.bg, color: s.text }}
        >
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
          {s.label}
          <span className="font-mono font-bold">{s.count}</span>
        </div>
      ))}
    </div>
  );
};

// ── Host Groups bar chart
const HostGroupsWidget = ({ hostgroups }) => {
  if (!hostgroups || hostgroups.length === 0) return (
    <EmptyState icon="📂" message="No host group data available" />
  );

  const data = hostgroups
    .map(g => ({
      name: g.name,
      value: parseInt(g.hosts || 0)
    }))
    .filter(d => d.value > 0 && !d.name.toLowerCase().includes('template'))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  if (data.length === 0) return (
    <EmptyState icon="📂" message="No functional groups with devices found" />
  );

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 10, right: 30, top: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis type="number" hide domain={[0, 'dataMax + 2']} />
          <YAxis
            dataKey="name"
            type="category"
            width={120}
            tick={{ fontSize: 10, fontWeight: 700, fill: '#475569' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: '#f1f5f9', opacity: 0.4 }}
            contentStyle={{ fontSize: 11, borderRadius: 10, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
          />
          <Bar
            dataKey="value"
            radius={[0, 6, 6, 0]}
            barSize={18}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={`hsl(217, 91%, ${55 - (index * 4)}%)`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── MAIN OVERVIEW PAGE COMPONENT
const OverviewPage = ({ hosts, problems, triggers, hostgroups, loading }) => {
  const hostsUp = hosts.filter(h => getHostAvailability(h) === 'up').length;
  const hostsDown = hosts.filter(h => getHostAvailability(h) === 'down').length;
  const hostsUnknown = hosts.filter(h => getHostAvailability(h) === 'unknown').length;
  const unackedCount = problems.filter(p => parseInt(p.acknowledged) === 0).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        subtitle={`Last updated ${new Date().toLocaleTimeString()}`}
      />

      {/* Row 1 — Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Hosts"
          value={hosts.length}
          sub={`${hostsUnknown} unknown`}
          accentColor="#3b82f6"
          loading={loading}
        />
        <StatCard
          label="Hosts Up"
          value={hostsUp}
          sub="Responding"
          accentColor="#10b981"
          loading={loading}
        />
        <StatCard
          label="Hosts Down"
          value={hostsDown}
          sub="Unreachable"
          accentColor="#ef4444"
          loading={loading}
          pulse={hostsDown > 0}
        />
      </div>

      {/* Row 2 — Honeycomb Host Availability */}
      <Card>
        <CardHeader>
          <CardTitle>Host Availability</CardTitle>
          <p className="text-xs text-slate-400 mt-1">Live status of all monitored devices</p>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-48 w-full" /> : <HoneycombWidget hosts={hosts} />}
        </CardContent>
      </Card>

      {/* Row 3 — Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Current Problems — spans 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Problems</CardTitle>
                <p className="text-xs text-slate-400 mt-1">Recently resolved and active issues</p>
              </div>
              <SeverityBadge severity={
                problems.length > 0 ? Math.max(...problems.map(p => parseInt(p.severity))).toString() : '0'
              } />
            </div>
          </CardHeader>
          <CardContent>
            {loading
              ? <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              : <CurrentProblems problems={problems} />
            }
          </CardContent>
        </Card>

        {/* Severity Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Problems by Severity</CardTitle>
            <p className="text-xs text-slate-400 mt-1">Distribution across all active</p>
          </CardHeader>
          <CardContent>
            {loading
              ? <Skeleton className="h-52 w-full" />
              : <SeverityChart problems={problems} />
            }
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Host Groups */}
        <Card>
          <CardHeader>
            <CardTitle>Devices by Group</CardTitle>
            <p className="text-xs text-slate-400 mt-1">Distribution across host categories</p>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[280px] w-full" /> : <HostGroupsWidget hostgroups={hostgroups} />}
          </CardContent>
        </Card>

        {/* Top Triggers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Triggers</CardTitle>
            <p className="text-xs text-slate-400 mt-1">Triggers with most problem occurrences</p>
          </CardHeader>
          <CardContent>
            {loading
              ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              : <TopTriggersTable problems={problems} />
            }
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
