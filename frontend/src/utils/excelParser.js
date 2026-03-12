import * as XLSX from 'xlsx';

/**
 * Parse Excel file and return structured data
 * @param {File} file - The Excel file to parse
 * @returns {Promise<Object>} - Parsed data with sheets and metadata
 */
export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        const result = {
          fileName: file.name,
          sheets: {},
          sheetNames: workbook.SheetNames,
          metadata: {
            totalSheets: workbook.SheetNames.length,
            uploadedAt: new Date().toISOString(),
          }
        };
        
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, 
            raw: false,
            dateNF: 'yyyy-mm-dd'
          });
          
          if (jsonData.length > 0) {
            const headers = jsonData[0].map(h => String(h || '').trim());
            const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''));
            
            result.sheets[sheetName] = {
              headers,
              rows,
              data: rows.map(row => {
                const obj = {};
                headers.forEach((header, idx) => {
                  obj[header] = row[idx] !== undefined ? row[idx] : null;
                });
                return obj;
              }),
              totalRows: rows.length,
              columns: analyzeColumns(headers, rows)
            };
          }
        });
        
        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Analyze columns to determine their types
 * @param {Array} headers - Column headers
 * @param {Array} rows - Data rows
 * @returns {Array} - Column metadata
 */
const analyzeColumns = (headers, rows) => {
  return headers.map((header, idx) => {
    const values = rows.map(row => row[idx]).filter(v => v !== undefined && v !== null && v !== '');
    
    // Skip columns that are entirely empty
    if (values.length === 0) {
      return {
        name: header,
        type: 'empty',
        uniqueValues: null,
        hasNulls: true,
        sampleValues: [],
        isEmpty: true
      };
    }
    
    const columnType = detectColumnType(values, header);
    
    return {
      name: header,
      type: columnType,
      uniqueValues: columnType === 'category' ? [...new Set(values)] : null,
      hasNulls: values.length < rows.length,
      sampleValues: values.slice(0, 5)
    };
  });
};

/**
 * Detect the type of a column based on its values
 * @param {Array} values - Column values
 * @param {string} header - Column header name (for hints)
 * @returns {string} - Column type: 'numeric', 'date', 'category', 'text'
 */
const detectColumnType = (values, header = '') => {
  if (values.length === 0) return 'empty';
  
  const sampleSize = Math.min(values.length, 100);
  const sample = values.slice(0, sampleSize);
  const headerLower = header.toLowerCase();
  
  // Check header hints for dates
  const dateKeywords = ['date', 'time', 'at', 'submitted', 'created', 'updated', 'timestamp'];
  const isDateHeader = dateKeywords.some(kw => headerLower.includes(kw));
  
  // Check for numeric
  const numericCount = sample.filter(v => {
    const num = parseFloat(String(v).replace(/[,$%]/g, ''));
    return !isNaN(num) && isFinite(num);
  }).length;
  
  if (numericCount / sampleSize > 0.8) return 'numeric';
  
  // Check for date
  const dateCount = sample.filter(v => {
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/,
      /^\d{2}\/\d{2}\/\d{4}$/,
      /^\d{2}-\d{2}-\d{4}$/,
      /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
      /^\d{4}-\d{2}-\d{2}T/  // ISO format
    ];
    const str = String(v);
    return datePatterns.some(p => p.test(str)) || (!isNaN(Date.parse(str)) && str.length > 6);
  }).length;
  
  if (dateCount / sampleSize > 0.5 || (isDateHeader && dateCount > 0)) return 'date';
  
  // Check for category (limited unique values OR text with reasonable diversity)
  const uniqueValues = new Set(values);
  const uniqueRatio = uniqueValues.size / values.length;
  
  // Consider as category if:
  // 1. Less than 50 unique values AND less than 50% unique ratio
  // 2. OR if it looks like a status/type/name field
  const categoryKeywords = ['status', 'type', 'name', 'code', 'category', 'region', 'state', 'district', 'block'];
  const isCategoryHeader = categoryKeywords.some(kw => headerLower.includes(kw));
  
  if ((uniqueValues.size <= 50 && uniqueRatio < 0.5) || 
      (isCategoryHeader && uniqueValues.size <= 100)) {
    return 'category';
  }
  
  return 'text';
};

/**
 * Filter data by date range
 * @param {Array} data - Data array
 * @param {string} dateColumn - Name of date column
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} - Filtered data
 */
export const filterByDateRange = (data, dateColumn, startDate, endDate) => {
  if (!dateColumn || !startDate || !endDate) return data;
  
  return data.filter(row => {
    const dateValue = row[dateColumn];
    if (!dateValue) return false;
    
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return false;
    
    return date >= startDate && date <= endDate;
  });
};

/**
 * Filter data by attribute values
 * @param {Array} data - Data array
 * @param {Object} filters - Filter object { columnName: [selectedValues] }
 * @returns {Array} - Filtered data
 */
export const filterByAttributes = (data, filters) => {
  if (!filters || Object.keys(filters).length === 0) return data;
  
  return data.filter(row => {
    return Object.entries(filters).every(([column, selectedValues]) => {
      if (!selectedValues || selectedValues.length === 0) return true;
      return selectedValues.includes(row[column]);
    });
  });
};

