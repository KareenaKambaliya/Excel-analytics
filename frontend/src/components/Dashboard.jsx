import { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Hash, TrendingUp, PieChartIcon, BarChart3, TableIcon } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { ChartCard } from './ChartCard';
import { FilterBar } from './FilterBar';
import { SheetSelector } from './SheetSelector';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  filterByDateRange,
  filterByAttributes,
  calculateMetrics,
  prepareChartData,
  prepareTimeSeriesData,
} from '../utils/excelParser';

const CHART_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EC4899', '#0EA5E9', '#8B5CF6', '#EF4444', '#14B8A6'];

export const Dashboard = ({ parsedData }) => {
  const [activeSheet, setActiveSheet] = useState('');
  const [dateColumn, setDateColumn] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [attributeFilters, setAttributeFilters] = useState({});
  const [categoryColumn, setCategoryColumn] = useState(null);
  const [valueColumn, setValueColumn] = useState(null);

  // Initialize active sheet
  useEffect(() => {
    if (parsedData?.sheetNames?.length > 0 && !activeSheet) {
      setActiveSheet(parsedData.sheetNames[0]);
    }
  }, [parsedData, activeSheet]);

  // Get current sheet data
  const sheetData = useMemo(() => {
    if (!parsedData?.sheets || !activeSheet) return null;
    return parsedData.sheets[activeSheet];
  }, [parsedData, activeSheet]);

  // Auto-detect columns on sheet change
  useEffect(() => {
    if (!sheetData?.columns) return;
    
    const dateCol = sheetData.columns.find(c => c.type === 'date' && !c.isEmpty);
    const catCol = sheetData.columns.find(c => c.type === 'category' && !c.isEmpty);
    const numCol = sheetData.columns.find(c => c.type === 'numeric' && !c.isEmpty);
    
    setDateColumn(dateCol?.name || null);
    setCategoryColumn(catCol?.name || null);
    setValueColumn(numCol?.name || null);
    setAttributeFilters({});
    setStartDate(null);
    setEndDate(null);
  }, [sheetData]);

  // Filter data based on selections
  const filteredData = useMemo(() => {
    if (!sheetData?.data) return [];
    
    let data = [...sheetData.data];
    
    if (dateColumn && startDate && endDate) {
      data = filterByDateRange(data, dateColumn, startDate, endDate);
    }
    
    data = filterByAttributes(data, attributeFilters);
    
    return data;
  }, [sheetData, dateColumn, startDate, endDate, attributeFilters]);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!sheetData?.columns) return [];
    return calculateMetrics(filteredData, sheetData.columns);
  }, [filteredData, sheetData]);

  // Prepare chart data
  const barChartData = useMemo(() => {
    if (!categoryColumn) return [];
    return prepareChartData(filteredData, categoryColumn, valueColumn, 'sum').slice(0, 10);
  }, [filteredData, categoryColumn, valueColumn]);

  const pieChartData = useMemo(() => {
    if (!categoryColumn) return [];
    return prepareChartData(filteredData, categoryColumn, valueColumn, 'sum').slice(0, 6);
  }, [filteredData, categoryColumn, valueColumn]);

  const lineChartData = useMemo(() => {
    if (!dateColumn) return [];
    return prepareTimeSeriesData(filteredData, dateColumn, valueColumn);
  }, [filteredData, dateColumn, valueColumn]);

  // Get selectable columns - filter out empty columns
  const numericColumns = sheetData?.columns?.filter(c => c.type === 'numeric' && !c.isEmpty) || [];
  const categoryColumns = sheetData?.columns?.filter(c => c.type === 'category' && !c.isEmpty) || [];
  const allCategoryColumns = sheetData?.columns?.filter(c => (c.type === 'category' || c.type === 'text') && !c.isEmpty) || [];

  const handleDateRangeChange = (start, end) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleAttributeFilterChange = (column, values) => {
    setAttributeFilters(prev => ({
      ...prev,
      [column]: values
    }));
  };

  const handleClearFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setDateColumn(null);
    setAttributeFilters({});
  };

  if (!sheetData) {
    return (
      <div data-testid="dashboard-loading" className="flex items-center justify-center h-64">
        <p className="text-zinc-500">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div data-testid="dashboard" className="min-h-screen bg-zinc-50/50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-xl">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-xl font-bold text-zinc-900">
              {parsedData.fileName}
            </h1>
            <p className="text-sm text-zinc-500">
              {filteredData.length} of {sheetData.totalRows} records
            </p>
          </div>
          <SheetSelector
            sheets={parsedData.sheetNames}
            activeSheet={activeSheet}
            onSheetChange={setActiveSheet}
          />
        </div>
      </header>

      {/* Filter Bar */}
      <FilterBar
        columns={sheetData.columns}
        dateColumn={dateColumn}
        onDateColumnChange={setDateColumn}
        startDate={startDate}
        endDate={endDate}
        onDateRangeChange={handleDateRangeChange}
        attributeFilters={attributeFilters}
        onAttributeFilterChange={handleAttributeFilterChange}
        onClearFilters={handleClearFilters}
      />

      {/* Dashboard Content */}
      <main className="p-6 md:p-8 lg:p-12 space-y-8">
        {/* Metric Cards */}
        <section data-testid="metrics-section">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {metrics.map((metric, idx) => (
              <MetricCard
                key={idx}
                label={metric.label}
                value={metric.value}
                format={metric.format}
                icon={idx === 0 ? Hash : TrendingUp}
              />
            ))}
          </div>
        </section>

        {/* Chart Controls */}
        <section className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">Category:</span>
            <Select value={categoryColumn || 'none'} onValueChange={(val) => setCategoryColumn(val === 'none' ? null : val)}>
              <SelectTrigger data-testid="category-select" className="w-[180px] bg-white">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select column</SelectItem>
                {allCategoryColumns.map(col => (
                  <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">Value:</span>
            <Select value={valueColumn || 'count'} onValueChange={(val) => setValueColumn(val === 'count' ? null : val)}>
              <SelectTrigger data-testid="value-select" className="w-[180px] bg-white">
                <SelectValue placeholder="Count records" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="count">Count (records)</SelectItem>
                {numericColumns.map(col => (
                  <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* Data Quality Notice */}
        {(!sheetData.columns.some(c => c.type === 'date' && !c.isEmpty) || 
          !sheetData.columns.some(c => c.type === 'numeric' && !c.isEmpty)) && (
          <section className="mb-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              <strong>Data Notice:</strong> 
              {!sheetData.columns.some(c => c.type === 'date' && !c.isEmpty) && 
                " No date columns with data found - time series chart unavailable."}
              {!sheetData.columns.some(c => c.type === 'numeric' && !c.isEmpty) && 
                " No numeric columns found - using record counts for visualizations."}
            </div>
          </section>
        )}

        {/* Charts Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          {barChartData.length > 0 && (
            <ChartCard
              title="Distribution by Category"
              subtitle={`${categoryColumn} breakdown`}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis type="number" tick={{ fontSize: 12, fontFamily: 'JetBrains Mono' }} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ fontSize: 12, fontFamily: 'Inter' }}
                    width={100}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e4e4e7',
                      borderRadius: '8px',
                      fontFamily: 'Inter'
                    }} 
                  />
                  <Bar dataKey="value" fill="#4F46E5" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Pie Chart */}
          {pieChartData.length > 0 && (
            <ChartCard
              title="Proportion Analysis"
              subtitle={`${categoryColumn} share`}
            >
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e4e4e7',
                      borderRadius: '8px',
                      fontFamily: 'Inter'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Line Chart - Full Width */}
          {lineChartData.length > 0 && (
            <ChartCard
              title="Trend Over Time"
              subtitle={dateColumn ? `Based on ${dateColumn}` : 'Time series'}
              className="lg:col-span-2"
            >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12, fontFamily: 'JetBrains Mono' }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 12, fontFamily: 'JetBrains Mono' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e4e4e7',
                      borderRadius: '8px',
                      fontFamily: 'Inter'
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#4F46E5" 
                    strokeWidth={2}
                    dot={{ fill: '#4F46E5', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </section>

        {/* Data Preview */}
        <section>
          <ChartCard title="Data Preview" subtitle={`Showing first 10 rows`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200">
                    {sheetData.headers.slice(0, 8).map((header, idx) => (
                      <th 
                        key={idx} 
                        className="text-left py-3 px-4 font-medium text-zinc-600 bg-zinc-50"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.slice(0, 10).map((row, rowIdx) => (
                    <tr 
                      key={rowIdx} 
                      className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
                    >
                      {sheetData.headers.slice(0, 8).map((header, cellIdx) => (
                        <td 
                          key={cellIdx} 
                          className="py-3 px-4 text-zinc-700 font-mono text-xs"
                        >
                          {row[header] !== null && row[header] !== undefined 
                            ? String(row[header]).slice(0, 30) 
                            : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </section>
      </main>
    </div>
  );
};
