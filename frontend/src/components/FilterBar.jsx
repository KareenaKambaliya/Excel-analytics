import { useState } from 'react';
import { Calendar as CalendarIcon, Filter, X, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { cn } from '../lib/utils';

export const FilterBar = ({
  columns = [],
  dateColumn,
  onDateColumnChange,
  startDate,
  endDate,
  onDateRangeChange,
  attributeFilters = {},
  onAttributeFilterChange,
  onClearFilters
}) => {
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const dateColumns = columns.filter(c => c.type === 'date');
  const categoryColumns = columns.filter(c => c.type === 'category');
  
  const hasActiveFilters = dateColumn || startDate || endDate || 
    Object.values(attributeFilters).some(v => v && v.length > 0);

  return (
    <div 
      data-testid="filter-bar"
      className="filter-bar flex flex-wrap gap-4 items-center bg-white p-4 border-b border-zinc-200 sticky top-0 z-40"
    >
      <div className="flex items-center gap-2 text-zinc-500">
        <Filter className="w-4 h-4" />
        <span className="text-sm font-medium">Filters</span>
      </div>

      {/* Date Column Selector */}
      {dateColumns.length > 0 && (
        <Select 
          value={dateColumn || 'none'} 
          onValueChange={(val) => onDateColumnChange(val === 'none' ? null : val)}
        >
          <SelectTrigger 
            data-testid="date-column-select"
            className="w-[160px] bg-white"
          >
            <SelectValue placeholder="Date column" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Select date column</SelectItem>
            {dateColumns.map(col => (
              <SelectItem key={col.name} value={col.name}>
                {col.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Date Range Pickers */}
      {dateColumn && (
        <>
          <Popover open={startOpen} onOpenChange={setStartOpen}>
            <PopoverTrigger asChild>
              <Button
                data-testid="start-date-picker"
                variant="outline"
                className={cn(
                  "w-[160px] justify-start text-left font-normal",
                  !startDate && "text-zinc-500"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "MMM dd, yyyy") : "Start date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[100]" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => {
                  onDateRangeChange(date, endDate);
                  setStartOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <span className="text-zinc-400">to</span>

          <Popover open={endOpen} onOpenChange={setEndOpen}>
            <PopoverTrigger asChild>
              <Button
                data-testid="end-date-picker"
                variant="outline"
                className={cn(
                  "w-[160px] justify-start text-left font-normal",
                  !endDate && "text-zinc-500"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "MMM dd, yyyy") : "End date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[100]" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(date) => {
                  onDateRangeChange(startDate, date);
                  setEndOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </>
      )}

      {/* Attribute Filters */}
      {categoryColumns.slice(0, 3).map(col => (
        <Select
          key={col.name}
          value={attributeFilters[col.name]?.[0] || 'all'}
          onValueChange={(value) => {
            onAttributeFilterChange(col.name, value === 'all' ? [] : [value]);
          }}
        >
          <SelectTrigger 
            data-testid={`filter-${col.name.toLowerCase().replace(/\s+/g, '-')}`}
            className="w-[160px] bg-white"
          >
            <SelectValue placeholder={col.name} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All {col.name}</SelectItem>
            {col.uniqueValues?.slice(0, 20).map(val => (
              <SelectItem key={val} value={val}>
                {val}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          data-testid="clear-filters-btn"
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-zinc-500 hover:text-zinc-700"
        >
          <X className="w-4 h-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
};