/**
 * Calculate summary metrics from data
 * @param {Array} data - Data array
 * @param {Array} columns - Column metadata
 * @returns {Array} - Summary metrics
 */
export const calculateMetrics = (data, columns) => {
  const metrics = [];
  
  // Total records
  metrics.push({
    label: 'Total Records',
    value: data.length,
    format: 'number'
  });
  
  // Calculate numeric column summaries (if available)
  const numericColumns = columns.filter(c => c.type === 'numeric' && !c.isEmpty).slice(0, 2);
  
  numericColumns.forEach(col => {
    const values = data
      .map(row => parseFloat(String(row[col.name] || '0').replace(/[,$%]/g, '')))
      .filter(v => !isNaN(v) && isFinite(v));
    
    if (values.length > 0) {
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      
      metrics.push({
        label: `Total ${col.name}`,
        value: sum,
        format: sum > 1000000 ? 'compact' : 'number'
      });
      
      metrics.push({
        label: `Avg ${col.name}`,
        value: avg,
        format: 'decimal'
      });
    }
  });
  
  // If no numeric columns, show category distributions
  if (numericColumns.length === 0) {
    const categoryColumns = columns.filter(c => c.type === 'category' && !c.isEmpty).slice(0, 3);
    
    categoryColumns.forEach(col => {
      const uniqueValues = new Set(data.map(row => row[col.name]).filter(v => v !== null && v !== undefined));
      metrics.push({
        label: `Unique ${col.name}`,
        value: uniqueValues.size,
        format: 'number'
      });
    });
  }
  
  // Fill remaining slots with category counts if needed
  if (metrics.length < 4) {
    const categoryColumns = columns.filter(c => c.type === 'category' && !c.isEmpty);
    categoryColumns.slice(0, 4 - metrics.length).forEach(col => {
      if (!metrics.some(m => m.label.includes(col.name))) {
        const uniqueValues = new Set(data.map(row => row[col.name]).filter(v => v !== null && v !== undefined));
        metrics.push({
          label: `Unique ${col.name}`,
          value: uniqueValues.size,
          format: 'number'
        });
      }
    });
  }
  
  return metrics.slice(0, 6);
};

/**
 * Prepare data for charts
 * @param {Array} data - Data array
 * @param {string} categoryColumn - Column for categories/x-axis
 * @param {string} valueColumn - Column for values/y-axis
 * @param {string} aggregation - Aggregation type: 'sum', 'count', 'avg'
 * @returns {Array} - Chart-ready data
 */
export const prepareChartData = (data, categoryColumn, valueColumn, aggregation = 'sum') => {
  if (!categoryColumn || !data.length) return [];
  
  const grouped = {};
  
  data.forEach(row => {
    const category = row[categoryColumn] || 'Unknown';
    if (!grouped[category]) {
      grouped[category] = { values: [], count: 0 };
    }
    
    if (valueColumn) {
      const value = parseFloat(String(row[valueColumn] || '0').replace(/[,$%]/g, ''));
      if (!isNaN(value) && isFinite(value)) {
        grouped[category].values.push(value);
      }
    }
    grouped[category].count++;
  });
  
  return Object.entries(grouped).map(([name, { values, count }]) => {
    let value;
    switch (aggregation) {
      case 'sum':
        value = values.reduce((a, b) => a + b, 0);
        break;
      case 'avg':
        value = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        break;
      case 'count':
      default:
        value = count;
    }
    
    return { name, value: Math.round(value * 100) / 100 };
  }).sort((a, b) => b.value - a.value);
};

/**
 * Prepare time series data for line charts
 * @param {Array} data - Data array
 * @param {string} dateColumn - Date column name
 * @param {string} valueColumn - Value column name
 * @param {string} groupBy - Optional grouping column
 * @returns {Array} - Time series data
 */
export const prepareTimeSeriesData = (data, dateColumn, valueColumn, groupBy = null) => {
  if (!dateColumn || !data.length) return [];
  
  const timeData = {};
  
  data.forEach(row => {
    const dateValue = row[dateColumn];
    if (!dateValue) return;
    
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return;
    
    const dateKey = date.toISOString().split('T')[0];
    
    if (!timeData[dateKey]) {
      timeData[dateKey] = { date: dateKey };
    }
    
    const value = valueColumn 
      ? parseFloat(String(row[valueColumn] || '0').replace(/[,$%]/g, ''))
      : 1;
    
    if (!isNaN(value) && isFinite(value)) {
      if (groupBy && row[groupBy]) {
        const group = row[groupBy];
        timeData[dateKey][group] = (timeData[dateKey][group] || 0) + value;
      } else {
        timeData[dateKey].value = (timeData[dateKey].value || 0) + value;
      }
    }
  });
  
  return Object.values(timeData).sort((a, b) => new Date(a.date) - new Date(b.date));
};

/**
 * Format number for display
 * @param {number} value - The number to format
 * @param {string} format - Format type
 * @returns {string} - Formatted string
 */
export const formatNumber = (value, format = 'number') => {
  if (value === null || value === undefined || isNaN(value)) return '—';
  
  switch (format) {
    case 'compact':
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
      return value.toLocaleString();
    case 'decimal':
      return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case 'percent':
      return `${(value * 100).toFixed(1)}%`;
    case 'number':
    default:
      return value.toLocaleString();
  }
};
