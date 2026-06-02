// All shared helper functions — no imports needed, globals available

const SEVERITY = {
  0: { label: 'Interface Issue', color: '#94a3b8', bg: '#f8fafc', text: '#475569' },
  1: { label: 'Information', color: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8' },
  2: { label: 'Warning', color: '#f59e0b', bg: '#fffbeb', text: '#b45309' },
  3: { label: 'Average', color: '#f97316', bg: '#fff7ed', text: '#c2410c' },
  4: { label: 'High', color: '#ef4444', bg: '#fef2f2', text: '#b91c1c' },
  5: { label: 'Routing Issue', color: '#dc2626', bg: '#fef2f2', text: '#991b1b' },
};

function getDuration(clock, r_clock) {
  const start = parseInt(clock);
  const end = r_clock && r_clock !== '0' ? parseInt(r_clock) : Math.floor(Date.now() / 1000);
  const secs = end - start;
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
  return `${Math.floor(secs / 86400)}d ${Math.floor((secs % 86400) / 3600)}h`;
}

function getHostAvailability(host) {
  if (!host.interfaces || host.interfaces.length === 0) return 'unknown';
  const agent = host.interfaces.find(i => i.type === '1');
  const iface = agent || host.interfaces[0];
  if (iface.available === '1') return 'up';
  if (iface.available === '2') return 'down';
  return 'unknown';
}

function formatNumber(n) {
  return (n || 0).toLocaleString();
}

function timeAgo(clock) {
  const secs = Math.floor(Date.now() / 1000) - parseInt(clock);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}
