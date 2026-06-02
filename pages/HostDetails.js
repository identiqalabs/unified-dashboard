const { useState, useEffect, useMemo, memo, useCallback } = React;
const {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} = Recharts;

const ProblemsTable = ({ problems }) => {
  if (problems.length === 0) return <div className="py-20 text-center text-slate-400">No active problems for this host</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/50 border-b border-slate-100">
            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Severity</th>
            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Problem</th>
            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {problems.map((p, i) => (
            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
              <td className="p-4">
                <SeverityBadge severity={p.priority} />
              </td>
              <td className="p-4">
                <div className="text-xs font-bold text-slate-700">{p.description}</div>
                <div className="text-[10px] text-slate-400 font-medium">{new Date(p.clock * 1000).toLocaleString()}</div>
              </td>
              <td className="p-4 text-right">
                <Badge className="bg-red-100 text-red-700 border-0 text-[9px] uppercase font-black px-2 py-0.5 rounded-md">
                  Problem
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AvailabilityBar = ({ trends, loading }) => {
  const bars = useMemo(() => {
    if (loading) return Array(90).fill({ status: 'loading' });

    // Create 90 segments for a 30 day period (each bar is ~8 hours)
    const segments = [];
    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60);
    const segmentSize = (30 * 24 * 60 * 60) / 90;

    for (let i = 0; i < 90; i++) {
      const start = thirtyDaysAgo + (i * segmentSize);
      const end = start + segmentSize;

      const segmentTrends = trends.filter(t => t.clock >= start && t.clock < end);

      if (segmentTrends.length === 0) {
        segments.push({ status: 'nodata' });
      } else {
        const hasDown = segmentTrends.some(t => parseFloat(t.value_min) === 0);
        segments.push({ status: hasDown ? 'down' : 'up' });
      }
    }
    return segments;
  }, [trends, loading]);

  const uptimePercentage = useMemo(() => {
    if (trends.length === 0) return '100.00';
    const sum = trends.reduce((acc, t) => {
      const avg = t.value_avg !== undefined ? parseFloat(t.value_avg) : parseFloat(t.value_min || 0);
      return acc + avg;
    }, 0);
    return ((sum / trends.length) * 100).toFixed(2);
  }, [trends]);

  return (
    <Card className="border-slate-100 shadow-sm overflow-hidden">
      <CardHeader className="py-4 border-b border-slate-50 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px]">✓</div>
          <CardTitle className="text-sm font-bold text-slate-700">Availability (30 days)</CardTitle>
        </div>
        <div className="text-xs font-bold text-slate-400">Past 30 days</div>
      </CardHeader>
      <CardContent className="py-6">
        <div className="flex items-end gap-[2px] h-10 mb-4">
          {bars.map((bar, i) => (
            <div
              key={i}
              className={`flex-1 rounded-full transition-all duration-500 ${bar.status === 'loading' ? 'bg-slate-100 animate-pulse' :
                bar.status === 'up' ? 'bg-emerald-500' :
                  bar.status === 'down' ? 'bg-red-500' : 'bg-slate-200'
                }`}
              style={{
                height: bar.status === 'loading' ? '60%' : '100%',
                opacity: bar.status === 'nodata' ? 0.3 : 1
              }}
              title={bar.status === 'up' ? '100% Uptime' : bar.status === 'down' ? 'Issues detected' : 'No data'}
            />
          ))}
        </div>
        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <span>30 days ago</span>
          <span className="text-slate-600 text-xs font-black">{uptimePercentage}% uptime</span>
          <span>Today</span>
        </div>
      </CardContent>
    </Card>
  );
};

// Memoize the graph to prevent unnecessary re-renders
const MetricGraph = memo(({ title, data, color, unit = '%', loading }) => {
  const stats = useMemo(() => {
    if (!data || data.length === 0) return null;
    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return { min, max, avg };
  }, [data]);

  const format = (val) => {
    if (val === undefined || val === null) return '—';
    return val < 1 && val > 0 ? val.toFixed(4) : val.toFixed(2);
  };

  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm flex flex-col">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</CardTitle>
        {stats && (
          <div className="flex gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">Peak</span>
              <span className="text-[10px] font-bold text-slate-600">{format(stats.max)}{unit}</span>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        {loading ? (
          <Skeleton className="h-[180px] w-full" />
        ) : data.length === 0 ? (
          <div className="h-[180px] flex items-center justify-center border-2 border-dashed border-slate-100 rounded-xl">
            <EmptyState message={`No ${title} data`} />
          </div>
        ) : (
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={`color${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.1} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                  tickFormatter={(ts) => new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  minTickGap={30}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                  unit={unit}
                  tickFormatter={(val) => val < 1 && val > 0 ? val.toFixed(3) : val}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '11px',
                    fontWeight: '600'
                  }}
                  formatter={(val) => [val < 1 && val > 0 ? val.toFixed(4) : val, title]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  fillOpacity={1}
                  fill={`url(#color${title.replace(/\s+/g, '')})`}
                  strokeWidth={2.5}
                  animationDuration={400}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
      {stats && (
        <div className="grid grid-cols-3 divide-x divide-slate-50 border-t border-slate-50 bg-slate-50/30">
          <div className="p-3 text-center">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Min</p>
            <p className="text-xs font-bold text-slate-700">{format(stats.min)}{unit}</p>
          </div>
          <div className="p-3 text-center bg-white/50">
            <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Avg</p>
            <p className="text-xs font-black text-blue-600">{format(stats.avg)}{unit}</p>
          </div>
          <div className="p-3 text-center">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Max</p>
            <p className="text-xs font-bold text-slate-700">{format(stats.max)}{unit}</p>
          </div>
        </div>
      )}
    </Card>
  );
});

const StorageWidget = ({ storage, loading }) => {
  if (loading) return <Skeleton className="h-[200px] w-full" />;
  if (storage.length === 0) return <Card className="p-6 text-center text-slate-400 text-xs">No storage data</Card>;

  const formatSize = (val) => {
    if (val === undefined || val === null || val === '') return '-';
    let num = parseFloat(val);
    if (isNaN(num)) return val;
    if (num <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(num) / Math.log(k));
    const unit = sizes[i] || 'B';
    const finalVal = i < 0 ? num : num / Math.pow(k, i);
    return finalVal.toFixed(2) + ' ' + unit;
  };

  return (
    <div className="space-y-6">
      {storage
        .filter(s => {
          const id = s.id.toUpperCase();
          // Strict filter: only include real partition/volume names, exclude performance counters
          const isPerfCounter = id.includes('PHYSICALDISK') || id.includes('TIME') || id.includes('QUEUE') || id.includes('READ') || id.includes('WRITE');
          const isTargetDrive = id === 'C:' || id === 'D:' || id === '(C:)' || id === '(D:)' || id.includes('NEW VOLUME');
          return isTargetDrive && !isPerfCounter;
        })
        .map((s, i) => {
          const totalItem = s.items.find(item => item.units !== '%' && (item.name.toLowerCase().includes('total') || item.key_.includes('total')));
          const usedItem = s.items.find(item => item.units !== '%' && (item.name.toLowerCase().includes('used') || item.key_.includes('used')));
          const freeItem = s.items.find(item => item.units !== '%' && (item.name.toLowerCase().includes('free') || item.name.toLowerCase().includes('available') || item.key_.includes('free')));
          const pusedItem = s.items.find(item =>
            item.units === '%' && (item.name.toLowerCase().includes('used') || item.name.toLowerCase().includes('usage') || item.key_.includes('pused'))
          );

          let total = parseFloat(totalItem?.lastvalue || 0);
          let used = parseFloat(usedItem?.lastvalue || 0);
          let free = parseFloat(freeItem?.lastvalue || 0);
          let percent = parseFloat(pusedItem?.lastvalue || 0);

          // Cross-calculate missing values for better accuracy
          if (total > 0) {
            if (used === 0 && percent > 0) used = (percent / 100) * total;
            if (free === 0) free = Math.max(0, total - used);
            if (percent === 0 && used > 0) percent = (used / total * 100);
          } else if (used > 0 && free > 0) {
            total = used + free;
            percent = (used / total * 100);
          }

          percent = parseFloat(percent).toFixed(2);

          const chartData = [
            { name: 'Used', value: used || 0.0001, color: '#ef4444' },
            { name: 'Available', value: Math.max(0.0001, free), color: '#10b981' }
          ];

          return (
            <Card key={i} className="border-slate-200 shadow-sm overflow-hidden bg-white">
              <CardHeader className="py-2.5 px-4 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-[11px] font-black text-slate-600 uppercase tracking-wider truncate">
                  FS [{s.id}]: Space utilization chart
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row items-center gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                  {/* Pie Chart Section */}
                  <div className="w-full md:w-[240px] h-[180px] p-4 flex items-center justify-center relative bg-white">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={0}
                          outerRadius={65}
                          dataKey="value"
                          stroke="#fff"
                          strokeWidth={1}
                          startAngle={90}
                          endAngle={-270}
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val) => formatSize(val)}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend Section */}
                  <div className="flex-1 p-5 space-y-3 bg-slate-50/20 w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-slate-400 rounded-sm shadow-sm" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Value: Total Space</span>
                        <span className="text-xs font-bold text-slate-700">{formatSize(total)} (100%)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-red-500 rounded-sm shadow-sm" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-red-400 uppercase tracking-tighter">Value: Space Used</span>
                        <span className="text-xs font-bold text-slate-900">{formatSize(used)} ({percent}%)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-emerald-500 rounded-sm shadow-sm" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter">Value: Space Available</span>
                        <span className="text-xs font-bold text-slate-900">{formatSize(free)} ({(100 - percent).toFixed(2)}%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
    </div>
  );
};

const StatusWidget = ({ fans, loading }) => {
  if (loading) return <Skeleton className="h-[200px] w-full" />;
  if (fans.length === 0) return <Card className="p-6 text-center text-slate-400 text-xs">No status/sensor data</Card>;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="py-3 border-b border-slate-50 flex flex-row items-center gap-2">
        <span className="text-lg">⚙️</span>
        <CardTitle className="text-sm font-bold text-slate-700">Hardware State</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-50">
          {fans.map((f, i) => {
            const rawVal = f.lastvalue;
            const val = String(rawVal || '').toLowerCase();
            const isNormal = rawVal == 1 ||
              val === '1' ||
              val.includes('normal') ||
              val.includes('ok') ||
              val.includes('up') ||
              val.includes('(1)');
            return (
              <div key={i} className="flex items-center justify-between p-3 px-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-600">{f.name}</span>
                  <span className="text-[9px] text-slate-400 font-medium uppercase tracking-tight">Value: {rawVal}</span>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-md border-0 ${isNormal ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}
                >
                  {isNormal ? 'normal' : 'problem'}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

const AlertsTab = ({ alerts, loading }) => {
  if (loading) return <Skeleton className="h-[400px] w-full" />;
  if (alerts.length === 0) return <Card className="p-12 text-center text-slate-400">No alert history found for this host</Card>;

  return (
    <Card className="border-slate-200 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</th>
              <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject</th>
              <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Recipient</th>
              <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {alerts.map((alert, i) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 text-xs font-medium text-slate-500">
                  {new Date(alert.clock * 1000).toLocaleString()}
                </td>
                <td className="p-4">
                  <div className="text-xs font-bold text-slate-700 line-clamp-1">{alert.subject}</div>
                  <div className="text-[10px] text-slate-400 font-medium line-clamp-1">{alert.message}</div>
                </td>
                <td className="p-4 text-xs font-bold text-slate-600">
                  {alert.sendto}
                </td>
                <td className="p-4 text-center">
                  <Badge className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-md border-0 ${alert.status == 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {alert.status == 1 ? 'sent' : 'failed'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

const InterfacesTab = ({ interfaces, loading }) => {
  const [selectedIface, setSelectedIface] = React.useState(null);

  if (loading) return <Skeleton className="h-[400px] w-full" />;
  if (interfaces.length === 0) return <Card className="p-12 text-center text-slate-400">No interface data discovered</Card>;

  const formatValue = (val, units) => {
    if (!val || val === '0') return '0' + (units ? ' ' + units : '');
    const num = parseFloat(val);
    if (isNaN(num)) return val + (units ? ' ' + units : '');

    // Scale bps
    if (units?.toLowerCase() === 'bps') {
      if (num > 1000000000) return (num / 1000000000).toFixed(2) + ' Gbps';
      if (num > 1000000) return (num / 1000000).toFixed(2) + ' Mbps';
      if (num > 1000) return (num / 1000).toFixed(2) + ' Kbps';
      return num.toFixed(2) + ' bps';
    }

    return num.toLocaleString() + (units ? ' ' + units : '');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Grid View */}
      <Card className="border-slate-200 shadow-sm p-6 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Device Interfaces</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                {interfaces.filter(i => {
                  const s = i.items.find(item => item.name.toLowerCase().includes('status'))?.lastvalue;
                  return s == 1 || (s && String(s).toLowerCase().includes('up'));
                }).length} Active / {interfaces.length} Total
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {interfaces.map((iface, i) => {
            const status = iface.items.find(item => item.name.toLowerCase().includes('status'))?.lastvalue;
            const isUp = status == 1 || (status && String(status).toLowerCase().includes('up'));
            const isSelected = selectedIface?.id === iface.id;

            return (
              <button
                key={i}
                onClick={() => setSelectedIface(isSelected ? null : iface)}
                className={`group relative p-3 rounded-xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-2 ${isUp
                    ? isSelected ? 'bg-emerald-50 border-emerald-500 shadow-md ring-4 ring-emerald-50' : 'bg-emerald-50/30 border-emerald-100/50 hover:border-emerald-500 hover:bg-emerald-50'
                    : isSelected ? 'bg-red-50 border-red-500 shadow-md ring-4 ring-red-50' : 'bg-red-50/30 border-red-100/50 hover:border-red-500 hover:bg-red-50'
                  }`}
              >
                <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${isUp ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
                <span className={`text-[11px] font-black uppercase tracking-tight text-center truncate w-full ${isUp ? 'text-emerald-900' : 'text-red-900'}`}>
                  {iface.id}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Details View */}
      {selectedIface && (
        <Card className="border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Interface Details:</span>
              <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-700 shadow-sm">
                {selectedIface.id}
              </span>
            </div>
            <button onClick={() => setSelectedIface(null)} className="text-slate-400 hover:text-slate-600">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-100">
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Metric Name</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {selectedIface.items.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="text-xs font-bold text-slate-700">{item.name}</div>
                      <div className="text-[9px] text-slate-400 font-mono mt-0.5">{item.key_}</div>
                    </td>
                    <td className="p-4 text-xs font-black text-blue-600">
                      {formatValue(item.lastvalue, item.units)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

const LogsTab = ({ hostIp, hostName }) => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const limit = 50;

  useEffect(() => {
    if (hostIp || hostName) {
      setLoading(true);
      setError(null);
      // Query Loki for host logs using '30d' range equivalent to Graylog's range parameter
      api.getLogsByHost(hostName || hostIp, limit, '30d')
        .then(res => {
          if (res.error) {
            setError(res.error);
          } else {
            setLogs(res.logs || []);
            setTotal(res.stats?.total || res.logs?.length || 0);
          }
        })
        .catch(err => {
          setError(err.message);
        })
        .finally(() => setLoading(false));
    }
  }, [hostIp, hostName, page]);

  if (loading) return <Skeleton className="h-[400px] w-full" />;

  if (error) return (
    <Card className="p-12 text-center text-slate-400">
      <div className="text-4xl mb-4">⚠️</div>
      <p className="font-bold text-red-600 uppercase tracking-tight">Grafana Loki Connection Error</p>
      <p className="text-xs mt-2 text-slate-600">{error}</p>
      <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100 text-[10px] text-slate-500 font-medium">
        Ensure Grafana Loki is running and reachable at the configured address.
      </div>
    </Card>
  );

  if (logs.length === 0) return (
    <Card className="p-12 text-center text-slate-400">
      <div className="text-4xl mb-4">📜</div>
      <p className="font-bold text-slate-600 uppercase tracking-tight">No Logs Found in Grafana Loki</p>
      <p className="text-xs mt-1">No messages found for source: <b>{hostName || hostIp}</b> across all logs.</p>
    </Card>
  );

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logs from {hostName || hostIp}</span>
          <Badge className="bg-slate-100 text-slate-600 border-0 text-[9px] font-black px-2 py-0.5">{total.toLocaleString()} TOTAL</Badge>
        </div>
        <Badge className="bg-blue-50 text-blue-600 border-0 text-[10px] px-2 py-0.5">All Time</Badge>
      </div>
      {logs.map((log, i) => {
        const m = typeof log.message === 'object' && log.message !== null ? log.message : {
          timestamp: log.timestamp || new Date().toISOString(),
          message: typeof log.message === 'string' ? log.message : (log.message?.message || ''),
          level: log.labels?.level || log.labels?.severity || '6',
          facility: log.labels?.facility || '',
          ...log.labels,
          ...log
        };
        return (
          <Card key={i} className="p-3 border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group">
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-end pt-1 min-w-[70px]">
                <span className="text-[10px] font-bold text-slate-400 leading-none">{new Date(m.timestamp).toLocaleDateString()}</span>
                <span className="text-[11px] font-black text-slate-700">{new Date(m.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="w-1.5 h-10 bg-slate-100 rounded-full group-hover:bg-blue-400 transition-colors" />
              <div className="flex-1">
                <div className="text-[11px] font-mono text-slate-600 break-words leading-relaxed">
                  {m.message}
                </div>
                {(m.facility || m.level) && (
                  <div className="mt-2 flex gap-2">
                    {m.facility && <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Facility: {m.facility}</span>}
                    {m.level && <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Level: {m.level}</span>}
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-6 border-t border-slate-100 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest"
          >
            Previous
          </Button>
          <div className="text-[10px] font-black text-slate-400 mx-4 uppercase tracking-widest">
            Page {page} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

const ConfigTab = ({ node, loading, dataCount }) => {
  const [config, setConfig] = useState('');
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (node?.name) {
      setFetching(true);
      fetch(`http://192.168.1.22:8888/node/fetch/${node.name}`)
        .then(res => res.text())
        .then(text => setConfig(text))
        .catch(err => setConfig('Error: Could not retrieve configuration content.'))
        .finally(() => setFetching(false));
    }
  }, [node?.name]);

  if (loading) return <Skeleton className="h-[400px] w-full" />;

  if (!dataCount || dataCount === 0) return (
    <Card className="p-12 text-center text-slate-400">
      <div className="text-4xl mb-4">📡</div>
      <p className="font-bold text-slate-600 uppercase tracking-tight">Oxidized API Connection Issue</p>
      <p className="text-xs mt-2 max-w-md mx-auto">The dashboard cannot reach <b>http://192.168.1.22:8888/nodes.json</b>. This is usually caused by browser security blocking the request (CORS).</p>

      <div className="mt-8 p-6 bg-blue-50/50 rounded-2xl border border-blue-100 text-left inline-block max-w-sm">
        <p className="text-[10px] font-black uppercase text-blue-500 mb-3 tracking-widest">Immediate Solution:</p>
        <ul className="text-xs space-y-2 text-slate-600 font-medium">
          <li className="flex gap-2"><span>1.</span> <span>Install the <b>"Allow CORS"</b> extension in your browser.</span></li>
          <li className="flex gap-2"><span>2.</span> <span>Toggle it <b>ON</b>.</span></li>
          <li className="flex gap-2"><span>3.</span> <span><b>Refresh</b> this page.</span></li>
        </ul>
      </div>
    </Card>
  );

  if (!node) return (
    <Card className="p-12 text-center text-slate-400">
      <div className="text-4xl mb-4">🔍</div>
      <p className="font-bold text-slate-600 uppercase tracking-tight">No Matching Node Found</p>
      <p className="text-xs mt-1">Oxidized found {dataCount} nodes, but none match this host's IP or name.</p>
    </Card>
  );

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === 'unknown') return 'Never';
    try {
      // Clean up IST/timezone strings if present
      const clean = dateStr.replace(/\s[A-Z]{3,4}$/, '');
      const d = new Date(clean);
      return isNaN(d.getTime()) ? dateStr : d.toLocaleString();
    } catch (e) {
      return dateStr;
    }
  };

  const stats = [
    { label: 'Model', value: node.model, icon: '📦' },
    { label: 'Group', value: node.group, icon: '📁' },
    { label: 'Last Status', value: node.last_status, icon: node.last_status === 'success' ? '✅' : '❌' },
    { label: 'Last Backup', value: formatDate(node.mtime), icon: '🕒' },
    { label: 'Last Change', value: formatDate(node.last_time), icon: '📝' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((s, i) => (
          <Card key={i} className="p-4 border-slate-200 shadow-sm bg-white/50">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                {s.icon} {s.label}
              </span>
              <span className="text-xs font-black text-slate-700 truncate" title={s.value}>{s.value}</span>
            </div>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200 shadow-xl overflow-hidden bg-slate-950 border-0">
        <div className="bg-slate-900/50 p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${fetching ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Live Configuration Backup: {node.name}
            </span>
          </div>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-800" />
            <div className="w-2 h-2 rounded-full bg-slate-800" />
            <div className="w-2 h-2 rounded-full bg-slate-800" />
          </div>
        </div>
        <div className="p-6 overflow-x-auto min-h-[400px]">
          {fetching ? (
            <div className="flex items-center justify-center h-full pt-20">
              <div className="text-emerald-500 font-mono text-xs animate-pulse">Fetching configuration...</div>
            </div>
          ) : (
            <pre className="text-[11px] font-mono text-emerald-500/90 leading-relaxed whitespace-pre font-medium">
              {config || '# No configuration data received.'}
            </pre>
          )}
        </div>
      </Card>
    </div>
  );
};

const DeviceInfo = ({ host, details, loading }) => {
  const inv = host.inventory || {};
  const isAgent = host.interfaces?.some(i => i.type === '1');

  const formatTotalMem = (val) => {
    if (!val) return '—';
    const num = parseFloat(val);
    if (num > 1024 * 1024 * 1024) return (num / 1024 / 1024 / 1024).toFixed(1) + ' GB';
    return (num / 1024 / 1024).toFixed(1) + ' MB';
  };

  const InfoRow = ({ label, value }) => (
    <div className="flex border-b border-slate-50 py-3 last:border-0 hover:bg-slate-50/50 transition-colors px-2">
      <div className="w-[180px] text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
      <div className="flex-1 text-xs font-bold text-slate-700">{loading ? <Skeleton className="h-4 w-32" /> : (value || '—')}</div>
    </div>
  );

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden h-full">
      <CardHeader className="py-3 border-b border-slate-50 flex flex-row items-center gap-2">
        <span className="text-lg">🖥️</span>
        <div className="text-[11px] font-bold leading-relaxed text-slate-600 line-clamp-4">
          {inv.os_full || details.descr || inv.notes || host.description || 'No detailed system description provided.'}
        </div>
      </CardHeader>
      <CardContent className="py-4 space-y-4">
        <InfoRow label="System Name" value={inv.name || details.name || host.name} />
        <InfoRow label="Resolved IP" value={host.interfaces?.[0]?.ip} />

        {!isAgent && <InfoRow label="Hardware" value={inv.hardware || details.hw || inv.type} />}

        <InfoRow label="Operating System" value={inv.os || details.os || inv.software} />

        {isAgent ? (
          <>
            <InfoRow label="CPU Cores" value={details.cores} />
            <InfoRow label="Total Memory" value={formatTotalMem(details.totalMem)} />
          </>
        ) : (
          <>
            <InfoRow label="Serial" value={inv.serialno_a || details.serial || inv.serialno_b} />
            <InfoRow label="Object ID" value={details.objectId || inv.software_app_a} />
          </>
        )}

        <InfoRow label="Uptime" value={details.uptime} />
      </CardContent>
    </Card>
  );
};

const HostDetailsPage = ({ host, onBack, activeTab, onTabChange, oxidizedNodes }) => {
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState([]);
  const [details, setDetails] = useState({
    uptime: null,
    descr: null,
    hw: null,
    os: null,
    name: null,
    serial: null,
    objectId: null
  });
  const [storage, setStorage] = useState([]);
  const [fans, setFans] = useState([]);
  const [interfaces, setInterfaces] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [metrics, setMetrics] = useState({
    cpu: { data: [], unit: '%' },
    memory: { data: [], unit: '%' },
    icmp: { data: [], unit: 's' }
  });
  const [error, setError] = useState(null);

  const oxidizedNode = useMemo(() => {
    if (!oxidizedNodes || !Array.isArray(oxidizedNodes) || oxidizedNodes.length === 0) return null;

    const hostIp = host.interfaces?.[0]?.ip;
    const hostName = host.name?.toLowerCase();
    const internalName = host.host?.toLowerCase();

    return oxidizedNodes.find(node => {
      if (!node) return false;
      const nodeName = node.name?.toLowerCase();
      const nodeIp = node.ip?.toLowerCase();

      return (
        nodeName === hostIp ||
        nodeIp === hostIp ||
        nodeName === hostName ||
        nodeName === internalName ||
        (hostIp && nodeName?.includes(hostIp)) ||
        (hostName && nodeName?.includes(hostName))
      );
    });
  }, [oxidizedNodes, host]);

  const fetchHostMetrics = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const items = await api.getItems(host.hostid);

      const findItem = (patterns, exclude = []) => {
        const patternsLower = patterns.map(p => p.toLowerCase());
        const excludeLower = exclude.map(ex => ex.toLowerCase());

        // 1. First look for exact match in key_ for all patterns in order
        for (const p of patternsLower) {
          const match = items.find(item => item.key_.toLowerCase() === p);
          if (match) return match;
        }

        // 2. Look for exact match in name for all patterns in order
        for (const p of patternsLower) {
          const match = items.find(item => item.name.toLowerCase() === p);
          if (match) return match;
        }

        // 3. Look for partial match in key_ or name for all patterns in order, respecting exclusions
        for (const p of patternsLower) {
          const match = items.find(item =>
            (item.name.toLowerCase().includes(p) || item.key_.toLowerCase().includes(p)) &&
            !excludeLower.some(ex => item.key_.toLowerCase().includes(ex) || item.name.toLowerCase().includes(ex))
          );
          if (match) return match;
        }

        return null;
      };

      const findItems = (patterns) => {
        const pLower = patterns.map(p => p.toLowerCase());
        return items.filter(item =>
          pLower.some(p => item.name.toLowerCase().includes(p) || item.key_.toLowerCase().includes(p))
        );
      };

      const cpuItem = findItem(
        ['cpu utilization', 'system.cpu.util', 'cpu load', 'cpu usage', 'load', 'processor', 'cpmCPUTotal5minRev', 'ssCpuIdle', 'ssCpuUser', 'avg'],
        ['memory', 'mem', 'storage', 'disk', 'swap', 'ping', 'icmp', 'uptime']
      );
      const memItem = findItem(
        ['memory utilization', 'vm.memory.util', 'vm.memory.size', 'memory usage', 'memory used', 'free memory', 'available memory', 'memory pool', 'util', 'free', 'available', 'used', 'hrStorageUsed', 'ciscoMemoryPoolFree'],
        ['cpu', 'load', 'ping', 'icmp', 'uptime']
      );
      const icmpItem = findItem(
        ['icmppingsec', 'icmp response time', 'ping response', 'ping time', 'latency', 'rtt', 'avg'],
        ['icmpping', 'ping', 'icmp ping', 'icmp']
      ) || findItem(['icmp ping', 'icmp']);

      const pingItem = findItem(['icmpping', 'ping status', 'icmp ping', 'agent.ping', 'zabbix[host,agent,available]']);
      const uptimeItem = findItem(['system uptime', 'sysuptime', 'system.uptime', 'system.localtime']);
      const descrItem = findItem(['system description', 'sysdescr', 'system.descr', 'system.sw.os']);
      const hwItem = findItem(['hardware model', 'system.hw.model', 'model name', 'hardware', 'model', 'entPhysicalModelName', 'system.hw.chassis']);
      const osItem = findItem(['operating system', 'system.sw.os', 'software version', 'os', 'version', 'system.uname']);
      const serialItem = findItem(['serial number', 'system.hw.serial', 'chassis serial', 'entPhysicalSerialNum', 'serial', 'chassis', 'serialno']);
      const nameItem = findItem(['system name', 'system.name', 'host name', 'system.hostname']);
      const objectIdItem = findItem(['object id', 'system.objectid', 'sysobjectid']);
      const coresItem = findItem(['number of cores', 'cores', 'system.cpu.num']);
      const totalMemItem = findItem(['total memory', 'vm.memory.size[total]']);

      // Storage, Fans, Interfaces
      const sItems = findItems(['storage', 'disk', 'space', 'partition', 'flash']);
      const fItems = findItems(['fan', 'sensor', 'temperature', 'psu', 'power supply']);
      const iItems = findItems(['interface', 'ifDescr', 'ifName', 'ifAlias', 'ifOperStatus', 'ifInOctets', 'ifOutOctets', 'net.if']);

      const fetchHistory = async (item) => {
        if (!item) return { data: [], unit: '' };
        const history = await api.getHistory(item.itemid, item.value_type, 100);
        return {
          data: history.map(h => ({
            timestamp: parseInt(h.clock),
            value: parseFloat(h.value),
          })).sort((a, b) => a.timestamp - b.timestamp),
          unit: item.units || ''
        };
      };

      const fansData = fItems.map(item => ({
        name: item.name,
        lastvalue: item.lastvalue || 'No data'
      }));
      setFans(fansData);

      const fetchLatest = async (item) => {
        if (!item) return null;
        const history = await api.getHistory(item.itemid, item.value_type, 1);
        return history.length > 0 ? history[0].value : null;
      };

      const safeFetch = async (promise, fallback) => {
        try {
          return await promise;
        } catch (e) {
          console.error("Safe fetch failed:", e);
          return fallback;
        }
      };

      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);

      const [cpu, memory, icmp, trendData, uptimeHistory, descrVal, hwVal, osVal, serialVal, nameVal, objectIdVal, coresVal, totalMemVal, alertData] = await Promise.all([
        safeFetch(fetchHistory(cpuItem), { data: [], unit: '%' }),
        safeFetch(fetchHistory(memItem), { data: [], unit: '%' }),
        safeFetch(fetchHistory(icmpItem), { data: [], unit: 's' }),
        pingItem ? safeFetch(api.getTrends(pingItem.itemid, thirtyDaysAgo), []) : Promise.resolve([]),
        uptimeItem ? safeFetch(api.getHistory(uptimeItem.itemid, uptimeItem.value_type, 1), []) : Promise.resolve([]),
        safeFetch(fetchLatest(descrItem), null),
        safeFetch(fetchLatest(hwItem), null),
        safeFetch(fetchLatest(osItem), null),
        safeFetch(fetchLatest(serialItem), null),
        safeFetch(fetchLatest(nameItem), null),
        safeFetch(fetchLatest(objectIdItem), null),
        safeFetch(fetchLatest(coresItem), null),
        safeFetch(fetchLatest(totalMemItem), null),
        safeFetch(api.getAlerts(host.hostid), [])
      ]);

      // Group interfaces smarter
      const nameGroups = {};

      iItems.forEach(item => {
        // 1. Determine a temporary index for grouping (by key)
        const match = item.key_.match(/\[(.*?)\]/) || item.key_.match(/\.(\d+)$/);
        const tempIndex = match ? match[1] : 'unknown';

        if (!nameGroups[tempIndex]) nameGroups[tempIndex] = [];
        nameGroups[tempIndex].push(item);
      });

      // 2. Resolve names and merge by name
      const mergedMap = {};
      Object.entries(nameGroups).forEach(([idx, groupItems]) => {
        let bestName = idx;
        const nameItem = groupItems.find(i =>
          i.name.toLowerCase().includes('descr') || i.name.toLowerCase().includes('name') ||
          i.key_.toLowerCase().includes('ifname') || i.key_.toLowerCase().includes('ifdescr')
        );

        if (nameItem && nameItem.lastvalue && nameItem.lastvalue !== '0') {
          bestName = nameItem.lastvalue;
        } else {
          for (const i of groupItems) {
            const portMatch = i.name.match(/\b(Port|Fa|Gi|Eth|Ten|Vl|Vlan|Loopback|Tunnel)[\s\w\d\/-]*/i);
            if (portMatch) {
              bestName = portMatch[0].trim();
              break;
            }
          }
        }

        if (bestName.toLowerCase().startsWith('face')) bestName = bestName.substring(4).trim() || idx;

        // Merge into the final map by name
        if (!mergedMap[bestName]) mergedMap[bestName] = [];
        mergedMap[bestName] = [...mergedMap[bestName], ...groupItems];
      });

      const ifacesList = Object.entries(mergedMap).map(([name, items]) => ({
        id: name,
        items: items
      })).filter(iface => {
        const name = iface.id.toLowerCase();
        return (
          name.startsWith('fa') || name.startsWith('gi') ||
          name.startsWith('eth') || name.startsWith('ten') ||
          name.startsWith('port') || name.includes('ethernet')
        ) && !name.includes('vlan') && !name.includes('loopback') && !name.includes('null');
      }).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));

      // Group storage
      const storageMap = {};
      sItems.forEach(item => {
        // Match drive letters like C: or partition names in brackets [ / ] or [ C: ]
        const match = item.key_.match(/\[(.*?)(?:,.*?)?\]/) || item.name.match(/\[(.*?)(?:,.*?)?\]/) || item.name.match(/([A-Z]:)/i);
        let sId = match ? match[1] || match[0] : 'Storage';

        // Cleanup sId
        sId = sId.replace(/[\[\]\(\)]/g, '').trim();
        if (!sId) sId = 'Main';

        if (!storageMap[sId]) storageMap[sId] = { id: sId, items: [] };
        storageMap[sId].items.push(item);
      });

      setMetrics({ cpu, memory, icmp });
      setTrends(trendData);
      setInterfaces(ifacesList);
      setStorage(Object.values(storageMap));
      setAlerts(alertData || []);

      const newDetails = {
        uptime: '—',
        descr: descrVal,
        hw: hwVal,
        os: osVal,
        name: nameVal,
        serial: serialVal,
        objectId: objectIdVal,
        cores: coresVal,
        totalMem: totalMemVal
      };

      if (uptimeHistory.length > 0 && uptimeItem) {
        let seconds = parseInt(uptimeHistory[0].value);
        if (uptimeItem.units && uptimeItem.units !== 's') {
          // Handle SNMP timeticks (1/100 sec)
          seconds = seconds / 100;
        }
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        newDetails.uptime = `${days}d ${hours}h ${mins}m`;
      }

      setDetails(newDetails);
      setError(null);
    } catch (e) {
      console.error(e);
      setError("Failed to fetch host metrics");
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchHostMetrics(true);
    const interval = setInterval(() => fetchHostMetrics(false), 60000);
    return () => clearInterval(interval);
  }, [host.hostid]);

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-5">
          <Button variant="outline" size="sm" onClick={onBack} className="h-10 w-10 p-0 rounded-xl hover:bg-slate-50 border-slate-200">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{host.name}</h1>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase tracking-widest">{host.hostid}</span>
            </div>
            <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${host.status === '0' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              {host.interfaces?.[0]?.ip || 'No IP'} • {host.description || 'No description'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SeverityBadge severity={
            host.triggers?.some(t => t.value === '1')
              ? Math.max(...host.triggers.filter(t => t.value === '1').map(t => parseInt(t.priority))).toString()
              : '0'
          } />
          <Button variant="outline" size="sm" onClick={() => fetchHostMetrics(true)} className="h-10 px-4 rounded-xl font-bold text-xs uppercase tracking-wider">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-100 mb-8 gap-10">
        {[
          { id: 'overview', label: 'Overview', icon: '💡' },
          { id: 'graphs', label: 'Graphs', icon: '📈' },
          { id: 'logs', label: 'Logs', icon: '📜' },
          { id: 'ports', label: 'Ports', icon: '🔗' },
          { id: 'config', label: 'Config', icon: '📄' },
          { id: 'problems', label: 'Problems', icon: '⚠️' },
          { id: 'alerts', label: 'Alerts', icon: '🔔' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`pb-4 text-[11px] font-black uppercase tracking-widest transition-all relative flex items-center gap-2 ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
              }`}
          >
            <span className="text-lg">{tab.icon}</span>
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <AvailabilityBar trends={trends} loading={loading} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <DeviceInfo host={host} details={details} loading={loading} />
            <div className="space-y-8">
              <StorageWidget storage={storage} loading={loading} />
              <StatusWidget fans={fans} loading={loading} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'graphs' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <MetricGraph title="CPU Utilization" data={metrics.cpu.data} color="#3b82f6" unit={metrics.cpu.unit} loading={loading} />
          <MetricGraph title="Memory Utilization" data={metrics.memory.data} color="#8b5cf6" unit={metrics.memory.unit} loading={loading} />
          <MetricGraph title="ICMP Response Time" data={metrics.icmp.data} color="#10b981" unit={metrics.icmp.unit} loading={loading} />
        </div>
      )}

      {activeTab === 'ports' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <InterfacesTab interfaces={interfaces} loading={loading} />
        </div>
      )}

      {activeTab === 'logs' && (
        <LogsTab hostIp={host.interfaces?.[0]?.ip} hostName={host.name} />
      )}

      {activeTab === 'config' && (
        <ConfigTab node={oxidizedNode} loading={loading} dataCount={oxidizedNodes?.length || 0} />
      )}

      {activeTab === 'problems' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-slate-200">
            <CardHeader className="py-4 border-b border-slate-50 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-700">Active Problems</CardTitle>
              <Badge variant="outline" className="bg-red-50 text-red-600 border-red-100 text-[10px] font-black">
                {host.triggers?.filter(t => t.value == 1).length || 0} Issues
              </Badge>
            </CardHeader>
            <div className="p-0">
              <ProblemsTable
                problems={(host.triggers || [])
                  .filter(t => t.value == 1)
                  .map(t => ({
                    ...t,
                    hostname: host.name,
                    clock: Date.now() / 1000
                  }))
                }
              />
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <AlertsTab alerts={alerts} loading={loading} />
        </div>
      )}
    </div>
  );
};

window.HostDetailsPage = HostDetailsPage;
