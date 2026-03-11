import { cn } from '../lib/utils';

export const ChartCard = ({ title, subtitle, children, className, action }) => {
  return (
    <div 
      data-testid={`chart-card-${title?.toLowerCase().replace(/\s+/g, '-') || 'chart'}`}
      className={cn(
        "bg-white p-6 border border-zinc-200 shadow-sm rounded-lg chart-card",
        className
      )}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="font-heading text-lg font-semibold text-zinc-900">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-zinc-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        {action && (
          <div>{action}</div>
        )}
      </div>
      
      <div className="w-full">
        {children}
      </div>
    </div>
  );
};
