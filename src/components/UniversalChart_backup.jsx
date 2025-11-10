import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter, ComposedChart } from 'recharts';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { Upload, Plus, Edit, Trash2, Download, FileText, Map as MapIcon, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { createCSVService, csvConfigurations } from '../services/csvDataService';
import * as d3 from 'd3';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#d084d0', '#ffb347'];

// Safe formatter for YAxis to prevent infinity errors
const safeYAxisFormatter = (value) => {
  if (!isFinite(value) || isNaN(value)) return '0';
  return `${(value / 1000).toFixed(0)}K`;
};

const UniversalChart = ({ datasetType, initialData = null }) => {
  const [csvService] = useState(() => createCSVService(datasetType));
  const [data, setData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [simpleForm, setSimpleForm] = useState({
    category: '',
    year: '',
    count: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [hoveredProvince, setHoveredProvince] = useState(null);
  const [tooltipData, setTooltipData] = useState(null);

  const config = csvConfigurations[datasetType];

  // Safety check
  if (!config) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Error: Invalid dataset type "{datasetType}"</p>
      </div>
    );
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        // First, load data from Firebase
        const firebaseData = await csvService.loadFromFirebase();
        console.log('🔥 Firebase data loaded:', { 
          datasetType, 
          firebaseLength: firebaseData?.length || 0, 
          sample: firebaseData?.slice(0, 3),
          allData: firebaseData
        });
        
        if (firebaseData && firebaseData.length > 0) {
          // Ensure csvService.data is updated
          csvService.data = firebaseData;
          setData(firebaseData);
          console.log('✅ Data set from Firebase:', firebaseData.length, 'records');
        } else if (Array.isArray(initialData) && initialData.length > 0) {
          // Only apply initialData when Firebase is empty and initialData is provided
          console.log('🆕 Using initial data:', { datasetType, initialLength: initialData.length, sample: initialData.slice(0, 2) });
          csvService.data = initialData;
          setData(initialData);
          // Save initialData to Firebase for future use
          await csvService.saveToFirebase();
        } else {
          console.log('❌ No data available for:', datasetType);
        }
      } catch (error) {
        console.error('💥 Error loading data:', error);
        // Fallback to initialData if Firebase fails
        if (Array.isArray(initialData) && initialData.length > 0) {
          csvService.data = initialData;
          setData(initialData);
        }
      }
    };

    loadData();
  }, [initialData, csvService]);

  // Handle CSV file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const processedData = await csvService.parseCSV(file);
        setData(processedData);
        // Save the uploaded CSV data to Firebase
        await csvService.saveToFirebase();
        console.log('CSV data uploaded and saved to Firebase');
      } catch (error) {
        console.error('Error parsing CSV:', error);
        alert('Error parsing CSV file. Please check the format.');
      }
    }
  };

  // Export data to CSV
  const exportToCSV = () => {
    csvService.exportToCSV();
  };

  // Simplified CRUD operations
  const addSimpleRecord = async () => {
    if (!simpleForm.category || !simpleForm.year || !simpleForm.count) {
      alert('Please fill in all fields');
      return;
    }

    try {
      console.log('Adding record:', simpleForm);
      const updatedData = await csvService.addRecordToFirebase(
        simpleForm.category, 
        simpleForm.year, 
        parseInt(simpleForm.count)
      );
      setData([...updatedData]);
      setSimpleForm({ category: '', year: '', count: '' });
    } catch (error) {
      console.error('Error adding record:', error);
      alert('Error adding record. Please try again.');
    }
  };

  const updateSimpleRecord = async () => {
    if (!editingRecord || !simpleForm.category || !simpleForm.year || !simpleForm.count) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const updatedData = await csvService.updateRecordInFirebase(
        simpleForm.category, 
        simpleForm.year, 
        parseInt(simpleForm.count)
      );
      setData([...updatedData]);
      setEditingRecord(null);
      setSimpleForm({ category: '', year: '', count: '' });
    } catch (error) {
      console.error('Error updating record:', error);
      alert('Error updating record. Please try again.');
    }
  };

  const deleteSimpleRecord = async (category, year) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      const updatedData = await csvService.deleteRecordFromFirebase(category, year);
      setData([...updatedData]);
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Error deleting record. Please try again.');
    }
  };

  // Pagination logic
  const getAllRecords = () => {
    try {
      const records = [];
      if (!data || !Array.isArray(data)) {
        console.log('getAllRecords: No data or not array', { data, hasData: !!data, isArray: Array.isArray(data) });
        return records;
      }

      console.log('getAllRecords: Processing data', { 
        dataLength: data.length, 
        availableYears: availableYears.length, 
        config: config?.keyField,
        sampleRow: data[0] // Add sample row to debug
      });

      data.forEach((row, rowIndex) => {
        if (!row || !config) return;
        
        // Debug: log the row structure for first few rows
        if (rowIndex < 2) {
          console.log(`Row ${rowIndex} structure:`, {
            keys: Object.keys(row),
            keyField: config.keyField,
            datasetType: datasetType
          });
        }
        
        // Handle YEAR-based datasets differently (Civil Status, Sex, Destination)
        if (config.keyField === 'YEAR') {
          const year = row.YEAR || row.year;
          if (year) {
            // For YEAR-based datasets, each category field (Single, Married, etc.) is a separate record
            config.yearFields.forEach(category => {
              const count = parseInt(row[category]) || 0;
              if (count > 0) {
                records.push({
                  id: `${rowIndex}-${category}`,
                  category: category,
                  year: year.toString(),
                  count: count,
                  rowIndex: rowIndex
                });
              }
            });
          }
          return; // Skip the category-based processing below
        }
        
        // Try multiple variations of the key field to handle case sensitivity
        const keyFieldVariations = [
          config.keyField,
          config.keyField.toLowerCase(),
          config.keyField.toUpperCase(),
          // For some datasets, try specific mappings
          datasetType === 'occupation' ? 'occupation' : null,
          datasetType === 'education' ? 'education_level' : null,
          datasetType === 'civilStatus' ? 'civil_status' : null,
          datasetType === 'destination' ? 'destination_country' : null,
          datasetType === 'sex' ? 'sex' : null,
          datasetType === 'region' ? 'region' : null,
          datasetType === 'relationship' ? 'relationship_type' : null
        ].filter(Boolean);
        
        let categoryValue = null;
        for (const keyVariation of keyFieldVariations) {
          if (row[keyVariation]) {
            categoryValue = row[keyVariation];
            break;
          }
        }
        
        if (!categoryValue) {
          if (rowIndex < 2) {
            console.log(`No category value found for row ${rowIndex}`, { 
              triedKeys: keyFieldVariations, 
              rowKeys: Object.keys(row),
              rowValues: row
            });
          }
          return;
        }

        // Only check years that exist in the row object (not all possible years)
        Object.keys(row).forEach((key) => {
          // Check if this key looks like a year (4 digits) and has a value > 0
          if (key.match(/^\d{4}$/) && row[key] != null) {
            const count = parseInt(row[key]) || 0;
            
            // Only include records with count > 0 to avoid showing empty data
            if (count > 0) {
              records.push({
                id: `${rowIndex}-${key}`,
                category: categoryValue,
                year: key.toString(),
                count: count,
                rowIndex: rowIndex
              });
            }
          }
        });
      });
      
      console.log('getAllRecords: Found records', records.length);
      return records;
    } catch (error) {
      console.error('Error getting records:', error);
      return [];
    }
  };

  // Get processed data for charts
  const getChartData = () => {
    try {
      if (!csvService || !data || data.length === 0) {
        console.log('getChartData: No data available', { csvService: !!csvService, dataLength: data.length });
        return [];
      }
      
      console.log('getChartData: Processing data', { 
        chartType: config.chartType, 
        keyField: config.keyField, 
        dataLength: data.length,
        sampleRow: data[0]
      });
      
      // Special handling for datasets where years are rows and categories are columns (Sex, Destination, etc.)
      if (config.keyField === 'YEAR' && config.yearFields && config.yearFields.length > 0) {
        console.log('getChartData: Processing YEAR-based dataset');
        switch (config.chartType) {
          case 'stackedBar':
          case 'composition':
            // For composition, we need to aggregate all years or use a specific year
            if (selectedYear) {
              // Find the row for the selected year
              const yearRow = data.find(row => row.year?.toString() === selectedYear.toString() || row.YEAR?.toString() === selectedYear.toString());
              if (yearRow) {
                return config.yearFields.map(field => ({
                  name: field,
                  value: parseInt(yearRow[field]) || 0
                })).filter(item => item.value > 0);
              }
            }
            // If no year selected, return data formatted for stacked chart
            return data.map(row => {
              const result = { year: row.year || row.YEAR };
              config.yearFields.forEach(field => {
                result[field] = parseInt(row[field]) || 0;
              });
              return result;
            });
            
          case 'sunburst':
          case 'treemap':
            console.log('getChartData: Processing YEAR-based sunburst data');
            // Create hierarchical data structure for sunburst chart
            // Hierarchy: Year → Civil Status → Count
            const sunburstData = {
              name: 'Civil Status',
              children: []
            };
            
            // Group data by year
            const yearGroups = {};
            data.forEach(row => {
              const year = row.YEAR || row.year;
              if (year) {
                if (!yearGroups[year]) {
                  yearGroups[year] = {
                    name: year.toString(),
                    children: [],
                    year: year
                  };
                }
                
                // Add civil status data for this year
                config.yearFields.forEach(status => {
                  const count = parseInt(row[status]) || 0;
                  if (count > 0) {
                    yearGroups[year].children.push({
                      name: status,
                      value: count,
                      year: year,
                      civilStatus: status,
                      count: count
                    });
                  }
                });
              }
            });
            
            // Convert to array and sort by year
            sunburstData.children = Object.values(yearGroups).sort((a, b) => a.year - b.year);
            
            console.log('YEAR-based Sunburst hierarchical data:', sunburstData);
            return sunburstData;
            
          case 'line':
          case 'stackedArea':
          case 'stackedAreaPercent':
          case 'trends':
            // For line and stacked area charts, show time series data
            return data.map(row => {
              const result = { year: row.year || row.YEAR };
              config.yearFields.forEach(field => {
                result[field] = parseInt(row[field]) || 0;
              });
              return result;
            });
            
          case 'comparison':
            // Similar to composition but different format
            if (selectedYear) {
              const yearRow = data.find(row => row.year?.toString() === selectedYear.toString() || row.YEAR?.toString() === selectedYear.toString());
              if (yearRow) {
                return config.yearFields.map(field => ({
                  category: field,
                  value: parseInt(yearRow[field]) || 0
                })).filter(item => item.value > 0);
              }
            }
            return [];
            
          default:
            return data;
        }
      } else {
        // For datasets where categories are rows and years are columns (Age, Education, etc.)
        console.log('getChartData: Processing category-based dataset');
        
        // Update csvService data to ensure it's in sync
        csvService.data = data;
        
        switch (config.chartType) {
          case 'distribution':
            console.log('getChartData: Getting distribution data');
            // For distribution, show aggregate data across all years unless a specific year is selected
            if (selectedYear) {
              console.log('getChartData: Getting distribution for specific year:', selectedYear);
              return csvService.getDataForComparison(selectedYear);
            } else {
              console.log('getChartData: Getting aggregate distribution across all years');
              // Aggregate across all years for distribution
              const aggregated = {};
              data.forEach(row => {
                const category = row[config.keyField.toLowerCase()] || row[config.keyField];
                if (category) {
                  if (!aggregated[category]) aggregated[category] = 0;
                  config.yearFields.forEach(year => {
                    const value = parseInt(row[year]) || 0;
                    aggregated[category] += value;
                  });
                }
              });
              
              const result = Object.entries(aggregated).map(([category, value]) => ({
                category,
                value
              })).filter(item => item.value > 0);
              
              console.log('Distribution aggregated result:', result);
              return result;
            }
          case 'bubble':
            console.log('getChartData: Getting bubble chart data');
            return csvService.getDataForTrends();
          case 'stackedAreaPercent':
            console.log('getChartData: Getting stacked area percent data');
            return csvService.getDataForTrends();
          case 'worldMap':
          case 'choropleth':
            console.log('getChartData: Getting geographic data');
            if (selectedYear) {
              return csvService.getDataForComparison(selectedYear);
            } else {
              // Aggregate across all years
              const aggregated = {};
              data.forEach(row => {
                const category = row[config.keyField.toLowerCase()] || row[config.keyField];
                if (category) {
                  if (!aggregated[category]) aggregated[category] = 0;
                  config.yearFields.forEach(year => {
                    const value = parseInt(row[year]) || 0;
                    aggregated[category] += value;
                  });
                }
              });
              return Object.entries(aggregated).map(([category, value]) => ({
                category,
                value
              })).filter(item => item.value > 0);
            }
          case 'stackedArea':
            console.log('getChartData: Getting stacked area data');
            return csvService.getDataForTrends();
          case 'stackedBar':
            console.log('getChartData: Getting stacked bar data');
            return csvService.getDataForTrends();
          case 'groupedBar':
            console.log('getChartData: Getting grouped bar data');
            // For grouped bar chart, we need to transform category-based data into grouped format
            // Structure: each region as a data point with years as separate properties
            const groupedData = data.map(row => {
              const region = row[config.keyField.toLowerCase()] || row[config.keyField];
              const result = { region: region };
              let totalCount = 0;
              
              // Add each year as a separate property
              config.yearFields.forEach(year => {
                const count = parseInt(row[year]) || 0;
                result[year] = count;
                totalCount += count;
              });
              
              result.total = totalCount;
              return result;
            }).filter(item => item.total > 0) // Only include regions with data
              .sort((a, b) => b.total - a.total); // Sort by total count descending
            
            console.log('getChartData: Grouped bar data processed:', groupedData.length, 'regions');
            return groupedData;
          case 'heatmap':
            console.log('getChartData: Getting heatmap data');
            // For heatmap, we want time series data showing all categories over time
            if (selectedYear) {
              console.log('getChartData: Getting heatmap for specific year:', selectedYear);
              return csvService.getDataForComparison(selectedYear);
            } else {
              console.log('getChartData: Getting heatmap time series for all years');
              return csvService.getDataForTrends();
            }
          case 'faceted':
            console.log('getChartData: Getting faceted chart data');
            // Faceted chart needs time series data to show year-occupation relationships
            return csvService.getDataForTrends();
          case 'network':
            console.log('getChartData: Getting network graph data');
            // Network graph needs time series data to show year-occupation relationships
            return csvService.getDataForTrends();
          case 'trends':
            console.log('getChartData: Getting trends data');
            return csvService.getDataForTrends();
          case 'comparison':
            console.log('getChartData: Getting comparison data for year:', selectedYear);
            return csvService.getDataForComparison(selectedYear);
          case 'composition':
            console.log('getChartData: Getting composition data for year:', selectedYear);
            return csvService.getDataForComposition(selectedYear);
          case 'geographic':
            console.log('getChartData: Getting geographic data');
            return csvService.getDataForComparison(selectedYear) || csvService.getDataForTrends();
          case 'relationships':
            console.log('getChartData: Getting relationships data');
            return csvService.getDataForTrends();
          default:
            console.log('getChartData: Unknown chart type:', config.chartType);
            return [];
        }
      }
    } catch (error) {
      console.error('Error getting chart data:', error);
      return [];
    }
  };

  // Define these variables BEFORE using them in getAllRecords
  const chartData = useMemo(() => getChartData(), [data, selectedYear, config.chartType]);
  
  // Compute province value map for choropleth chart (legacy - kept for compatibility)
  const provinceValueMap = useMemo(() => {
    if (config?.chartType !== 'choropleth' || !chartData || chartData.length === 0) {
      return new Map();
    }
    
    try {
      const map = new Map();
      chartData.forEach(item => {
        const provinceName = item.category; // Use category directly without mapping
        if (provinceName) {
          map.set(provinceName.toUpperCase(), item.value || 0);
        }
      });
      return map;
    } catch (error) {
      console.error('Error creating province value map:', error);
      return new Map();
    }
  }, [chartData, config?.chartType]);

  console.log('UniversalChart Debug:', {
    datasetType,
    dataLength: data.length,
    chartType: config.chartType,
    chartDataLength: Array.isArray(chartData) ? chartData.length : (chartData ? 'object' : 0),
    sampleData: data.slice(0, 2),
    sampleChartData: Array.isArray(chartData) ? chartData.slice(0, 2) : (chartData ? 'hierarchical object' : null)
  });
  
  const availableYears = (() => {
    if (config.keyField === 'YEAR' && data.length > 0) {
      // For datasets where YEAR is the key field, extract years from the data
      return data.map(row => row.year || row.YEAR).filter(year => year).sort();
    }
    return csvService ? csvService.getAvailableYears() : [];
  })();
  const fieldNames = csvService ? csvService.getFieldNames() : { keyField: '', displayName: '', yearFields: [] };

  const allRecords = getAllRecords();
  const totalRecords = allRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));
  
  // Get current page records
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = allRecords.slice(startIndex, endIndex);

  // Pagination handlers
  const goToPage = (page) => {
    const newPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(newPage);
  };

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () => setCurrentPage(Math.max(1, currentPage - 1));
  const goToNextPage = () => setCurrentPage(Math.min(totalPages, currentPage + 1));

  // Get title based on chart type and dataset
  const getTitle = () => {
    const baseTitle = `${config.displayName} Analysis`;
    const chartType = config.chartType;
    if (chartType === 'comparison' && selectedYear) {
      return `${baseTitle} - Comparison for ${selectedYear}`;
    } else if (chartType === 'composition' && selectedYear) {
      return `${baseTitle} - Composition for ${selectedYear}`;
    } else if (chartType === 'trends') {
      return `${baseTitle} - Trends Over Time`;
    } else if (chartType === 'distribution') {
      return `${baseTitle} - Distribution Analysis`;
    } else if (chartType === 'geographic') {
      return `${baseTitle} - Geographic Distribution`;
    } else if (chartType === 'relationships') {
      return `${baseTitle} - Relationship Analysis`;
    } else if (chartType === 'stackedAreaPercent') {
      return `${baseTitle} - Composition Over Time (%)`;
    } else if (chartType === 'choropleth') {
      return selectedYear 
        ? `${baseTitle} - Provincial Map for ${selectedYear}`
        : `${baseTitle} - Provincial Map (All Years)`;
    }
    return baseTitle;
  };

  const renderChart = () => {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="h-96 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <p className="text-lg mb-2">No data available</p>
            <p className="text-sm">Upload a CSV file or adjust filters</p>
          </div>
        </div>
      );
    }

    // Convert data to percentage for stackedAreaPercent
    let processedData = chartData;
    if (config.chartType === 'stackedAreaPercent') {
      processedData = chartData.map(yearData => {
        const total = Object.keys(yearData)
          .filter(key => key !== 'year')
          .reduce((sum, key) => sum + (yearData[key] || 0), 0);
        
        if (total === 0) return yearData;
        
        const percentData = { year: yearData.year };
        Object.keys(yearData)
          .filter(key => key !== 'year')
          .forEach(key => {
            percentData[key] = ((yearData[key] || 0) / total) * 100;
          });
        return percentData;
      });
    }

    switch (config.chartType) {
      case 'distribution':
        // 📊 Distribution - violin plot/density plot simulation for Age data
        if (selectedYear) {
          // Show distribution for specific year using area chart to simulate violin plot
          return (
            <ResponsiveContainer width="100%" height={500}>
              <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="category" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  fontSize={12}
                />
                <YAxis tickFormatter={safeYAxisFormatter} />
                <Tooltip 
                  formatter={(value) => [value.toLocaleString(), 'Emigrants']}
                  labelFormatter={(label) => `Age Group: ${label} (${selectedYear})`}
                />
                <Area 
                  type="monotone"
                  dataKey="value" 
                  fill="#0088FE" 
                  fillOpacity={0.6}
                  stroke="#0088FE"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          );
        } else {
          // Show density distribution across all years using stacked area to show temporal evolution
          const trendsData = csvService.getDataForTrends();
          if (!trendsData || trendsData.length === 0) {
            return <div className="text-center text-gray-500 py-8">No trends data available for distribution visualization</div>;
          }
          
          // Get all age group categories
          const categories = Object.keys(trendsData[0] || {}).filter(key => key !== 'year');
          
          return (
            <ResponsiveContainer width="100%" height={500}>
              <AreaChart data={trendsData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={safeYAxisFormatter} />
                <Tooltip 
                  formatter={(value, name) => [value.toLocaleString(), name]}
                  labelFormatter={(label) => `Year: ${label}`}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                {categories.slice(0, 10).map((category, index) => (
                  <Area
                    key={category}
                    type="monotone"
                    dataKey={category}
                    stackId="1"
                    fill={COLORS[index % COLORS.length]}
                    fillOpacity={0.7}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={1}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          );
        }

      case 'trends':
        // 📈📉 Trends - multi-line charts (Destination, Education)
        if (config.keyField === 'YEAR') {
          // For year-based data (Destination countries)
          const dataKeys = Object.keys(chartData[0] || {}).filter(key => key !== 'year');
          return (
            <ResponsiveContainer width="100%" height={500}>
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Legend />
                {dataKeys.slice(0, 8).map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          );
        } else {
          // For category-based data (Education levels)
          const dataKeys = Object.keys(chartData[0] || {}).filter(key => key !== 'year');
          return (
            <ResponsiveContainer width="100%" height={500}>
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Legend />
                {dataKeys.slice(0, 8).map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          );
        }

      case 'bubble':
        // 🔗 Relationships - bubble chart for Occupation data
        // X-axis: Year, Y-axis: Occupation, Bubble size: Count
        const bubbleData = chartData.flatMap(yearData => 
          Object.keys(yearData)
            .filter(key => key !== 'year')
            .map(occupation => ({
              x: yearData.year,
              y: occupation,
              z: yearData[occupation] || 0,
              count: yearData[occupation] || 0
            }))
        ).filter(d => d.z > 0);

        // Create occupation scale for Y-axis positioning
        const occupations = [...new Set(bubbleData.map(d => d.y))];
        const bubbleDataWithYPos = bubbleData.map(d => ({
          ...d,
          yPos: occupations.indexOf(d.y) + 1
        }));

        return (
          <ResponsiveContainer width="100%" height={600}>
            <ScatterChart 
              data={bubbleDataWithYPos} 
              margin={{ top: 20, right: 30, left: 180, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                dataKey="x" 
                name="Year" 
                domain={['dataMin', 'dataMax']}
                tickFormatter={(value) => value.toString()}
              />
              <YAxis 
                type="number" 
                dataKey="yPos" 
                name="Occupation"
                domain={[0.5, occupations.length + 0.5]}
                tickFormatter={(value) => {
                  const index = Math.round(value) - 1;
                  return occupations[index] || '';
                }}
                ticks={occupations.map((_, i) => i + 1)}
                width={170}
                fontSize={10}
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'Year') return [value, 'Year'];
                  if (name === 'Count') return [value.toLocaleString(), 'Emigrants'];
                  return [value, name];
                }}
                labelFormatter={(value, payload) => {
                  if (payload && payload[0]) {
                    return `${payload[0].payload.y} (${payload[0].payload.x})`;
                  }
                  return '';
                }}
              />
              <Scatter 
                dataKey="z" 
                fill="#0088FE"
                fillOpacity={0.6}
                stroke="#0088FE"
                strokeWidth={1}
              />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'stackedAreaPercent':
        // 🧩 Composition - 100% stacked area chart for Civil Status data
        if (!Array.isArray(chartData) || chartData.length === 0) {
          return <div className="text-center text-gray-500 p-8">No data available for stacked area percentage chart</div>;
        }

        // Process data to convert counts to percentages
        const processedPercentData = chartData.map(row => {
          const processedRow = { year: row.year || row.YEAR };
          
          // Calculate total for this year
          let yearTotal = 0;
          config.yearFields.forEach(field => {
            yearTotal += parseInt(row[field]) || 0;
          });
          
          // Convert each field to percentage
          if (yearTotal > 0) {
            config.yearFields.forEach(field => {
              const count = parseInt(row[field]) || 0;
              processedRow[field] = (count / yearTotal) * 100;
            });
          } else {
            // If no data for this year, set all to 0
            config.yearFields.forEach(field => {
              processedRow[field] = 0;
            });
          }
          
          return processedRow;
        }).sort((a, b) => a.year - b.year);

        const dataKeys = config.yearFields || Object.keys(processedPercentData[0] || {}).filter(key => key !== 'year');
        
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Civil Status Composition of Emigrants (1988–2020)
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Percentage distribution of civil status categories over time, normalized to 100% for each year
              </p>
            </div>
            
            <ResponsiveContainer width="100%" height={500}>
              <AreaChart 
                data={processedPercentData} 
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="year" 
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tickFormatter={(value) => `${value.toFixed(0)}%`} 
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value, name, props) => [
                    `${value.toFixed(1)}%`,
                    name
                  ]}
                  labelFormatter={(label) => `Year: ${label}`}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                />
                {dataKeys.map((key, index) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stackId="1"
                    stroke={COLORS[index % COLORS.length]}
                    fill={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    fillOpacity={0.8}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
            
            {/* Summary Statistics */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-3">Civil Status Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {dataKeys.map((status, index) => {
                  // Calculate average percentage across all years
                  const avgPercentage = processedPercentData.reduce((sum, row) => sum + (row[status] || 0), 0) / processedPercentData.length;
                  
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                      <div>
                        <div className="font-medium text-gray-800">{status}</div>
                        <div className="text-sm text-gray-600">
                          Avg: {avgPercentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 'treemap':
        // 🧠 Composition (Detailed) - Custom treemap for Civil Status
        // Year → Civil Status → Count hierarchy with area representing count
        if (!chartData || !chartData.children || chartData.children.length === 0) {
          return <div className="text-center text-gray-500 p-8">No data available for treemap chart</div>;
        }

        // Prepare treemap data structure
        const treemapData = [];
        let colorIndex = 0;
        
        chartData.children.forEach((yearGroup, yearIndex) => {
          if (yearGroup.children && yearGroup.children.length > 0) {
            yearGroup.children.forEach((statusItem, statusIndex) => {
              treemapData.push({
                name: `${yearGroup.name} - ${statusItem.name}`,
                size: statusItem.value,
                year: statusItem.year,
                civilStatus: statusItem.name,
                count: statusItem.count,
                yearGroup: yearGroup.name,
                color: COLORS[statusIndex % COLORS.length] // Color by civil status
              });
            });
          }
        });

        // Sort by size for better visual hierarchy
        treemapData.sort((a, b) => b.size - a.size);

        // Calculate size ratios for visual scaling
        const maxSize = Math.max(...treemapData.map(d => d.size));
        const minSize = Math.min(...treemapData.map(d => d.size));
        
        // Custom Treemap Component
        const TreemapVisualization = () => {
          return (
            <div className="space-y-6">
              {/* Main Treemap */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-2 text-center text-gray-800">
                  Civil Status Treemap Visualization
                </h3>
                <p className="text-sm text-gray-600 mb-6 text-center">
                  Rectangle size represents emigrant count. Hover for details. Year → Civil Status → Count hierarchy.
                </p>
                
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-96 overflow-auto p-4 border rounded">
                  {treemapData.map((item, index) => {
                    // Calculate size relative to max for visual scaling
                    const sizeRatio = item.size / maxSize;
                    const minHeight = 50;
                    const maxHeight = 150;
                    const height = minHeight + (maxHeight - minHeight) * sizeRatio;
                    const fontSize = Math.max(9, 12 * sizeRatio);
                    
                    return (
                      <div
                        key={`${item.year}-${item.civilStatus}`}
                        className="relative flex flex-col justify-center items-center text-white text-center cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg hover:z-10 rounded-lg p-2 border border-white/20"
                        style={{
                          backgroundColor: item.color,
                          height: `${height}px`,
                          minHeight: '50px',
                          minWidth: '60px'
                        }}
                        title={`Year: ${item.year}\nCivil Status: ${item.civilStatus}\nEmigrants: ${item.count.toLocaleString()}\nSize: ${((item.size / maxSize) * 100).toFixed(1)}% of max`}
                      >
                        <div style={{ fontSize: `${fontSize}px` }} className="font-bold leading-tight">
                          {item.year}
                        </div>
                        <div style={{ fontSize: `${Math.max(8, fontSize - 2)}px` }} className="opacity-90 leading-tight mt-1">
                          {item.civilStatus.length > 8 ? item.civilStatus.substring(0, 8) + '...' : item.civilStatus}
                        </div>
                        <div style={{ fontSize: `${Math.max(7, fontSize - 3)}px` }} className="opacity-80 leading-tight mt-1">
                          {item.count >= 1000 ? `${(item.count / 1000).toFixed(0)}K` : item.count}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="mt-6 p-4 bg-white rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3">Civil Status Legend</h4>
                  <div className="flex flex-wrap gap-3">
                    {(() => {
                      const statusColors = {};
                      chartData.children?.forEach(yearNode => {
                        yearNode.children?.forEach((statusNode, index) => {
                          if (!statusColors[statusNode.name]) {
                            statusColors[statusNode.name] = COLORS[index % COLORS.length];
                          }
                        });
                      });
                      
                      return Object.entries(statusColors).map(([status, color]) => (
                        <div key={status} className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded" 
                            style={{ backgroundColor: color }}
                          ></div>
                          <span className="text-sm text-gray-700">{status}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              {/* Year-based breakdown for context */}
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Yearly Breakdown</h4>
                <p className="text-sm text-gray-600 mb-4">Civil status distribution per year for detailed analysis</p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {chartData.children.map((yearGroup, yearIndex) => {
                    const yearTotal = yearGroup.children.reduce((sum, item) => sum + item.value, 0);
                    
                    return (
                      <div key={yearIndex} className="border rounded-lg p-3 bg-white shadow-sm">
                        <h5 className="font-semibold text-center mb-2 text-gray-800">
                          {yearGroup.name}
                        </h5>
                        <div className="text-xs text-center text-gray-600 mb-3">
                          Total: {yearTotal.toLocaleString()}
                        </div>
                        
                        <ResponsiveContainer width="100%" height={120}>
                          <PieChart>
                            <Pie
                              data={yearGroup.children}
                              cx="50%"
                              cy="50%"
                              outerRadius={40}
                              dataKey="value"
                              stroke="none"
                            >
                              {yearGroup.children.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={COLORS[index % COLORS.length]} 
                                />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value, name, props) => [
                                value.toLocaleString(),
                                props.payload.civilStatus || props.payload.name
                              ]}
                              labelFormatter={(label, props) => 
                                props && props[0] ? `Year ${props[0].payload.year}` : ''
                              }
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        };

        return <TreemapVisualization />;

      case 'worldMap':
        // 🗺 Geographic Representation - simplified as bar charts
        if (!Array.isArray(chartData) || chartData.length === 0) {
          return <div className="text-center text-gray-500 p-8">No geographic data available</div>;
        }
        
        return (
          <ResponsiveContainer width="100%" height={500}>
            <BarChart 
              data={chartData.slice(0, 15)} 
              margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="category" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                fontSize={10}
              />
              <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
              <Tooltip 
                formatter={(value) => [value.toLocaleString(), 'Emigrants']}
              />
              <Bar dataKey="value" fill="#00C49F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'groupedBar':
        // 📊 Comparison - Grouped bar chart for Region of Origin data
        // X-axis: Region, Y-axis: Count, Grouped by Year
        if (!Array.isArray(chartData) || chartData.length === 0) {
          return <div className="text-center text-gray-500 p-8">No data available for grouped bar chart</div>;
        }

        // Get all years for grouping
        const yearKeys = config.yearFields || [];
        
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Regional Origin of Emigrants (1988–2020)
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Comparison of emigrant counts by region of origin across years, sorted by total emigrants
              </p>
            </div>
            
            <ResponsiveContainer width="100%" height={600}>
              <BarChart 
                data={chartData} 
                margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="region" 
                  angle={-45}
                  textAnchor="end"
                  height={120}
                  tick={{ fontSize: 11 }}
                  interval={0}
                />
                <YAxis 
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value, name) => [
                    value.toLocaleString(),
                    `Year ${name}`
                  ]}
                  labelFormatter={(label) => `Region: ${label}`}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                />
                {yearKeys.map((year, index) => (
                  <Bar
                    key={year}
                    dataKey={year}
                    fill={COLORS[index % COLORS.length]}
                    radius={[2, 2, 0, 0]}
                    name={year}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
            
            {/* Summary Statistics */}
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-3">Regional Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {chartData.slice(0, 6).map((region, index) => (
                  <div key={region.region} className="p-3 bg-white rounded-lg shadow-sm">
                    <div className="font-medium text-gray-800 mb-2">{region.region}</div>
                    <div className="text-sm text-gray-600">
                      <div>Total: {region.total.toLocaleString()} emigrants</div>
                      <div className="mt-1">
                        Peak Year: {yearKeys.reduce((peak, year) => 
                          (region[year] || 0) > (region[peak] || 0) ? year : peak
                        , yearKeys[0])} ({Math.max(...yearKeys.map(year => region[year] || 0)).toLocaleString()})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'heatmap':
        // � Relationships - heatmap for Occupation data
        // X-axis: Year, Y-axis: Occupation, Color intensity: Count
        const heatmapData = chartData || [];
        if (!heatmapData.length) {
          return <div className="text-center text-gray-500 py-8">No data available for heatmap</div>;
        }

        // Get all unique occupations and years
        const allOccupations = [...new Set(heatmapData.flatMap(yearData => 
          Object.keys(yearData).filter(key => key !== 'year')
        ))];
        const allYears = heatmapData.map(d => d.year).sort((a, b) => a - b);
        
        // Find max value for color scaling
        const maxValue = Math.max(...heatmapData.flatMap(yearData => 
          Object.values(yearData).filter(val => typeof val === 'number')
        ));

        // Create heatmap grid
        const cellWidth = Math.max(30, 800 / allYears.length);
        const cellHeight = Math.max(25, 600 / allOccupations.length);
        const chartWidth = cellWidth * allYears.length + 200;
        const chartHeight = cellHeight * allOccupations.length + 100;

        return (
          <div className="w-full overflow-x-auto">
            <div style={{ width: `${chartWidth}px`, height: `${chartHeight}px` }} className="relative">
              <svg width={chartWidth} height={chartHeight} className="border">
                {/* Y-axis labels (Occupations) */}
                {allOccupations.map((occupation, i) => (
                  <text
                    key={occupation}
                    x={190}
                    y={50 + i * cellHeight + cellHeight/2}
                    textAnchor="end"
                    fontSize="10"
                    fill="#374151"
                    dominantBaseline="central"
                  >
                    {occupation.length > 15 ? occupation.substring(0, 15) + '...' : occupation}
                  </text>
                ))}
                
                {/* X-axis labels (Years) */}
                {allYears.map((year, j) => (
                  <text
                    key={year}
                    x={200 + j * cellWidth + cellWidth/2}
                    y={40}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#374151"
                    transform={`rotate(-45, ${200 + j * cellWidth + cellWidth/2}, 40)`}
                  >
                    {year}
                  </text>
                ))}

                {/* Heatmap cells */}
                {allOccupations.map((occupation, i) =>
                  allYears.map((year, j) => {
                    const yearData = heatmapData.find(d => d.year === year);
                    const value = yearData ? (yearData[occupation] || 0) : 0;
                    const intensity = value / maxValue;
                    const opacity = Math.max(0.1, intensity);
                    
                    return (
                      <g key={`${occupation}-${year}`}>
                        <rect
                          x={200 + j * cellWidth}
                          y={50 + i * cellHeight}
                          width={cellWidth - 1}
                          height={cellHeight - 1}
                          fill="#0088FE"
                          fillOpacity={opacity}
                          stroke="#fff"
                          strokeWidth={1}
                        />
                        {value > 0 && (
                          <text
                            x={200 + j * cellWidth + cellWidth/2}
                            y={50 + i * cellHeight + cellHeight/2}
                            textAnchor="middle"
                            fontSize="8"
                            fill={intensity > 0.5 ? "white" : "black"}
                            dominantBaseline="central"
                          >
                            {value > 999 ? `${(value/1000).toFixed(0)}K` : value}
                          </text>
                        )}
                      </g>
                    );
                  })
                )}
                
                {/* Color scale legend */}
                <g transform={`translate(${chartWidth - 150}, 50)`}>
                  <text x="0" y="-10" fontSize="12" fill="#374151">Emigrants</text>
                  {[0, 0.25, 0.5, 0.75, 1].map(intensity => (
                    <g key={intensity} transform={`translate(0, ${intensity * 100})`}>
                      <rect
                        x="0"
                        y="0"
                        width="20"
                        height="20"
                        fill="#0088FE"
                        fillOpacity={Math.max(0.1, intensity)}
                        stroke="#ccc"
                      />
                      <text x="25" y="15" fontSize="10" fill="#374151">
                        {Math.round(intensity * maxValue).toLocaleString()}
                      </text>
                    </g>
                  ))}
                </g>
              </svg>
            </div>
          </div>
        );

      case 'faceted':
        // 🔗 Relationships - Faceted Clustered Bar Chart (Small Multiples) for Occupation data
        // Each facet represents one Year, with clustered bars showing occupations
        const facetedData = chartData || [];
        if (!facetedData.length) {
          return <div className="text-center text-gray-500 py-8">No data available for faceted chart</div>;
        }

        // Get all unique occupations for consistent coloring
        const facetedOccupations = [...new Set(facetedData.flatMap(yearData => 
          Object.keys(yearData).filter(key => key !== 'year')
        ))];

        // Calculate grid layout
        const yearsToShow = facetedData.slice(0, 20); // Show max 20 years for readability
        const cols = Math.ceil(Math.sqrt(yearsToShow.length));
        const rows = Math.ceil(yearsToShow.length / cols);
        const facetWidth = 250;
        const facetHeight = 200;
        const totalWidth = cols * facetWidth + 50;
        const totalHeight = rows * facetHeight + 100;

        return (
          <div className="w-full overflow-auto">
            <div style={{ width: `${totalWidth}px`, height: `${totalHeight}px` }}>
              <h3 className="text-lg font-semibold mb-4 text-center">
                Occupation Distribution by Year (Small Multiples)
              </h3>
              <div 
                className="grid gap-2" 
                style={{ 
                  gridTemplateColumns: `repeat(${cols}, 1fr)`,
                  gridTemplateRows: `repeat(${rows}, 1fr)`
                }}
              >
                {yearsToShow.map((yearData, index) => {
                  // Prepare data for this year's bar chart
                  const occupationData = facetedOccupations
                    .map(occupation => ({
                      occupation: occupation.length > 8 ? occupation.substring(0, 8) + '...' : occupation,
                      fullName: occupation,
                      count: yearData[occupation] || 0
                    }))
                    .filter(d => d.count > 0)
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 8); // Show top 8 occupations per facet

                  const maxCount = Math.max(...occupationData.map(d => d.count));

                  return (
                    <div key={yearData.year} className="border rounded-lg p-2 bg-white shadow-sm">
                      {/* Year title */}
                      <h4 className="text-sm font-semibold text-center mb-2 text-gray-700">
                        {yearData.year}
                      </h4>
                      
                      {/* Mini bar chart */}
                      <div className="h-32 relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={occupationData} 
                            margin={{ top: 5, right: 5, left: 5, bottom: 20 }}
                          >
                            <XAxis 
                              dataKey="occupation" 
                              tick={{ fontSize: 8 }}
                              angle={-45}
                              textAnchor="end"
                              height={40}
                            />
                            <YAxis 
                              tick={{ fontSize: 8 }}
                              tickFormatter={(value) => value > 999 ? `${(value/1000).toFixed(0)}K` : value}
                            />
                            <Tooltip 
                              formatter={(value, name, props) => [
                                value.toLocaleString(), 
                                props.payload.fullName
                              ]}
                              labelStyle={{ fontSize: '12px' }}
                              contentStyle={{ fontSize: '12px' }}
                            />
                            <Bar 
                              dataKey="count" 
                              fill={COLORS[index % COLORS.length]}
                              radius={[2, 2, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Total count for this year */}
                      <div className="text-xs text-center text-gray-500 mt-1">
                        Total: {occupationData.reduce((sum, d) => sum + d.count, 0).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Legend */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold mb-2">Legend:</h4>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>• Each panel represents one year</p>
                  <p>• Bars show emigrant counts by occupation</p>
                  <p>• Only top 8 occupations per year are displayed</p>
                  <p>• Hover over bars for detailed information</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'network':
        // Legacy network implementation (kept for reference)
        return <div className="text-center text-gray-500 py-8">Network visualization deprecated - use faceted chart instead</div>;

      case 'line':
        // Simple line chart for 2D data (Sex, Total)
        if (config.keyField === 'YEAR') {
          const dataKeys = Object.keys(chartData[0] || {}).filter(key => key !== 'year');
          return (
            <ResponsiveContainer width="100%" height={500}>
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Legend />
                {dataKeys.map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={3}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          );
        }
        break;

      case 'stackedArea':
        // Stacked area chart for 3D data (Occupation, Destination, Region, Relationship)
        if (config.keyField === 'YEAR') {
          // For datasets where year is the key (Destination)
          const dataKeys = Object.keys(chartData[0] || {}).filter(key => key !== 'year');
          return (
            <ResponsiveContainer width="100%" height={500}>
              <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Legend />
                {dataKeys.slice(0, 10).map((key, index) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stackId="1"
                    stroke={COLORS[index % COLORS.length]}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          );
        } else {
          // For category-based datasets (Occupation, Region, Relationship)
          const dataKeys = Object.keys(chartData[0] || {}).filter(key => key !== 'year');
          return (
            <ResponsiveContainer width="100%" height={500}>
              <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Legend />
                {dataKeys.slice(0, 10).map((key, index) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stackId="1"
                    stroke={COLORS[index % COLORS.length]}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          );
        }

      case 'stackedBar':
        // Stacked bar chart for composition by year (Education, Civil Status)
        if (config.keyField === 'YEAR') {
          const dataKeys = Object.keys(chartData[0] || {}).filter(key => key !== 'year');
          return (
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Legend />
                {dataKeys.map((key, index) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="a"
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          );
        } else {
          // For category-based datasets
          const dataKeys = Object.keys(chartData[0] || {}).filter(key => key !== 'year');
          return (
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Legend />
                {dataKeys.slice(0, 10).map((key, index) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="a"
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          );
        }

      case 'heatmap':
        // Heatmap simulation using stacked area for Age data (age_group x year x count)
        if (selectedYear) {
          // For a specific year, show bar chart of age groups
          return (
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="category" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  fontSize={12}
                />
                <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Bar dataKey="value" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          );
        } else {
          // Show all age groups over time as stacked area (heatmap alternative)
          const dataKeys = Object.keys(chartData[0] || {}).filter(key => key !== 'year');
          return (
            <ResponsiveContainer width="100%" height={500}>
              <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Legend />
                {dataKeys.slice(0, 10).map((key, index) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stackId="1"
                    stroke={COLORS[index % COLORS.length]}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          );
        }

      case 'trends':
        // Line chart showing trends over time (Education, Total)
        if (config.keyField === 'YEAR') {
          // Simple line chart for total data
          return (
            <ResponsiveContainer width="100%" height={500}>
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#0088FE" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          );
        } else {
          // Multi-line chart for categorical data (e.g., education levels over time)
          const dataKeys = Object.keys(chartData[0] || {}).filter(key => key !== 'year');
          return (
            <ResponsiveContainer width="100%" height={500}>
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Legend />
                {dataKeys.slice(0, 10).map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          );
        }

      case 'comparison':
        // Grouped bar chart for comparing destinations/major countries
        return (
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
              <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(value) => value.toLocaleString()} />
              <Bar dataKey="value" fill="#0088FE" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'composition':
        // Stacked bar chart or pie chart for sex, civil status composition
        if (selectedYear) {
          return (
            <ResponsiveContainer width="100%" height={500}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => percent > 0.03 ? `${name}: ${(percent * 100).toFixed(1)}%` : ''}
                  outerRadius={150}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value.toLocaleString()} />
              </PieChart>
            </ResponsiveContainer>
          );
        } else {
          // Stacked area chart over time
          const dataKeys = Object.keys(chartData[0] || {}).filter(key => key !== 'year');
          return (
            <ResponsiveContainer width="100%" height={500}>
              <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Legend />
                {dataKeys.map((key, index) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stackId="1"
                    stroke={COLORS[index % COLORS.length]}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          );
        }

      case 'distribution':
        // Histogram/box plot for age distribution
        return (
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
              <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(value) => value.toLocaleString()} />
              <Bar dataKey="value" fill="#00C49F" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'geographic':
        // For now, use bar chart for regional data (can be enhanced with actual maps later)
        return (
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
              <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(value) => value.toLocaleString()} />
              <Bar dataKey="value" fill="#FFBB28" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'relationships':
        // Bubble chart or scatter plot for occupation relationships
        return (
          <ResponsiveContainer width="100%" height={500}>
            <ScatterChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" name="Category" />
              <YAxis dataKey="value" name="Count" tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(value) => value.toLocaleString()} />
              <Scatter fill="#FF8042" />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'choropleth':
        return <PhilippineChoroplethMap 
          data={data} 
          selectedYear={selectedYear} 
          setSelectedYear={setSelectedYear} 
        />;

      default:
        return <div>Chart type "{config.chartType}" not supported</div>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="bg-white p-5 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">{getTitle()}</h2>
          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Year selector for all chart types with time-based data */}
        {(config.chartType === 'comparison' || config.chartType === 'composition' || config.chartType === 'distribution' || config.chartType === 'trends' || config.chartType === 'relationships' || config.chartType === 'geographic' || config.chartType === 'heatmap' || config.chartType === 'stackedArea' || config.chartType === 'stackedBar' || config.chartType === 'line' || config.chartType === 'bubble' || config.chartType === 'stackedAreaPercent' || config.chartType === 'sunburst' || config.chartType === 'worldMap' || config.chartType === 'choropleth') && availableYears.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Year:</label>
            <select
              value={selectedYear || ''}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Choose a year</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        )}

        {/* File upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload {config.fileName}:
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="border border-gray-300 rounded-md px-3 py-2 w-full"
          />
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-5 rounded-lg shadow-sm">
        <h3 className="text-xl font-bold text-gray-800 mb-4">{getTitle()}</h3>
        <p className="text-sm text-gray-600 mb-4">
          {config.purpose} visualization showing {config.displayName.toLowerCase()} data across the time period.
        </p>
        {renderChart()}
      </div>

      {/* Simplified CRUD Interface */}
      <div className="bg-white p-5 rounded-lg shadow-sm">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Data Management</h3>
          
          {/* Add/Edit form */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-3">
              {editingRecord ? 'Edit Record' : `Add New ${config.displayName} Record`}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {config.displayName}
                </label>
                {config.predefinedOptions && config.predefinedOptions.length > 0 ? (
                  <select
                    value={simpleForm.category}
                    onChange={(e) => setSimpleForm({...simpleForm, category: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select {config.displayName}</option>
                    {config.predefinedOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder={`Enter ${config.displayName}`}
                    value={simpleForm.category}
                    onChange={(e) => setSimpleForm({...simpleForm, category: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              {/* Year Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select
                  value={simpleForm.year}
                  onChange={(e) => setSimpleForm({...simpleForm, year: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Year</option>
                  {availableYears.map(year => (
                    <option key={year} value={year.toString()}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Count Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Count</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Enter count"
                  value={simpleForm.count}
                  onChange={(e) => setSimpleForm({...simpleForm, count: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Action Button */}
              <div className="flex items-end">
                {editingRecord ? (
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={updateSimpleRecord}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                      <Edit size={16} />
                      Update
                    </button>
                    <button
                      onClick={() => {
                        setEditingRecord(null);
                        setSimpleForm({ category: '', year: '', count: '' });
                      }}
                      className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={addSimpleRecord}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    Add Record
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Data summary table with pagination */}
          <div className="overflow-x-auto">
            {/* Pagination controls - Top */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  Showing {totalRecords > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, totalRecords)} of {totalRecords} records
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Records per page:</label>
                  <select
                    value={recordsPerPage}
                    onChange={(e) => {
                      setRecordsPerPage(Number(e.target.value));
                      setCurrentPage(1); // Reset to first page when changing page size
                    }}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {totalPages >= 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={goToFirstPage}
                    disabled={currentPage === 1}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="First page"
                  >
                    <ChevronsLeft size={16} />
                  </button>
                  <button
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="flex items-center gap-1 mx-2">
                    {/* Show page numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = index + 1;
                      } else if (currentPage <= 3) {
                        pageNum = index + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + index;
                      } else {
                        pageNum = currentPage - 2 + index;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          className={`px-2 py-1 text-sm rounded ${
                            pageNum === currentPage
                              ? 'bg-blue-600 text-white'
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={goToLastPage}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Last page"
                  >
                    <ChevronsRight size={16} />
                  </button>
                </div>
              )}
            </div>

            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">{config.displayName}</th>
                  <th className="px-4 py-2 text-left">Year</th>
                  <th className="px-4 py-2 text-left">Count</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.map((record) => (
                  <tr key={record.id} className="border-b">
                    <td className="px-4 py-2">{record.category}</td>
                    <td className="px-4 py-2">{record.year}</td>
                    <td className="px-4 py-2">{record.count.toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingRecord({ category: record.category, year: record.year });
                            setSimpleForm({ 
                              category: record.category, 
                              year: record.year, 
                              count: record.count.toString() 
                            });
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                          title="Edit record"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => deleteSimpleRecord(record.category, record.year)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                          title="Delete record"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {totalRecords === 0 && (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                      No data available. Upload a CSV file or add records manually.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination controls - Bottom */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center mt-4 gap-2">
                <button
                  onClick={goToFirstPage}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  First
                </button>
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <span className="px-3 py-1 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
                <button
                  onClick={goToLastPage}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Last
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
  );
};

// Philippine Choropleth Map Component
const PhilippineChoroplethMap = ({ data, selectedYear, setSelectedYear }) => {
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load our local GeoJSON data
  useEffect(() => {
    const loadGeoData = async () => {
      try {
        setLoading(true);
        
        // Import our local simplified GeoJSON data
        const { philippinesProvincesGeoJSON } = await import('../data/philippinesProvinces_new.js');
        
        console.log(' Loaded local GeoJSON data');
        console.log(' Available provinces:', philippinesProvincesGeoJSON.features.map(f => f.properties.name));
        
        setGeoData(philippinesProvincesGeoJSON);
        setError(null);
      } catch (err) {
        console.error(' Error loading GeoJSON:', err);
        setError('Failed to load map data');
      } finally {
        setLoading(false);
      }
    };

    loadGeoData();
  }, []);

  // Process data for visualization
  const processedData = useMemo(() => {
    console.log(' Processing choropleth data...');
    console.log(' Raw data sample:', data?.slice(0, 3));
    console.log(' Selected year:', selectedYear);
    
    if (!data || !Array.isArray(data) || data.length === 0 || !selectedYear) {
      console.log(' No data available for processing');
      return {};
    }

    const result = {};
    
    data.forEach((row, index) => {
      const provinceName = row.PROVINCE || row.province || row.Province;
      
      if (provinceName && row[selectedYear] !== undefined) {
        const count = parseInt(row[selectedYear]) || 0;
        const normalizedName = provinceName.toUpperCase().trim();
        
        result[normalizedName] = count;
        
        // Debug first few provinces
        if (index < 5) {
          console.log(` Processing: "${provinceName}"  "${normalizedName}" = ${count} emigrants`);
        }
      }
    });

    console.log(' Processed data summary:', { 
      provinces: Object.keys(result).length, 
      totalEmigrants: Object.values(result).reduce((sum, count) => sum + count, 0),
      top5Provinces: Object.entries(result)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => `${name}: ${count}`)
    });
    
    return result;
  }, [data, selectedYear]);

  // Color scale function
  const getProvinceColor = (geoProvinceName) => {
    if (!geoProvinceName || !processedData) return '#f0f0f0';
    
    // Try to match the province name
    const normalizedGeoName = geoProvinceName.toUpperCase().trim();
    let count = processedData[normalizedGeoName] || 0;
    
    // Try alternative matching if direct match fails
    if (count === 0) {
      for (const [dataProvince, dataCount] of Object.entries(processedData)) {
        if (dataProvince.includes(normalizedGeoName) || normalizedGeoName.includes(dataProvince)) {
          count = dataCount;
          break;
        }
      }
    }
    
    if (count === 0) return '#f0f0f0'; // Light gray for no data
    
    const maxCount = Math.max(...Object.values(processedData));
    if (maxCount === 0) return '#f0f0f0';
    
    const intensity = Math.min(count / maxCount, 1);
    
    // Create a blue color scale from light to dark
    const r = Math.round(219 - (intensity * 100)); // 219 to 119
    const g = Math.round(234 - (intensity * 110)); // 234 to 124  
    const b = Math.round(254 - (intensity * 116)); // 254 to 138
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading Philippine map data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Error loading map: {error}</div>
      </div>
    );
  }

  if (!geoData || !geoData.features || geoData.features.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">No geographic data available</div>
      </div>
    );
  }

  return (
    <div className="w-full h-96 relative">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          center: [122, 12],
          scale: 2000
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={geoData}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const provinceName = geo.properties?.name || geo.properties?.province;
              const count = processedData[provinceName?.toUpperCase()] || 0;
              const color = getProvinceColor(provinceName);
              
              // Debug coloring for first few provinces
              if (geographies.indexOf(geo) < 3) {
                console.log(` Province coloring: ${provinceName}  count: ${count}  color: ${color}`);
              }
              
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={color}
                  stroke="#666"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", stroke: "#333", strokeWidth: 1 },
                    pressed: { outline: "none" }
                  }}
                  onMouseEnter={() => {
                    setTooltipData({
                      province: provinceName,
                      count: count.toLocaleString(),
                      year: selectedYear
                    });
                  }}
                  onMouseLeave={() => {
                    setTooltipData(null);
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
      
      {/* Tooltip */}
      {tooltipData && (
        <div className="absolute bg-black bg-opacity-75 text-white p-2 rounded pointer-events-none z-10"
             style={{ top: 10, right: 10 }}>
          <div className="font-semibold">{tooltipData.province}</div>
          <div>Year: {tooltipData.year}</div>
          <div>Emigrants: {tooltipData.count}</div>
        </div>
      )}
      
      {/* Debug info */}
      {Object.keys(processedData).length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          <p>Showing data for {Object.keys(processedData).length} provinces in {selectedYear}</p>
          <p>Total emigrants: {Object.values(processedData).reduce((sum, count) => sum + count, 0).toLocaleString()}</p>
          <p>Max emigrants: {Math.max(...Object.values(processedData)).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
};

export default UniversalChart;
