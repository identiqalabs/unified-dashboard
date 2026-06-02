// Shared shadcn/ui-style components — no imports, React is global

// ── Card
const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
    {children}
  </div>
);
const CardHeader = ({ children, className = '' }) => (
  <div className={`px-6 pt-6 pb-0 ${className}`}>{children}</div>
);
const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-sm font-medium text-slate-500 ${className}`}>{children}</h3>
);
const CardContent = ({ children, className = '' }) => (
  <div className={`px-6 pb-6 pt-4 ${className}`}>{children}</div>
);

// ── Badge
const Badge = ({ children, style = {}, className = '' }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
    style={style}
  >
    {children}
  </span>
);

// ── Button
const Button = ({ children, onClick, variant = 'default', size = 'default', className = '', disabled = false }) => {
  const base = 'inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none disabled:opacity-50 disabled:pointer-events-none';
  const variants = {
    default:   'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
    outline:   'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    ghost:     'text-slate-600 hover:bg-slate-100',
    danger:    'bg-red-600 text-white hover:bg-red-700',
  };
  const sizes = {
    default: 'h-9 px-4 text-sm',
    sm:      'h-7 px-3 text-xs',
    lg:      'h-11 px-6 text-base',
    icon:    'h-9 w-9',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${className}`}
    >
      {children}
    </button>
  );
};

// ── Skeleton
const Skeleton = ({ className = '' }) => (
  <div className={`skeleton ${className}`} />
);

// ── Status Dot
const StatusDot = ({ status }) => {
  const colors = {
    up:      'bg-emerald-500',
    down:    'bg-red-500',
    unknown: 'bg-slate-300',
  };
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[status] || colors.unknown}`} />
  );
};

// ── Severity Badge
const SeverityBadge = ({ severity }) => {
  const s = SEVERITY[severity] || SEVERITY[0];
  return (
    <Badge
      style={{ backgroundColor: s.bg, color: s.text }}
      className="font-semibold"
    >
      {s.label}
    </Badge>
  );
};

// ── Divider
const Divider = () => <div className="border-t border-slate-100 my-1" />;

// ── Empty State
const EmptyState = ({ icon = '📭', message = 'No data available' }) => (
  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
    <span className="text-3xl mb-3">{icon}</span>
    <p className="text-sm font-medium">{message}</p>
  </div>
);

// ── Section Header
const SectionHeader = ({ title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-4">
    <div>
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

// ── Page Header
const PageHeader = ({ title, subtitle, children }) => (
  <div className="flex items-start justify-between mb-6">
    <div>
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
    </div>
    {children && <div className="flex items-center gap-2">{children}</div>}
  </div>
);

// ── Loading Skeletons for Overview
const OverviewSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent>
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2"><Skeleton className="h-72 w-full rounded-xl" /></div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
    <Skeleton className="h-64 w-full rounded-xl" />
  </div>
);

// ── Pagination
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30">
      <div className="flex-1 flex justify-between sm:hidden">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onPageChange(currentPage - 1)} 
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onPageChange(currentPage + 1)} 
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-slate-500">
            Showing page <span className="font-semibold text-slate-900">{currentPage}</span> of <span className="font-semibold text-slate-900">{totalPages}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onPageChange(currentPage - 1)} 
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </Button>
          
          {/* Simple page indicators */}
          <div className="flex items-center gap-1 mx-2">
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              // Show pages around current page if total > 5
              let pageNum = i + 1;
              if (totalPages > 5) {
                if (currentPage > 3) pageNum = currentPage - 2 + i;
                if (pageNum > totalPages) pageNum = totalPages - 4 + i;
                if (pageNum < 1) pageNum = i + 1;
              }
              
              if (pageNum > totalPages) return null;

              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                    currentPage === pageNum 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onPageChange(currentPage + 1)} 
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </Button>
        </div>
      </div>
    </div>
  );
};
