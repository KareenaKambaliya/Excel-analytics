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
 * Comprehensive date format patterns
 * Supports: ISO, US, European, Asian, and various common formats
 */
const DATE_PATTERNS = [
  // ISO formats
  /^\d{4}-\d{2}-\d{2}$/,                          // 2024-01-15
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,         // 2024-01-15T10:30:00
  /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/,         // 2024-01-15 10:30:00
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,               // 2024-01-15T10:30
  
  // US formats (MM/DD/YYYY, MM-DD-YYYY)
  /^\d{1,2}\/\d{1,2}\/\d{4}$/,                    // 1/15/2024 or 01/15/2024
  /^\d{1,2}\/\d{1,2}\/\d{2}$/,                    // 1/15/24 or 01/15/24
  /^\d{1,2}-\d{1,2}-\d{4}$/,                      // 1-15-2024 or 01-15-2024
  /^\d{1,2}-\d{1,2}-\d{2}$/,                      // 1-15-24 or 01-15-24
  
  // European formats (DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY)
  /^\d{2}\/\d{2}\/\d{4}$/,                        // 15/01/2024
  /^\d{2}-\d{2}-\d{4}$/,                          // 15-01-2024
  /^\d{2}\.\d{2}\.\d{4}$/,                        // 15.01.2024
  /^\d{2}\.\d{2}\.\d{2}$/,                        // 15.01.24
  
  // Asian formats (YYYY/MM/DD, YYYY.MM.DD)
  /^\d{4}\/\d{2}\/\d{2}$/,                        // 2024/01/15
  /^\d{4}\.\d{2}\.\d{2}$/,                        // 2024.01.15
  
  // Text month formats
  /^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}$/i,  // 15 Jan 2024, 15 January 2024
  /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}$/i, // Jan 15, 2024 or January 15 2024
  /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}$/i,           // Jan 15 (year implied)
  /^\d{1,2}-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{2,4}$/i,           // 15-Jan-2024 or 15-Jan-24
  
  // Excel serial date (5-digit number representing days since 1900)
  /^4\d{4}$/,                                     // Excel dates around 2010-2030
  /^3\d{4}$/,                                     // Excel dates around 1982-2009
  
  // Timestamp formats
  /^\d{10}$/,                                     // Unix timestamp (seconds)
  /^\d{13}$/,                                     // Unix timestamp (milliseconds)
  
  // With time
  /^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}/,    // 01/15/2024 10:30
  /^\d{1,2}-\d{1,2}-\d{4}\s+\d{1,2}:\d{2}/,      // 01-15-2024 10:30
];

/**
 * Check if a value is a date
 * @param {*} value - Value to check
 * @returns {boolean}
 */
const isDateValue = (value) => {
  if (value === null || value === undefined || value === '') return false;
  
  const str = String(value).trim();
  
  // Check against patterns
  if (DATE_PATTERNS.some(p => p.test(str))) return true;
  
  // Check Excel serial date (number between reasonable date range)
  const num = parseFloat(str);
  if (!isNaN(num) && num > 1 && num < 2958465) { // 1900 to 9999
    // Only consider 5-digit numbers as potential Excel dates
    if (/^\d{5}$/.test(str)) return true;
  }
  
  // Try native Date parsing as fallback (but be strict)
  if (str.length >= 6 && str.length <= 30) {
    const parsed = Date.parse(str);
    if (!isNaN(parsed)) {
      const date = new Date(parsed);
      // Verify it's a reasonable date (1900-2100)
      const year = date.getFullYear();
      if (year >= 1900 && year <= 2100) return true;
    }
  }
  
  return false;
};

/**
 * Parse a date value to JavaScript Date object
 * @param {*} value - Value to parse
 * @returns {Date|null}
 */
const parseDate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  
  // If already a Date object
  if (value instanceof Date) return value;
  
  const str = String(value).trim();
  
  // Excel serial date (days since 1900-01-01, with Excel's leap year bug)
  if (/^\d{5}$/.test(str)) {
    const num = parseFloat(str);
    if (num > 1 && num < 2958465) {
      // Excel incorrectly considers 1900 a leap year, so subtract 1 for dates after Feb 28, 1900
      const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
      const date = new Date(excelEpoch.getTime() + num * 24 * 60 * 60 * 1000);
      return date;
    }
  }
  
  // Unix timestamp (seconds)
  if (/^\d{10}$/.test(str)) {
    return new Date(parseInt(str) * 1000);
  }
  
  // Unix timestamp (milliseconds)
  if (/^\d{13}$/.test(str)) {
    return new Date(parseInt(str));
  }
  
  // Handle DD/MM/YYYY vs MM/DD/YYYY ambiguity
  // If first number > 12, it's likely DD/MM/YYYY (European)
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const [, first, second, year] = slashMatch;
    const fullYear = year.length === 2 ? (parseInt(year) > 50 ? 1900 + parseInt(year) : 2000 + parseInt(year)) : parseInt(year);
    
    if (parseInt(first) > 12) {
      // DD/MM/YYYY format
      return new Date(fullYear, parseInt(second) - 1, parseInt(first));
    } else if (parseInt(second) > 12) {
      // MM/DD/YYYY format
      return new Date(fullYear, parseInt(first) - 1, parseInt(second));
    }
    // Ambiguous - default to MM/DD/YYYY (US format)
    return new Date(fullYear, parseInt(first) - 1, parseInt(second));
  }
  
  // Handle DD-MM-YYYY format
  const dashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (dashMatch) {
    const [, first, second, year] = dashMatch;
    const fullYear = year.length === 2 ? (parseInt(year) > 50 ? 1900 + parseInt(year) : 2000 + parseInt(year)) : parseInt(year);
    
    if (parseInt(first) > 12) {
      return new Date(fullYear, parseInt(second) - 1, parseInt(first));
    }
    return new Date(fullYear, parseInt(first) - 1, parseInt(second));
  }
  
  // Handle DD.MM.YYYY format (common in Europe)
  const dotMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (dotMatch) {
    const [, day, month, year] = dotMatch;
    const fullYear = year.length === 2 ? (parseInt(year) > 50 ? 1900 + parseInt(year) : 2000 + parseInt(year)) : parseInt(year);
    return new Date(fullYear, parseInt(month) - 1, parseInt(day));
  }
  
  // Try native Date parsing
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    return new Date(parsed);
  }
  
  return null;
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
  const dateKeywords = ['date', 'time', 'at', 'submitted', 'created', 'updated', 'timestamp', 'dob', 'birth', 'joined', 'start', 'end', 'due', 'expir'];
  const isDateHeader = dateKeywords.some(kw => headerLower.includes(kw));
  
  // Check for numeric
  const numericCount = sample.filter(v => {
    const num = parseFloat(String(v).replace(/[,$%]/g, ''));
    return !isNaN(num) && isFinite(num);
  }).length;
  
  if (numericCount / sampleSize > 0.8) return 'numeric';
  
  // Check for date with comprehensive pattern matching
  const dateCount = sample.filter(v => isDateValue(v)).length;
  
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
  
  // Normalize start and end dates to beginning/end of day
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  return data.filter(row => {
    const dateValue = row[dateColumn];
    if (!dateValue) return false;
    
    const date = parseDate(dateValue);
    if (!date || isNaN(date.getTime())) return false;
    
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
    
    const date = parseDate(dateValue);
    if (!date || isNaN(date.getTime())) return;
    
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
