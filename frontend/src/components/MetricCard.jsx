import { formatNumber } from '../utils/excelParser';
import { cn } from '../lib/utils';

export const MetricCard = ({ label, value, format = 'number', icon: Icon, trend, className }) => {
  const formattedValue = formatNumber(value, format);
  
  return (
    <div 
      data-testid={`metric-card-${label.toLowerCase().replace(/\s+/g, '-')}`}
      className={cn(
        "bg-white p-6 border border-zinc-200 shadow-sm rounded-lg flex flex-col justify-between h-full transition-all duration-200 hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-sm font-medium text-zinc-500 font-body">
          {label}
        </span>
        {Icon && (
          <div className="p-2 bg-zinc-50 rounded-lg">
            <Icon className="w-4 h-4 text-zinc-600" />
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <p className="text-3xl font-bold font-mono tracking-tighter text-zinc-900 metric-value">
          {formattedValue}
        </p>
        
        {trend !== undefined && trend !== null && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium",
            trend >= 0 ? "text-emerald-600" : "text-red-600"
          )}>
            <span>{trend >= 0 ? '↑' : '↓'}</span>
            <span>{Math.abs(trend).toFixed(1)}%</span>
            <span className="text-zinc-400 font-normal">vs previous</span>
          </div>
        )}
      </div>
    </div>
  );
};
