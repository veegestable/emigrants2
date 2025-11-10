import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter, ComposedChart, ReferenceLine } from 'recharts';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { Upload, Plus, Edit, Trash2, Download, FileText, Map as MapIcon, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { createCSVService, csvConfigurations } from '../services/csvDataService';
import * as d3 from 'd3';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#d084d0', '#ffb347'];

// Safe formatter for YAxis to prevent infinity errors
const safeYAxisFormatter = (value) => {
  if (!isFinite(value) || isNaN(value)) return '0';
  if (value === 0) return '0';
  
  // Handle millions (1,000,000+)
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1).replace('.0', '')}M`;
  }
  // Handle thousands (1,000+)
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  // Handle regular numbers
  return value.toString();
};

const UniversalChart = ({ datasetType, initialData = null }) => {
  const [csvService] = useState(() => createCSVService(datasetType));
  const [data, setData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [simpleForm, setSimpleForm] = useState(() => {
    if (datasetType === 'sex') {
      return { year: '', male: '', female: '' };
    } else {
      return { category: '', year: '', count: '' };
    }
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
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

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Auto-select latest year when data loads and no year is selected (except for charts that show all years)
  useEffect(() => {
    // Skip auto-selection for charts that display all years by default
    if (config.chartType === 'scatter' || config.chartType === 'stackedAreaPercent') {
      return;
    }
    
    if (data.length > 0 && !selectedYear) {
      const years = csvService ? csvService.getAvailableYears() : [];
      if (years.length > 0) {
        const latestYear = Math.max(...years);
        console.log('🎯 Auto-selecting latest year:', latestYear);
        setSelectedYear(latestYear.toString());
      }
    }
  }, [data, selectedYear, csvService, config.chartType]);

  // Handle CSV file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        console.log('📁 Starting CSV upload for:', datasetType);
        
        // Validate file name first
        const expectedFileName = config.fileName;
        const uploadedFileName = file.name;
        
        console.log('🔍 File validation:', {
          expected: expectedFileName,
          uploaded: uploadedFileName,
          match: uploadedFileName === expectedFileName
        });
        
        // Check if the uploaded file name matches the expected file name
        if (uploadedFileName !== expectedFileName) {
          const errorMessage = `❌ Wrong CSV file detected!\n\nExpected: ${expectedFileName}\nUploaded: ${uploadedFileName}\n\nPlease upload the correct CSV file: "${expectedFileName}"`;
          alert(errorMessage);
          console.error('❌ CSV validation failed:', {
            expected: expectedFileName,
            uploaded: uploadedFileName,
            datasetType
          });
          // Clear the file input
          event.target.value = '';
          return;
        }
        
        const processedData = await csvService.parseCSV(file);
        
        // Additional validation: Check if CSV has expected structure
        if (processedData.length === 0) {
          alert(`❌ The uploaded CSV file "${uploadedFileName}" appears to be empty or invalid.\n\nPlease check the file and try again.`);
          event.target.value = '';
          return;
        }
        
        // Validate CSV structure based on dataset type
        const firstRow = processedData[0];
        const expectedKeyField = config.keyField;
        
        // Check if the expected key field exists (case-insensitive)
        const actualFields = Object.keys(firstRow);
        const hasExpectedField = actualFields.some(field => 
          field.toUpperCase() === expectedKeyField.toUpperCase()
        );
        
        if (!hasExpectedField) {
          const availableFields = actualFields.slice(0, 5).join(', ');
          const errorMessage = `❌ CSV structure validation failed!\n\nExpected key field: "${expectedKeyField}"\nFound fields: ${availableFields}...\n\nPlease ensure you're uploading the correct CSV file: "${expectedFileName}"`;
          alert(errorMessage);
          console.error('❌ CSV structure validation failed:', {
            expectedKeyField,
            foundFields: actualFields,
            datasetType,
            firstRowSample: firstRow
          });
          event.target.value = '';
          return;
        }
        
        console.log('✅ CSV parsed successfully:', {
          datasetType,
          processedLength: processedData.length,
          sampleProcessed: processedData.slice(0, 2),
          config: {
            keyField: config.keyField,
            yearFields: config.yearFields?.slice(0, 3) || []
          }
        });
        
        setData(processedData);
        // Save the uploaded CSV data to Firebase
        await csvService.saveToFirebase();
        console.log('💾 CSV data uploaded and saved to Firebase');
        
        // Success message
        alert(`✅ CSV file "${uploadedFileName}" uploaded successfully!\n\nLoaded ${processedData.length} records for ${config.displayName} analysis.`);
        
      } catch (error) {
        console.error('❌ Error parsing CSV:', error);
        alert(`❌ Error parsing CSV file.\n\nPlease check the file format and ensure you're uploading: "${config.fileName}"`);
        // Clear the file input on error
        event.target.value = '';
      }
    }
  };

  // Export data to CSV
  const exportToCSV = () => {
    csvService.exportToCSV();
  };

  // Simplified CRUD operations
  const addSimpleRecord = async () => {
    console.log('🚀 ADD SIMPLE RECORD CALLED', { datasetType, simpleForm });
    
    // Handle sex dataset specially
    if (datasetType === 'sex') {
      if (!simpleForm.year || !simpleForm.male || !simpleForm.female) {
        alert('Please fill in year, male count, and female count');
        return;
      }
      
      try {
        console.log('🎯 Adding sex record:', simpleForm);
        const yearValue = parseInt(simpleForm.year);
        const maleCount = parseInt(simpleForm.male);
        const femaleCount = parseInt(simpleForm.female);
        
        // Find if year already exists
        const existingIndex = data.findIndex(row => parseInt(row.YEAR || row.year) === yearValue);
        let updatedData;
        
        if (existingIndex >= 0) {
          // ADD to existing year (additive behavior)
          console.log('🎯 Year exists, adding to existing counts');
          updatedData = [...data];
          const existingRow = updatedData[existingIndex];
          updatedData[existingIndex] = {
            ...existingRow,
            YEAR: yearValue,
            MALE: (parseInt(existingRow.MALE || existingRow.male || 0)) + maleCount,
            FEMALE: (parseInt(existingRow.FEMALE || existingRow.female || 0)) + femaleCount
          };
          console.log('🎯 Updated row:', updatedData[existingIndex]);
        } else {
          // Add new year
          console.log('🎯 New year, creating new record');
          const newRecord = {
            YEAR: yearValue,
            MALE: maleCount,
            FEMALE: femaleCount
          };
          updatedData = [...data, newRecord];
          console.log('🎯 New record:', newRecord);
        }
        
        // Save to Firebase and update state
        csvService.data = updatedData;
        await csvService.saveToFirebase();
        setData(updatedData);
        setSimpleForm({ year: '', male: '', female: '' });
        console.log('🎯 Sex record added successfully');
      } catch (error) {
        console.error('❌ Error adding sex record:', error);
        alert('Error adding record. Please try again.');
      }
      return;
    }
    
    // Original logic for other datasets
    if (!simpleForm.category || !simpleForm.year || !simpleForm.count) {
      alert('Please fill in all fields');
      return;
    }

    try {
      console.log('Adding record:', simpleForm);
      console.log('🎯 Add Record Debug:', {
        datasetType,
        keyField: config.keyField,
        categoryValue: simpleForm.category,
        year: simpleForm.year,
        count: simpleForm.count,
        isYearBased: config.keyField === 'YEAR'
      });
      
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
    // Handle sex dataset specially
    if (datasetType === 'sex') {
      if (!editingRecord || !simpleForm.year || !simpleForm.male || !simpleForm.female) {
        alert('Please fill in year, male count, and female count');
        return;
      }
      
      try {
        console.log('Updating sex record:', simpleForm);
        const updatedData = [...data];
        const index = updatedData.findIndex(row => parseInt(row.YEAR || row.year) === parseInt(simpleForm.year));
        
        if (index >= 0) {
          updatedData[index] = {
            YEAR: parseInt(simpleForm.year),
            MALE: parseInt(simpleForm.male),
            FEMALE: parseInt(simpleForm.female)
          };
          
          csvService.data = updatedData;
          await csvService.saveToFirebase();
          setData(updatedData);
          setEditingRecord(null);
          setSimpleForm({ year: '', male: '', female: '' });
        }
      } catch (error) {
        console.error('Error updating sex record:', error);
        alert('Error updating record. Please try again.');
      }
      return;
    }
    
    // Original logic for other datasets
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
    console.log('🗑️ DELETE SIMPLE RECORD CALLED', { datasetType, category, year });
    
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      // Handle sex dataset specially
      if (datasetType === 'sex') {
        console.log('🗑️ Deleting sex record for year:', year);
        const updatedData = data.filter(row => parseInt(row.YEAR || row.year) !== parseInt(year));
        csvService.data = updatedData;
        await csvService.saveToFirebase();
        setData(updatedData);
        console.log('🗑️ Sex record deleted successfully');
        return;
      }
      
      // Original logic for other datasets
      console.log('🗑️ Deleting record via csvService for:', { category, year });
      const updatedData = await csvService.deleteRecordFromFirebase(category, year);
      setData([...updatedData]);
      console.log('🗑️ Record deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting record:', error);
      alert('Error deleting record. Please try again.');
    }
  };

  const deleteAllData = async () => {
    console.log('🗑️ DELETE ALL DATA CALLED for dataset:', datasetType);
    
    if (!confirm(`Are you sure you want to delete ALL data for ${config.displayName}? This action cannot be undone.`)) return;
    
    // Double confirmation for safety
    if (!confirm('This will permanently delete all records in this dataset. Are you absolutely sure?')) return;

    try {
      console.log('🗑️ Clearing all data for dataset:', datasetType);
      
      // Clear the data array
      csvService.data = [];
      await csvService.saveToFirebase();
      setData([]);
      
      // Reset form states
      setEditingRecord(null);
      setSimpleForm(datasetType === 'sex' ? 
        { year: '', male: '', female: '' } : 
        { category: '', year: '', count: '' }
      );
      setSearchTerm('');
      setCurrentPage(1);
      
      console.log('🗑️ All data deleted successfully');
      alert(`All data for ${config.displayName} has been deleted successfully.`);
    } catch (error) {
      console.error('❌ Error deleting all data:', error);
      alert('Error deleting all data. Please try again.');
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
          console.log(`🔍 Row ${rowIndex} structure (${datasetType}):`, {
            keys: Object.keys(row),
            keyField: config.keyField,
            datasetType: datasetType,
            sampleValues: {
              [config.keyField]: row[config.keyField],
              'age_group': row['age_group'],
              'ageGroup': row['ageGroup'],
              'AGE_GROUP': row['AGE_GROUP']
            }
          });
        }
        
        // Handle YEAR-based datasets differently (Civil Status, Sex, Destination)
        if (config.keyField === 'YEAR') {
          const year = row.YEAR || row.year;
          if (year) {
            // Special handling for sex dataset - each row represents one year with MALE and FEMALE counts
            if (datasetType === 'sex') {
              const maleCount = parseInt(row.MALE || row.male) || 0;
              const femaleCount = parseInt(row.FEMALE || row.female) || 0;
              
              records.push({
                id: `${rowIndex}-${year}`,
                category: 'Sex Data',
                year: year.toString(),
                count: `M: ${maleCount.toLocaleString()}, F: ${femaleCount.toLocaleString()}`,
                male: maleCount,
                female: femaleCount,
                rowIndex: rowIndex
              });
            } else {
              // For other YEAR-based datasets, each category field is a separate record
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
          }
          return; // Skip the category-based processing below
        }
        
        // Try multiple variations of the key field to handle case sensitivity
        const keyFieldVariations = [
          config.keyField,
          config.keyField.toLowerCase(),
          config.keyField.toUpperCase(),
          // For some datasets, try specific mappings
          datasetType === 'age' ? 'age_group' : null,
          datasetType === 'age' ? 'ageGroup' : null,
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
            console.log('getChartData: Entering composition/stackedBar case for YEAR-based dataset');
            // For composition, we need to aggregate all years or use a specific year
            if (selectedYear) {
              // Find the row for the selected year
              console.log('[UniversalChart] Looking for year row with selectedYear:', selectedYear);
              console.log('[UniversalChart] Sample data for debug:', data.slice(0, 2));
              
              const yearRow = data.find(row => {
                // Check both possible field names and convert to strings for comparison
                const yearValue = row.year || row.YEAR;
                const match = yearValue?.toString() === selectedYear.toString();
                console.log('[UniversalChart] Checking row with year value:', yearValue, 'matches:', match);
                return match;
              });
              
              console.log('[UniversalChart] Found yearRow:', yearRow);
              
              if (yearRow) {
                const compositionData = config.yearFields.map(field => ({
                  name: field,
                  category: field,
                  value: parseInt(yearRow[field]) || 0
                })).filter(item => item.value > 0);
                
                console.log('[UniversalChart] Composition data before filter:', config.yearFields.map(field => ({
                  name: field,
                  category: field,
                  value: parseInt(yearRow[field]) || 0
                })));
                console.log('[UniversalChart] Composition data after filter:', compositionData);
                
                return compositionData;
              } else {
                console.log('[UniversalChart] No year row found for selectedYear:', selectedYear);
                return [];
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
            console.log('getChartData: Getting trends data');
            return csvService.getDataForTrends();
            
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
            
          case 'scatter':
            console.log('getChartData: Getting scatter plot data for sex dataset');
            console.log('🔍 Raw data sample for debugging:', data.slice(0, 5));
            console.log('🔍 Data structure check:', data.map(row => ({ 
              year: row.year || row.YEAR, 
              yearType: typeof (row.year || row.YEAR),
              male: row.male || row.MALE, 
              female: row.female || row.FEMALE 
            })).slice(0, 5));
            
            const processedData = data.map(row => {
              const year = parseInt(row.year || row.YEAR);
              const male = parseInt(row.male || row.MALE) || 0;
              const female = parseInt(row.female || row.FEMALE) || 0;
              
              // Debug: Log specific problematic cases
              if (isNaN(year) || year < 1980 || year > 2020) {
                console.warn('🚨 Invalid year detected:', { originalRow: row, parsedYear: year });
                return null; // Skip invalid data
              }
              
              // Debug: Log year processing for specific problematic years
              if ((year === 2001 || year === 2004) && (row.year || row.YEAR) !== year.toString()) {
                console.error('� Year parsing issue:', { originalRow: row, parsedYear: year });
              }
              
              // Determine decade for color coding
              let decade = '';
              let decadeColor = '';
              if (year >= 1980 && year < 1990) {
                decade = '1980s';
                decadeColor = '#0088FE'; // Blue
              } else if (year >= 1990 && year < 2000) {
                decade = '1990s';
                decadeColor = '#00C49F'; // Green
              } else if (year >= 2000 && year < 2010) {
                decade = '2000s';
                decadeColor = '#FFBB28'; // Orange
              } else if (year >= 2010 && year < 2020) {
                decade = '2010s';
                decadeColor = '#FF8042'; // Purple
              } else if (year >= 2020) {
                decade = '2020+';
                decadeColor = '#8884d8'; // Red
              }
              
              // Debug: Log all years and their decade assignments to catch any issues
              if (year >= 2000 && year < 2010 && decade === '1980s') {
                console.error('🚨 DECADE MISMATCH:', { originalRow: row, year, decade, decadeColor });
              }
              
              return {
                year,
                male,
                female,
                decade,
                decadeColor,
                // Special highlight for 2020 pandemic year
                isPandemic: year === 2020
              };
            }).filter(point => point && (point.male > 0 || point.female > 0)); // Filter out invalid data points and null values
            
            console.log('Final processed scatter data: total points =', processedData.length);
            console.log('Years in final data:', [...new Set(processedData.map(p => p.year))].sort((a, b) => a - b));
            console.log('🔍 Blue points (1980s):', processedData.filter(p => p.decadeColor === '#0088FE').map(p => ({ year: p.year, decade: p.decade })));
            return processedData;
            
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
              const yearData = csvService.getDataForComparison(selectedYear);
              
              // Sort age groups in logical order if this is age data
              if (config.predefinedOptions && config.keyField === 'AGE_GROUP') {
                return yearData.sort((a, b) => {
                  const orderA = config.predefinedOptions.indexOf(a.category);
                  const orderB = config.predefinedOptions.indexOf(b.category);
                  return orderA - orderB;
                });
              }
              return yearData;
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
              
              let result = Object.entries(aggregated).map(([category, value]) => ({
                category,
                value
              })).filter(item => item.value > 0);
              
              // Sort age groups in logical order if this is age data
              if (config.predefinedOptions && config.keyField === 'AGE_GROUP') {
                result = result.sort((a, b) => {
                  const orderA = config.predefinedOptions.indexOf(a.category);
                  const orderB = config.predefinedOptions.indexOf(b.category);
                  return orderA - orderB;
                });
              }
              
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
            
            if (selectedYear) {
              // For selected year, return simple category/value structure
              console.log('getChartData: Getting grouped bar data for specific year:', selectedYear);
              const yearData = data.map(row => {
                const region = row[config.keyField.toLowerCase()] || row[config.keyField];
                const count = parseInt(row[selectedYear]) || 0;
                return {
                  category: region,
                  value: count
                };
              }).filter(item => item.value > 0) // Only include regions with data
                .sort((a, b) => b.value - a.value); // Sort by count descending
              
              console.log('getChartData: Year-specific grouped bar data processed:', yearData.length, 'regions');
              return yearData;
            } else {
              // For all years, return grouped format with years as separate properties
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
            }
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
            console.log('getChartData: Entering trends case for YEAR-based dataset');
            console.log('getChartData: Getting trends data', {
              datasetType,
              keyField: config.keyField,
              selectedYear,
              isYearBased: config.keyField === 'YEAR'
            });
            
            if (config.keyField === 'YEAR') {
              console.log('getChartData: Processing YEAR-based trends logic');
              // Year-based dataset (civil status, sex, destination) 
              if (selectedYear) {
                // For trends with selected year, show composition (pie chart)
                console.log('getChartData: Getting composition data for YEAR-based + selectedYear:', selectedYear);
                console.log('getChartData: Sample data structure:', data.slice(0, 2));
                console.log('getChartData: Config yearFields:', config.yearFields);
                
                // The keyField is converted to lowercase during processing
                const keyFieldLower = config.keyField.toLowerCase(); // 'year'
                const yearRow = data.find(row => {
                  const rowYear = row[keyFieldLower] || row[config.keyField];
                  const match = rowYear?.toString() === selectedYear.toString();
                  console.log(`getChartData: Checking row year ${rowYear} against selected ${selectedYear}: ${match}`);
                  return match;
                });
                
                console.log('getChartData: Found yearRow:', yearRow);
                
                if (yearRow) {
                  const compositionData = config.yearFields.map(field => {
                    const value = parseInt(yearRow[field]) || 0;
                    console.log(`getChartData: Mapping field ${field} with value ${value}`);
                    const item = {
                      name: field,
                      category: field,
                      value: value
                    };
                    console.log(`getChartData: Created composition item:`, item);
                    return item;
                  }).filter(item => item.value > 0);
                  
                  console.log('getChartData: Year-based composition result:', {
                    selectedYear,
                    dataLength: compositionData?.length || 0,
                    sampleData: compositionData?.slice(0, 3),
                    allData: compositionData
                  });
                  return compositionData;
                } else {
                  console.log('getChartData: No yearRow found for selectedYear:', selectedYear);
                  console.log('getChartData: Available years in data:', data.map(row => row[keyFieldLower] || row[config.keyField]));
                  return [];
                }
              } else {
                // For trends without selected year, show time series
                console.log('getChartData: Processing YEAR-based trends');
                console.log('getChartData: Direct data processing - sample data:', data.slice(0, 2));
                
                // Bypass csvService and process data directly for reliability
                const trendsData = data.map(row => {
                  const keyFieldLower = config.keyField.toLowerCase(); // 'year'
                  const yearValue = row[keyFieldLower] || row[config.keyField];
                  const yearData = { year: parseInt(yearValue) };
                  
                  // Add all country fields
                  config.yearFields.forEach(field => {
                    yearData[field] = parseInt(row[field]) || 0;
                  });
                  
                  console.log('getChartData: Processing year row:', { yearValue, yearData });
                  return yearData;
                });
                
                console.log('getChartData: Year-based trends result (direct processing):', {
                  dataLength: trendsData?.length || 0,
                  sampleData: trendsData?.slice(0, 2),
                  datasetType: datasetType,
                  allData: trendsData
                });
                return trendsData;
              }
            } else {
              // Category-based dataset (education, age, occupation) - show composition or trends
              console.log('getChartData: Processing category-based trends', {
                datasetType,
                keyField: config.keyField
              });
              
              // 🎯 OCCUPATION SPECIAL HANDLING: Always return trends data for occupation
              if (datasetType === 'occupation') {
                console.log('🏢 getChartData: OCCUPATION - Always returning trends data');
                const trendsData = csvService.getDataForTrends();
                console.log('🏢 getChartData: OCCUPATION trends result:', {
                  dataLength: trendsData?.length || 0,
                  sampleData: trendsData?.slice(0, 2),
                  dataKeys: trendsData?.length > 0 ? Object.keys(trendsData[0]) : []
                });
                return trendsData;
              }
              
              if (selectedYear) {
                // For other trends with selected year, show composition (pie chart)
                console.log('getChartData: Getting composition data for trends + selectedYear:', selectedYear);
                const comparisonData = csvService.getDataForComparison(selectedYear);
                console.log('getChartData: Trends+Year composition result:', {
                  selectedYear,
                  dataLength: comparisonData?.length || 0,
                  sampleData: comparisonData?.slice(0, 3)
                });
                return comparisonData;
              } else {
                // For trends without selected year, show time series
                const trendsData = csvService.getDataForTrends();
                console.log('getChartData: Category-based trends time series result:', {
                  dataLength: trendsData?.length || 0,
                  sampleData: trendsData?.slice(0, 2),
                  datasetType: datasetType,
                  keyField: config.keyField
                });
                return trendsData;
              }
            }
          case 'comparison':
            console.log('getChartData: Getting comparison data for year:', selectedYear);
            const comparisonData = csvService.getDataForComparison(selectedYear);
            console.log('getChartData: Comparison data result:', {
              selectedYear,
              dataLength: comparisonData?.length || 0,
              sampleData: comparisonData?.slice(0, 3),
              datasetType: datasetType
            });
            return comparisonData;
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
  const chartData = useMemo(() => {
    console.log('📊 chartData useMemo called with:', {
      dataLength: data.length,
      selectedYear,
      chartType: config.chartType,
      datasetType
    });
    
    const result = getChartData();
    console.log('📊 chartData useMemo result:', {
      resultType: Array.isArray(result) ? 'array' : typeof result,
      resultLength: Array.isArray(result) ? result.length : 'N/A',
      firstItem: Array.isArray(result) ? result[0] : result,
      sampleItems: Array.isArray(result) ? result.slice(0, 3) : 'Not array'
    });
    
    return result;
  }, [data, selectedYear, config.chartType]);
  
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

  const availableYears = (() => {
    if (config.keyField === 'YEAR') {
      // For year-based datasets, extract years from the actual data
      if (data.length > 0) {
        const years = data
          .map(row => parseInt(row.year || row.YEAR))
          .filter(year => !isNaN(year) && year >= 1900 && year <= 2030)
          .sort((a, b) => a - b);
        
        if (years.length > 0) {
          return years;
        }
      }
      
      // Fallback: For destination dataset, use known year range
      if (datasetType === 'destination') {
        return Array.from({ length: 40 }, (_, i) => 1981 + i); // 1981-2020
      }
      
      // For other year-based datasets, try to get from csvService
      return csvService ? csvService.getAvailableYears() : [];
    }
    
    // For category-based datasets, return configured year fields as integers
    return csvService ? csvService.getAvailableYears() : [];
  })();

  console.log('UniversalChart Debug:', {
    datasetType,
    dataLength: data.length,
    chartType: config.chartType,
    chartDataLength: Array.isArray(chartData) ? chartData.length : (chartData ? 'object' : 0),
    sampleData: data.slice(0, 2),
    sampleChartData: Array.isArray(chartData) ? chartData.slice(0, 2) : (chartData ? 'hierarchical object' : null),
    configKeyField: config.keyField,
    configYearFields: config.yearFields?.slice(0, 3) || [],
    availableYearsLength: availableYears.length,
    sampleAvailableYears: availableYears.slice(0, 5),
    selectedYear: selectedYear
  });
  const fieldNames = csvService ? csvService.getFieldNames() : { keyField: '', displayName: '', yearFields: [] };

  const allRecords = getAllRecords();
  
  // Filter records based on search term
  const filteredRecords = allRecords.filter(record => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    // Search in category/name field
    if (record.category && record.category.toLowerCase().includes(searchLower)) {
      return true;
    }
    
    // Search in year
    if (record.year && record.year.toString().includes(searchTerm)) {
      return true;
    }
    
    // Search in count
    if (record.count && record.count.toString().includes(searchTerm)) {
      return true;
    }
    
    return false;
  });
  
  const totalRecords = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));
  
  // Get current page records from filtered results
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = filteredRecords.slice(startIndex, endIndex);

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
    } else if (chartType === 'scatter') {
      return `Sex Relationship Analysis - Scatter Plot`;
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
    console.log('🎨 renderChart called with:', {
      chartDataExists: !!chartData,
      chartDataLength: chartData?.length || 0,
      chartDataType: Array.isArray(chartData) ? 'array' : typeof chartData,
      sampleChartData: Array.isArray(chartData) ? chartData.slice(0, 2) : chartData,
      configChartType: config.chartType,
      selectedYear,
      datasetType
    });
    
    if (!chartData || chartData.length === 0) {
      console.log('❌ No chart data available:', {
        chartData,
        dataLength: data.length,
        selectedYear,
        chartType: config.chartType
      });
      
      // TEMPORARY: Add test data for destination chart to verify rendering works
      if (datasetType === 'destination' && data.length > 0) {
        console.log('🧪 TESTING: Creating test pie chart data for destination');
        const testData = [
          { name: 'USA', value: 40307 },
          { name: 'CANADA', value: 5226 },
          { name: 'JAPAN', value: 254 },
          { name: 'AUSTRALIA', value: 2752 }
        ];
        console.log('🧪 TESTING: Test data created:', testData);
        
        // Render test pie chart
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                TEST: Destination Country Distribution for 2015
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                This is test data to verify chart rendering works
              </p>
            </div>
            <ResponsiveContainer width="100%" height={500}>
              <PieChart>
                <Pie
                  data={testData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => percent > 0.03 ? `${name}: ${(percent * 100).toFixed(1)}%` : ''}
                  outerRadius={180}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                >
                  {testData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => [value.toLocaleString(), name]}
                  labelFormatter={() => 'Emigrants'}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );
      }
      
      return (
        <div className="h-96 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <p className="text-lg mb-2">No data available</p>
            <p className="text-sm">Upload a CSV file or adjust filters</p>
            <div className="mt-4 text-xs text-gray-400">
              Debug: Data length: {data.length}, Selected year: {selectedYear || 'None'}, Chart type: {config.chartType}
            </div>
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

    console.log('🎯 RENDER CHART - Dataset:', datasetType, 'Chart Type:', config.chartType, 'Key Field:', config.keyField);
    console.log('🎯 RENDER CHART - Chart Data Length:', Array.isArray(chartData) ? chartData.length : 'Not Array');
    console.log('🎯 RENDER CHART - Selected Year:', selectedYear);
    
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
          let categories = Object.keys(trendsData[0] || {}).filter(key => key !== 'year');
          
          // Sort age groups in logical order if this is age data
          if (config.predefinedOptions && config.keyField === 'AGE_GROUP') {
            categories = categories.sort((a, b) => {
              const orderA = config.predefinedOptions.indexOf(a);
              const orderB = config.predefinedOptions.indexOf(b);
              return orderA - orderB;
            });
          }
          
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
        // 📈📉 Trends - multi-line charts (Destination, Education, Occupation)
        console.log('Rendering trends chart:', {
          selectedYear,
          chartDataLength: chartData?.length,
          sampleChartData: chartData?.slice(0, 2),
          configKeyField: config.keyField,
          datasetType
        });
        
        // 🎯 OCCUPATION SPECIAL HANDLING: Always show multi-series line chart for occupation
        if (datasetType === 'occupation') {
          console.log('🏢 OCCUPATION: Rendering multi-series line chart');
          
          if (!chartData || chartData.length === 0) {
            return (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">No occupation data available. Please upload a CSV file.</p>
              </div>
            );
          }
          
          const dataKeys = Object.keys(chartData[0] || {}).filter(key => key !== 'year');
          console.log('🏢 OCCUPATION: Data keys found:', dataKeys);
          
          return (
            <div className="space-y-6">
              {/* 🎯 Key Insights Box for Occupation */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">📊 Key Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-white p-3 rounded border">
                    <span className="font-medium text-gray-700">Peak Categories:</span>
                    <p className="text-blue-600 mt-1">Professional, Service, & Production workers</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <span className="font-medium text-gray-700">Growth Trends:</span>
                    <p className="text-green-600 mt-1">Increasing professional emigration</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <span className="font-medium text-gray-700">Time Period:</span>
                    <p className="text-purple-600 mt-1">1981-2020 (40 years)</p>
                  </div>
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height={600}>
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 120 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="year" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fontSize: 11 }}
                    interval={0}
                  />
                  <YAxis 
                    tickFormatter={safeYAxisFormatter}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [value.toLocaleString(), name]}
                    labelFormatter={(label) => `Year: ${label}`}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #ccc',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom"
                    height={80}
                    content={(props) => {
                      const { payload } = props;
                      if (!payload || payload.length === 0) return null;
                      
                      return (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mt-4 px-4">
                          {payload.map((entry, index) => {
                            const itemName = entry.dataKey || entry.value || `Item ${index + 1}`;
                            const displayName = itemName.length > 15 
                              ? `${itemName.substring(0, 12)}...` 
                              : itemName;
                            
                            return (
                              <div key={`legend-${index}`} className="flex items-center gap-1 text-xs">
                                <div 
                                  className="w-3 h-3 rounded" 
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span 
                                  className="text-gray-700 cursor-help truncate" 
                                  title={itemName}
                                >
                                  {displayName}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }}
                  />
                  {dataKeys.slice(0, 14).map((key, index) => {
                    console.log('🏢 OCCUPATION: Creating Line for key:', key, 'index:', index);
                    return (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={2.5}
                        dot={false}
                        name={key}
                        connectNulls={false}
                        activeDot={{ r: 4, fill: COLORS[index % COLORS.length] }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          );
        }
        
        // 📊 For other datasets (destination, education), show pie chart for selected year
        if (selectedYear) {
          console.log('Trends: Rendering pie chart for selected year:', selectedYear);
          console.log('Pie chart data structure:', chartData);
          console.log('Sample pie chart data items:', chartData.slice(0, 3));
          
          // CRITICAL FIX: If we're getting year records instead of composition data, fix it here
          if (datasetType === 'destination' && chartData.length > 0 && chartData[0].year && chartData[0].USA !== undefined) {
            console.log('🔧 FIXING: Chart data contains year records instead of composition data');
            console.log('🔧 Creating composition data from year records');
            
            // Find the specific year row
            const yearRow = chartData.find(item => item.year?.toString() === selectedYear.toString());
            console.log('🔧 Found year row:', yearRow);
            
            if (yearRow) {
              const fixedPieData = config.yearFields.map(country => ({
                name: country,
                category: country,
                value: parseInt(yearRow[country]) || 0
              })).filter(item => item.value > 0);
              
              console.log('🔧 Fixed pie data:', fixedPieData);
              
              return (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {config.displayName} Distribution for {selectedYear}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Breakdown of {config.displayName.toLowerCase()} categories in {selectedYear}
                    </p>
                  </div>
                  <ResponsiveContainer width="100%" height={500}>
                    <PieChart>
                      <Pie
                        data={fixedPieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => percent > 0.03 ? `${name}: ${(percent * 100).toFixed(1)}%` : ''}
                        outerRadius={180}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                      >
                        {fixedPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name) => [value.toLocaleString(), name]}
                        labelFormatter={() => `Emigrants to ${selectedYear}`}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              );
            }
          }
          
          // Ensure data has proper name field for pie chart labels
          const pieData = Array.isArray(chartData) ? chartData.map((item, index) => {
            console.log('[UniversalChart] Processing pie data item:', item);
            console.log('[UniversalChart] Item properties:', Object.keys(item));
            console.log('[UniversalChart] Item.name:', item.name, 'Item.category:', item.category);
            console.log('[UniversalChart] Full item values:', Object.entries(item));
            
            const name = item.name || item.category || item.educationLevel || `Category ${index + 1}`;
            console.log('[UniversalChart] Resolved name for pie item:', name);
            return {
              name: name,
              value: item.value || item.count || 0,
              ...item
            };
          }) : [];
          
          console.log('Processed pie data:', pieData);
          
          // Show composition for selected year using pie chart
          return (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {config.displayName} Distribution for {selectedYear}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Breakdown of {config.displayName.toLowerCase()} categories in {selectedYear}
                </p>
              </div>
              <ResponsiveContainer width="100%" height={500}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => percent > 0.03 ? `${name}: ${(percent * 100).toFixed(1)}%` : ''}
                    outerRadius={180}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => {
                      const total = pieData.reduce((sum, item) => sum + item.value, 0);
                      const percentage = ((value / total) * 100).toFixed(1);
                      return [
                        `${value.toLocaleString()} emigrants (${percentage}%)`,
                        name
                      ];
                    }}
                    labelFormatter={(label) => `${label} (${selectedYear})`}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #ccc',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  />
                  <Legend 
                    formatter={(value) => value}
                    wrapperStyle={{ paddingTop: '20px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          );
        } else {
          // For category-based data (Education levels, Destination countries, Age groups)
          console.log('Trends category-based debug:', {
            datasetType,
            keyField: config.keyField,
            chartDataKeys: Object.keys(chartData[0] || {}),
            firstDataPoint: chartData[0],
            chartDataLength: chartData.length
          });
          
          if (!chartData || chartData.length === 0) {
            return (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">No {config.displayName.toLowerCase()} data available. Please upload a CSV file.</p>
              </div>
            );
          }
          
          const dataKeys = Object.keys(chartData[0] || {}).filter(key => key !== 'year');
          console.log('Trends category-based keys found:', dataKeys);
          
          return (
            <ResponsiveContainer width="100%" height={500}>
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="year" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tickFormatter={safeYAxisFormatter} />
                <Tooltip 
                  formatter={(value, name) => [value.toLocaleString(), name]}
                  labelFormatter={(label) => `Year: ${label}`}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  content={(props) => {
                    const { payload } = props;
                    console.log('Legend payload debug:', payload);
                    if (!payload || payload.length === 0) return null;
                    
                    return (
                      <div className="flex flex-wrap justify-center gap-4 mt-4">
                        {payload.map((entry, index) => {
                          const itemName = entry.dataKey || entry.value || `Item ${index + 1}`;
                          const displayName = itemName.length > 20 
                            ? `${itemName.substring(0, 17)}...` 
                            : itemName;
                          
                          return (
                            <div key={`legend-${index}`} className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded" 
                                style={{ backgroundColor: entry.color }}
                              />
                              <span 
                                className="text-sm text-gray-700 cursor-help" 
                                title={itemName}
                              >
                                {displayName}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }}
                />
                {dataKeys.slice(0, 8).map((key, index) => {
                  console.log('Creating Line for key:', key, 'index:', index);
                  return (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      name={key}
                      connectNulls={false}
                    />
                  );
                })}
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

        // Process data to convert counts to percentages with validation
        const processedPercentData = chartData.map((row, index) => {
          const year = parseInt(row.year || row.YEAR);
          
          // Debug the first few rows to see data structure
          if (index < 3) {
            console.log(`🔍 Civil Status Row ${index}:`, {
              row,
              yearValue: row.year,
              YEARValue: row.YEAR,
              parsedYear: year,
              allKeys: Object.keys(row)
            });
          }
          
          // Skip invalid year data
          if (!year || isNaN(year) || year < 1980 || year > 2025) {
            console.warn('❌ Invalid year data in stackedAreaPercent:', {
              index,
              row,
              yearValue: row.year,
              YEARValue: row.YEAR,
              parsedYear: year,
              isNaN: isNaN(year),
              tooOld: year < 1980,
              tooNew: year > 2025,
              reason: !year ? 'no year value' : isNaN(year) ? 'year is NaN' : year < 1980 ? 'year too old' : 'year too new',
              allKeys: Object.keys(row),
              rowEntries: Object.entries(row)
            });
            return null;
          }
          
          const processedRow = { year: year };
          
          // Calculate total for this year
          let yearTotal = 0;
          config.yearFields.forEach(field => {
            const value = parseInt(row[field]) || 0;
            yearTotal += value;
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
        }).filter(row => row !== null) // Remove invalid rows
          .sort((a, b) => a.year - b.year);

        // Validate that we have valid data
        if (processedPercentData.length === 0) {
          return <div className="text-center text-gray-500 p-8">No valid civil status data available</div>;
        }

        const dataKeys = config.yearFields || Object.keys(processedPercentData[0] || {}).filter(key => key !== 'year');
        
        console.log('Civil Status Debug:', {
          rawData: chartData.slice(0, 2),
          processedData: processedPercentData.slice(0, 2),
          dataKeys: dataKeys,
          configYearFields: config.yearFields
        });
        
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
                  formatter={(value, name, props) => {
                    // Get the original count from raw data for this year and category
                    const yearData = chartData.find(row => parseInt(row.year || row.YEAR) === props.payload.year);
                    const originalCount = yearData ? (parseInt(yearData[name]) || 0) : 0;
                    
                    return [
                      `${originalCount.toLocaleString()} emigrants (${value.toFixed(1)}%)`,
                      name
                    ];
                  }}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dataKeys.map((status, index) => {
                  // Calculate average percentage across all years
                  const avgPercentage = processedPercentData.reduce((sum, row) => sum + (row[status] || 0), 0) / processedPercentData.length;
                  
                  // Calculate total emigrants for this status across all years
                  const totalEmigrants = chartData.reduce((sum, row) => sum + (parseInt(row[status]) || 0), 0);
                  
                  return (
                    <div key={status} className="flex items-center gap-3 bg-white p-3 rounded border">
                      <div 
                        className="w-4 h-4 rounded flex-shrink-0" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 text-sm">{status}</div>
                        <div className="text-xs text-gray-600">
                          <div>{totalEmigrants.toLocaleString()} emigrants</div>
                          <div>Avg: {avgPercentage.toFixed(1)}%</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Overall totals */}
              <div className="mt-4 pt-3 border-t border-blue-200">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-800">
                    Total Emigrants (1988-2020): {' '}
                    {chartData.reduce((sum, row) => {
                      return sum + dataKeys.reduce((yearSum, key) => yearSum + (parseInt(row[key]) || 0), 0);
                    }, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Across all civil status categories and years
                  </div>
                </div>
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
          <div className="space-y-4">
            {selectedYear && (
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Global Destinations for {selectedYear}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Top destination countries in {selectedYear}
                </p>
              </div>
            )}
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
                <YAxis tickFormatter={(value) => value === 0 ? '0' : value > 999 ? `${(value / 1000).toFixed(0)}K` : value.toString()} />
                <Tooltip 
                  formatter={(value) => [value.toLocaleString(), 'Emigrants']}
                />
                <Bar dataKey="value" fill="#00C49F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case 'groupedBar':
        // 📊 Comparison - Grouped bar chart for Region of Origin data
        // X-axis: Region, Y-axis: Count, Grouped by Year
        if (!Array.isArray(chartData) || chartData.length === 0) {
          return <div className="text-center text-gray-500 p-8">No data available for grouped bar chart</div>;
        }

        if (selectedYear) {
          // Show single year comparison using simple bar chart
          return (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Regional Origin of Emigrants for {selectedYear}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Comparison of emigrant counts by region of origin in {selectedYear}
                </p>
              </div>
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="category" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    fontSize={10}
                  />
                  <YAxis tickFormatter={(value) => value === 0 ? '0' : value > 999 ? `${(value / 1000).toFixed(0)}K` : value.toString()} />
                  <Tooltip 
                    formatter={(value) => [value.toLocaleString(), 'Emigrants']}
                    labelFormatter={(label) => `Region: ${label}`}
                  />
                  <Bar dataKey="value" fill="#00C49F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          );
        } else {
          // Get all years for grouping - show grouped comparison across years
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
                    tickFormatter={(value) => value === 0 ? '0' : value > 999 ? `${(value / 1000).toFixed(0)}K` : value.toString()}
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
        }

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
        if (selectedYear) {
          // Show composition for selected year using pie chart
          return (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {config.displayName} Distribution for {selectedYear}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Breakdown of {config.displayName.toLowerCase()} in {selectedYear}
                </p>
              </div>
              <ResponsiveContainer width="100%" height={500}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => percent > 0.03 ? `${name}: ${(percent * 100).toFixed(1)}%` : ''}
                    outerRadius={180}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [value.toLocaleString(), 'Emigrants']}
                    labelFormatter={(label) => `${label} (${selectedYear})`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          );
        } else if (config.keyField === 'YEAR') {
          const dataKeys = Object.keys(chartData[0] || {}).filter(key => key !== 'year');
          return (
            <ResponsiveContainer width="100%" height={500}>
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(value) => value === 0 ? '0' : value > 999 ? `${(value / 1000).toFixed(0)}K` : value.toString()} />
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
        if (selectedYear) {
          // Show composition for selected year using pie chart
          return (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {config.displayName} Distribution for {selectedYear}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Composition breakdown in {selectedYear}
                </p>
              </div>
              <ResponsiveContainer width="100%" height={500}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => percent > 0.03 ? `${name}: ${(percent * 100).toFixed(1)}%` : ''}
                    outerRadius={180}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [value.toLocaleString(), 'Emigrants']}
                    labelFormatter={(label) => `${label} (${selectedYear})`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          );
        } else if (config.keyField === 'YEAR') {
          // For datasets where year is the key (Destination)
          const dataKeys = Object.keys(chartData[0] || {}).filter(key => key !== 'year');
          return (
            <ResponsiveContainer width="100%" height={500}>
              <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(value) => value === 0 ? '0' : value > 999 ? `${(value / 1000).toFixed(0)}K` : value.toString()} />
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
                <YAxis tickFormatter={(value) => value === 0 ? '0' : value > 999 ? `${(value / 1000).toFixed(0)}K` : value.toString()} />
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
        if (selectedYear) {
          // Show composition for selected year using pie chart
          return (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {config.displayName} Distribution for {selectedYear}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Category breakdown in {selectedYear}
                </p>
              </div>
              <ResponsiveContainer width="100%" height={500}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => percent > 0.03 ? `${name}: ${(percent * 100).toFixed(1)}%` : ''}
                    outerRadius={180}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [value.toLocaleString(), 'Emigrants']}
                    labelFormatter={(label) => `${label} (${selectedYear})`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          );
        } else if (config.keyField === 'YEAR') {
          const dataKeys = Object.keys(chartData[0] || {}).filter(key => key !== 'year');
          return (
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(value) => value === 0 ? '0' : value > 999 ? `${(value / 1000).toFixed(0)}K` : value.toString()} />
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
                <YAxis tickFormatter={(value) => value === 0 ? '0' : value > 999 ? `${(value / 1000).toFixed(0)}K` : value.toString()} />
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
                <YAxis tickFormatter={(value) => value === 0 ? '0' : value > 999 ? `${(value / 1000).toFixed(0)}K` : value.toString()} />
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
                <YAxis tickFormatter={(value) => value === 0 ? '0' : value > 999 ? `${(value / 1000).toFixed(0)}K` : value.toString()} />
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
        console.log('🔥 TRENDS CASE EXECUTED - Chart Type:', config.chartType, 'Key Field:', config.keyField);
        console.log('🔥 ChartData:', chartData);
        // Line chart showing trends over time (Education, Occupation, Total)
        if (config.keyField === 'YEAR') {
          // Simple line chart for total data
          return (
            <ResponsiveContainer width="100%" height={500}>
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(value) => value === 0 ? '0' : value > 999 ? `${(value / 1000).toFixed(0)}K` : value.toString()} />
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#0088FE" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          );
        } else {
          // Multi-line chart for categorical data (e.g., occupation levels over time)
          let dataKeys = Object.keys(chartData[0] || {}).filter(key => key !== 'year');
          
          // Sort occupation categories in predefined order if this is occupation data
          if (config.predefinedOptions && config.keyField === 'Occupation') {
            dataKeys = dataKeys.sort((a, b) => {
              const orderA = config.predefinedOptions.indexOf(a);
              const orderB = config.predefinedOptions.indexOf(b);
              return orderA - orderB;
            });
          }
          
          // Special styling for occupation data
          const isOccupationData = config.keyField === 'Occupation';
          const keyCategories = ['Students', 'Housewives', "Prof'l", 'No Occupation Reported'];
          
          return (
            <div className="space-y-4">
              {/* Enhanced title and description for occupation trends */}
              {isOccupationData && (
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    Trends in Emigrant Occupations (1981–2020)
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Each line represents the number of emigrants by occupation category over time
                  </p>
                </div>
              )}
              
              <ResponsiveContainer width="100%" height={600}>
                <LineChart 
                  data={chartData} 
                  margin={{ top: 20, right: 120, left: 60, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="year" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => value % 5 === 0 ? value : ''}
                    label={{ 
                      value: 'Year', 
                      position: 'insideBottom', 
                      offset: -5,
                      style: { textAnchor: 'middle', fontWeight: 'bold' }
                    }}
                  />
                  <YAxis 
                    tickFormatter={(value) => value === 0 ? '0' : value > 999 ? `${(value / 1000).toFixed(0)}K` : value.toString()}
                    tick={{ fontSize: 12 }}
                    label={{ 
                      value: 'Number of Emigrants', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle', fontWeight: 'bold' }
                    }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [value.toLocaleString(), name]}
                    labelFormatter={(label) => `Year: ${label}`}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #ccc',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                  />
                  <Legend 
                    verticalAlign="middle"
                    align="right"
                    layout="vertical"
                    wrapperStyle={{ 
                      paddingLeft: '20px',
                      fontSize: '11px'
                    }}
                    iconType="line"
                  />
                  {dataKeys.map((key, index) => {
                    const isKeyCategory = keyCategories.includes(key);
                    const strokeWidth = isKeyCategory ? 3 : 2;
                    const strokeDasharray = isKeyCategory ? "0" : "0";
                    
                    return (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={strokeWidth}
                        strokeDasharray={strokeDasharray}
                        dot={false}
                        activeDot={{ r: 4, stroke: COLORS[index % COLORS.length], strokeWidth: 2 }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
              
              {/* Key insights for occupation data */}
              {isOccupationData && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Key Insights:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• <strong>Students</strong> consistently represent the largest group of emigrants</li>
                    <li>• <strong>Housewives</strong> show steady numbers throughout the period</li>
                    <li>• <strong>Professional</strong> emigration peaked in the mid-2000s</li>
                    <li>• <strong>Armed Forces</strong> emigration declined sharply after the 1980s</li>
                  </ul>
                </div>
              )}
            </div>
          );
        }

      case 'comparison':
        // Grouped bar chart for comparing destinations/major countries
        return (
          <div className="space-y-4">
            {selectedYear && (
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {config.displayName} Comparison for {selectedYear}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Ranking and comparison of {config.displayName.toLowerCase()} in {selectedYear}
                </p>
              </div>
            )}
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                <YAxis tickFormatter={(value) => value === 0 ? '0' : value > 999 ? `${(value / 1000).toFixed(0)}K` : value.toString()} />
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Bar dataKey="value" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </div>
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
                <YAxis tickFormatter={(value) => value === 0 ? '0' : value > 999 ? `${(value / 1000).toFixed(0)}K` : value.toString()} />
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

      case 'scatter':
        // 📊 Scatter plot for gender distribution - Male vs Female emigrants
        if (!Array.isArray(chartData) || chartData.length === 0) {
          return <div className="text-center text-gray-500 p-8">No data available for scatter plot</div>;
        }

        // Find max values for axis scaling
        const maxMale = Math.max(...chartData.map(d => d.male));
        const maxFemale = Math.max(...chartData.map(d => d.female));
        const scatterMaxValue = Math.max(maxMale, maxFemale);
        const axisMax = Math.ceil(scatterMaxValue * 1.1); // Add 10% padding

        // Create reference line data for y = x diagonal
        const referenceLineData = [
          { male: 0, female: 0 },
          { male: axisMax, female: axisMax }
        ];

        // Group data by decade for legend
        const decadeGroups = {};
        chartData.forEach(point => {
          if (!decadeGroups[point.decade]) {
            decadeGroups[point.decade] = [];
          }
          decadeGroups[point.decade].push(point);
        });

        // Debug: Log decade groups to see what's in each group
        console.log('🔍 Decade groups:', Object.keys(decadeGroups).map(decade => ({
          decade,
          count: decadeGroups[decade].length,
          years: decadeGroups[decade].map(p => p.year).sort((a, b) => a - b),
          samplePoint: decadeGroups[decade][0]
        })));

        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Relationship Between Male and Female Emigrants (1981–2020)
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Each point represents one year; diagonal line shows gender parity
              </p>
            </div>
            
            <ResponsiveContainer width="100%" height={600}>
              <ScatterChart 
                key={`scatter-${chartData.length}-${JSON.stringify(chartData.slice(0, 2))}`} // Force re-render when data changes
                margin={{ top: 20, right: 30, left: 60, bottom: 60 }}
                data={chartData}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                
                {/* Diagonal reference line for gender parity */}
                <ReferenceLine 
                  segment={[
                    { x: 0, y: 0 },
                    { x: axisMax, y: axisMax }
                  ]}
                  stroke="#999999"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
                
                {/* X-axis for Male emigrants */}
                <XAxis 
                  type="number"
                  dataKey="male"
                  name="Male Emigrants"
                  domain={[0, axisMax]}
                  tickFormatter={(value) => value === 0 ? '0' : value > 999 ? `${(value / 1000).toFixed(0)}K` : value.toString()}
                  label={{ 
                    value: 'Male Emigrants', 
                    position: 'insideBottom', 
                    offset: -10,
                    style: { textAnchor: 'middle', fontWeight: 'bold' }
                  }}
                />
                
                {/* Y-axis for Female emigrants */}
                <YAxis 
                  type="number"
                  dataKey="female"
                  name="Female Emigrants"
                  domain={[0, axisMax]}
                  tickFormatter={(value) => value === 0 ? '0' : value > 999 ? `${(value / 1000).toFixed(0)}K` : value.toString()}
                  label={{ 
                    value: 'Female Emigrants', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fontWeight: 'bold' }
                  }}
                />
                
                {/* Custom tooltip */}
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0].payload;
                      
                      // Debug: Log tooltip data to see what's being displayed
                      console.log('🔍 Tooltip data:', { 
                        year: data.year, 
                        decade: data.decade, 
                        decadeColor: data.decadeColor,
                        fullPayload: data 
                      });
                      
                      return (
                        <div style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #ccc',
                          borderRadius: '6px',
                          padding: '12px',
                          fontSize: '14px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}>
                          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#333' }}>
                            Year: {data.year} ({data.decade})
                          </p>
                          <p style={{ margin: '0 0 4px 0', color: '#666' }}>
                            Male Emigrants: {data.male.toLocaleString()}
                          </p>
                          <p style={{ margin: '0 0 4px 0', color: '#666' }}>
                            Female Emigrants: {data.female.toLocaleString()}
                          </p>
                          <p style={{ margin: '0', color: '#888', fontSize: '12px' }}>
                            Total: {(data.male + data.female).toLocaleString()}
                          </p>
                          <p style={{ margin: '4px 0 0 0', color: '#888', fontSize: '10px' }}>
                            Color: {data.decadeColor} | Expected: {data.decade}
                          </p>
                          {data.isPandemic && (
                            <p style={{ margin: '4px 0 0 0', color: '#ff4444', fontSize: '12px', fontWeight: 'bold' }}>
                              ⚠️ Pandemic Year
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                
                {/* We'll add the reference line via custom rendering */}
                
                {/* Add diagonal reference line using a custom approach */}
                {/* Since Recharts doesn't easily support y=x diagonal lines in scatter plots, */}
                {/* we'll add it through the background or via a custom component */}
                
                {/* Single scatter component with custom coloring */}
                <Scatter
                  name="Gender Distribution"
                  data={chartData}
                  shape={(props) => {
                    const { cx, cy, payload } = props;
                    
                    // Debug: Log what payload we're getting for each point
                    if (payload.year === 2001 || payload.year === 2004) {
                      console.log('🚨 Suspicious point:', { 
                        cx, cy, 
                        year: payload.year, 
                        decade: payload.decade, 
                        color: payload.decadeColor,
                        fullPayload: payload 
                      });
                    }
                    
                    const radius = payload.isPandemic ? 8 : 6; // Larger for 2020
                    const strokeWidth = payload.isPandemic ? 3 : 1;
                    
                    return (
                      <circle 
                        cx={cx} 
                        cy={cy} 
                        r={radius}
                        fill={payload.decadeColor}
                        fillOpacity={0.8}
                        stroke={payload.decadeColor}
                        strokeWidth={strokeWidth}
                      />
                    );
                  }}
                />
                
                {/* Custom legend */}
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
              </ScatterChart>
            </ResponsiveContainer>
            
            {/* Analysis summary */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-3">Analysis Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">Key Insights:</h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Points above diagonal line indicate more female emigrants</li>
                    <li>• Consistent female majority across all decades</li>
                    <li>• 2020 shows significant drop (marked with larger circle)</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">Decade Color Coding:</h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(decadeGroups).map(([decade, points]) => (
                      <div key={decade} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: points[0]?.decadeColor }}
                        ></div>
                        <span className="text-gray-600">{decade}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'geographic':
        // For now, use bar chart for regional data (can be enhanced with actual maps later)
        return (
          <div className="space-y-4">
            {selectedYear && (
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Geographic Distribution for {selectedYear}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Regional breakdown of emigrants in {selectedYear}
                </p>
              </div>
            )}
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                <YAxis tickFormatter={(value) => value === 0 ? '0' : value > 999 ? `${(value / 1000).toFixed(0)}K` : value.toString()} />
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Bar dataKey="value" fill="#FFBB28" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case 'relationships':
        // Bubble chart or scatter plot for occupation relationships
        return (
          <ResponsiveContainer width="100%" height={500}>
            <ScatterChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" name="Category" />
              <YAxis dataKey="value" name="Count" tickFormatter={(value) => value === 0 ? '0' : value > 999 ? `${(value / 1000).toFixed(0)}K` : value.toString()} />
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

        {/* Year selector for chart types that need year-specific analysis (exclude scatter, stackedAreaPercent, and occupation) */}
        {availableYears.length > 0 && config.chartType !== 'scatter' && config.chartType !== 'stackedAreaPercent' && datasetType !== 'occupation' && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Year Selection</h3>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select year for data analysis:
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedYear || availableYears[availableYears.length - 1] || ''}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-md px-4 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {!selectedYear && (
                      <option value="">Choose a year...</option>
                    )}
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

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
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            {config.purpose} visualization showing {config.displayName.toLowerCase()} data{config.chartType === 'scatter' || config.chartType === 'stackedAreaPercent' ? ' across all years' : ' for the selected year'}.
          </p>
          {/* Only show year selection status for charts that require year selection */}
          {config.chartType !== 'scatter' && config.chartType !== 'stackedAreaPercent' && (
            selectedYear ? (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong> Current View:</strong> Showing detailed breakdown for <strong>{selectedYear}</strong>. 
                  Use the year selector above to analyze different years.
                </p>
              </div>
            ) : (
              <div className="p-3 ">
                
              </div>
            )
          )}
        </div>
        {renderChart()}
      </div>

      {/* Simplified CRUD Interface */}
      <div className="bg-white p-5 rounded-lg shadow-sm">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Data Management</h3>
        
        {/* Search Bar */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Records
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder={`Search by ${config.displayName.toLowerCase()}, year, or count...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="mt-1 text-sm text-gray-500">
              Found {totalRecords} record{totalRecords === 1 ? '' : 's'} matching "{searchTerm}"
            </p>
          )}
        </div>
          
          {/* Add/Edit form */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-3">
              {editingRecord ? 'Edit Record' : `Add New ${config.displayName} Record`}
            </h4>
            
            {/* Special form for sex dataset */}
            {datasetType === 'sex' ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
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

                {/* Male Count Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Male Count</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Enter male count"
                    value={simpleForm.male || ''}
                    onChange={(e) => setSimpleForm({...simpleForm, male: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Female Count Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Female Count</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Enter female count"
                    value={simpleForm.female || ''}
                    onChange={(e) => setSimpleForm({...simpleForm, female: e.target.value})}
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
                          setSimpleForm(datasetType === 'sex' ? 
                            { year: '', male: '', female: '' } : 
                            { category: '', year: '', count: '' }
                          );
                        }}
                        className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        console.log('🚀 ADD BUTTON CLICKED (SEX FORM)', { datasetType, simpleForm });
                        addSimpleRecord();
                      }}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      Add
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Default form for other datasets */
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
                      {config.predefinedOptions.map((option, index) => (
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
                          setSimpleForm(datasetType === 'sex' ? 
                            { year: '', male: '', female: '' } : 
                            { category: '', year: '', count: '' }
                          );
                        }}
                        className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🚀 ADD BUTTON CLICKED (DEFAULT FORM)', { datasetType, simpleForm });
                        console.log('🔥 BUTTON CLICK EVENT FIRED');
                        try {
                          addSimpleRecord();
                        } catch (error) {
                          console.error('❌ ERROR calling addSimpleRecord:', error);
                        }
                      }}
                      type="button"
                      className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      Add
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Danger Zone - Delete All Data */}
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Danger Zone
            </h4>
            <p className="text-sm text-red-700 mb-3">
              This will permanently delete all records in the {config.displayName} dataset. This action cannot be undone.
            </p>
            <button
              onClick={deleteAllData}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete All Data
            </button>
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

                  <span className="px-3 py-1 text-sm mx-2">
                    Page {currentPage} of {totalPages}
                  </span>

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
                            if (datasetType === 'sex') {
                              setEditingRecord({ year: record.year });
                              setSimpleForm({ 
                                year: record.year, 
                                male: record.male.toString(),
                                female: record.female.toString()
                              });
                            } else {
                              setEditingRecord({ category: record.category, year: record.year });
                              setSimpleForm({ 
                                category: record.category, 
                                year: record.year, 
                                count: record.count.toString() 
                              });
                            }
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                          title="Edit record"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => {
                            console.log('🗑️ DELETE BUTTON CLICKED', { datasetType, record });
                            if (datasetType === 'sex') {
                              deleteSimpleRecord('', record.year);
                            } else {
                              deleteSimpleRecord(record.category, record.year);
                            }
                          }}
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
  const [tooltipData, setTooltipData] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(1800); // Default zoom level

  // Load our GeoJSON data from authoritative source
  useEffect(() => {
    const loadGeoData = async () => {
      try {
        setLoading(true);
        // Fetch complete Philippines provinces GeoJSON from macoymejia/geojsonph repo
        const url = 'https://raw.githubusercontent.com/macoymejia/geojsonph/master/Province/Provinces.json';
        console.log('Fetching complete Philippines provinces GeoJSON from:', url);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch geojson: ${res.status} ${res.statusText}`);
        const geoJson = await res.json();

        // Log a sane sample of property names to help debugging
        console.log(' Loaded remote GeoJSON data. Sample feature properties:',
          geoJson.features && geoJson.features.length > 0
            ? geoJson.features.slice(0,5).map(f => ({ id: f.id, props: f.properties }))
            : []
        );

        setGeoData(geoJson);
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

  // Get available years from data
  const availableYears = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return [];
    
    const firstRow = data[0];
    if (!firstRow) return [];
    
    return Object.keys(firstRow)
      .filter(key => /^\d{4}$/.test(key)) // Only year columns (4 digits)
      .sort((a, b) => parseInt(b) - parseInt(a)); // Most recent first
  }, [data]);

  // Set default year if none selected
  const effectiveYear = selectedYear || availableYears[0] || '2020';

  // Process data for visualization
  const processedData = useMemo(() => {
    console.log('🗺️ Processing choropleth data...');
    console.log('📊 Raw data sample:', data?.slice(0, 3));
    console.log('📅 Selected year:', selectedYear);
    console.log('🎯 Effective year:', effectiveYear);
    console.log('📆 Available years:', availableYears.slice(0, 5));
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log('⚠️ No data available for processing');
      return {};
    }

    const result = {};
    
    data.forEach((row, index) => {
      const provinceName = row.PROVINCE || row.province || row.Province;
      
      if (provinceName && row[effectiveYear] !== undefined) {
        const count = parseInt(row[effectiveYear]) || 0;
        const normalizedName = provinceName.toUpperCase().trim();
        
        result[normalizedName] = count;
        
        // Debug first few provinces
        if (index < 5) {
          console.log(`🏞️ Processing: "${provinceName}" → "${normalizedName}" = ${count} emigrants (${effectiveYear})`);
        }
      }
    });

    console.log('📈 Processed data summary:', { 
      provinces: Object.keys(result).length, 
      totalEmigrants: Object.values(result).reduce((sum, count) => sum + count, 0),
      sampleProvinces: Object.keys(result).slice(0, 10),
      top5Provinces: Object.entries(result)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => `${name}: ${count}`)
    });
    
    return result;
  }, [data, effectiveYear]);

  // Calculate global maximum across all years for consistent legend
  const globalMaxCount = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return 0;
    
    let maxValue = 0;
    data.forEach(row => {
      availableYears.forEach(year => {
        const count = parseInt(row[year]) || 0;
        if (count > maxValue) {
          maxValue = count;
        }
      });
    });
    
    console.log('🔄 Global max emigrant count across all years:', maxValue);
    return maxValue;
  }, [data, availableYears]);

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
    
    // Fixed range color system matching the legend
    if (count > 29000) {
      return '#000000'; // Black for extreme values (29,001+)
    } else if (count > 10000) {
      return 'rgb(195, 0, 0)'; // Dark red for 10,001-29,000
    } else if (count > 5000) {
      return 'rgb(255, 49, 49)'; // Medium-dark red for 5,001-10,000
    } else if (count > 2000) {
      return 'rgb(255, 98, 98)'; // Medium red for 2,001-5,000
    } else if (count > 500) {
      return 'rgb(255, 147, 147)'; // Light red for 501-2,000
    } else if (count >= 1) {
      return 'rgb(255, 200, 200)'; // Very light red for 1-500
    } else {
      return '#f0f0f0'; // No data
    }
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
    <div className="w-full h-[500px] relative border-2 border-blue-300 rounded-lg bg-blue-50">
      <div className="absolute top-2 left-2 text-sm bg-white px-2 py-1 rounded shadow z-20">
        Philippine Choropleth Map - {effectiveYear}
      </div>
      
      {/* Zoom Controls */}
      <div className="absolute top-2 right-2 flex flex-col gap-1 z-20">
        <button
          onClick={() => setZoomLevel(prev => Math.min(prev * 1.2, 4000))}
          className="bg-white hover:bg-gray-100 border border-gray-300 rounded px-2 py-1 text-sm font-bold"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => setZoomLevel(prev => Math.max(prev / 1.2, 800))}
          className="bg-white hover:bg-gray-100 border border-gray-300 rounded px-2 py-1 text-sm font-bold"
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={() => setZoomLevel(1800)}
          className="bg-white hover:bg-gray-100 border border-gray-300 rounded px-1 py-1 text-xs"
          title="Reset Zoom"
        >
          Reset
        </button>
      </div>

      {/* Color Legend */}
      {Object.keys(processedData).length > 0 && (
        <div className="absolute bottom-2 left-2 bg-white bg-opacity-90 p-2 rounded shadow z-20">
          <div className="text-xs font-semibold mb-1">Emigrants ({effectiveYear})</div>
          <div className="flex flex-col gap-1">
            {(() => {
              // Use global maximum for consistent legend across all years
              const maxCount = globalMaxCount;
              
              // Enhanced helper function to round to nice numbers for any scale
              const roundToNice = (num) => {
                if (num <= 0) return 0;
                if (num <= 100) return Math.ceil(num / 10) * 10; // Round to nearest 10
                if (num <= 1000) return Math.ceil(num / 50) * 50; // Round to nearest 50
                if (num <= 5000) return Math.ceil(num / 100) * 100; // Round to nearest 100
                if (num <= 10000) return Math.ceil(num / 250) * 250; // Round to nearest 250
                if (num <= 50000) return Math.ceil(num / 1000) * 1000; // Round to nearest 1K
                if (num <= 100000) return Math.ceil(num / 2500) * 2500; // Round to nearest 2.5K
                if (num <= 500000) return Math.ceil(num / 10000) * 10000; // Round to nearest 10K
                if (num <= 1000000) return Math.ceil(num / 25000) * 25000; // Round to nearest 25K
                return Math.ceil(num / 50000) * 50000; // Round to nearest 50K for very large numbers
              };

              // Fixed range system with reasonable first range and black for extreme values
              const createFixedRanges = (maxCount) => {
                // Always start with sensible ranges regardless of max
                const fixedRanges = [
                  { min: 1, max: 500, label: "1-500", color: "rgb(255, 200, 200)" },
                  { min: 501, max: 2000, label: "501-2,000", color: "rgb(255, 147, 147)" },
                  { min: 2001, max: 5000, label: "2,001-5,000", color: "rgb(255, 98, 98)" },
                  { min: 5001, max: 10000, label: "5,001-10,000", color: "rgb(255, 49, 49)" },
                  { min: 10001, max: 29000, label: "10,001-29,000", color: "rgb(195, 0, 0)" }
                ];

                // Add black range for extreme values if needed
                if (maxCount > 29000) {
                  fixedRanges.push({
                    min: 29001,
                    max: maxCount,
                    label: `29,001-${maxCount.toLocaleString()}+`,
                    color: "#000000"
                  });
                }

                return fixedRanges;
              };

              const fixedRanges = createFixedRanges(maxCount);
              
              // Debug logging
              console.log('🗺️📊 Fixed Range Legend:', {
                globalMaxCount: maxCount,
                ranges: fixedRanges.map(r => ({ label: r.label, color: r.color }))
              });

              const ranges = [
                { min: 0, max: 0, label: "No data", color: "#f0f0f0" },
                ...fixedRanges
              ];
              return ranges.map((range, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div 
                    className="w-3 h-3 border border-gray-400" 
                    style={{ backgroundColor: range.color }}
                  ></div>
                  <span className="text-xs">{range.label}</span>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
      
      <div 
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMousePosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
          });
        }}
        className="w-full h-full"
      >
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            center: [122, 12.5],
            scale: zoomLevel
          }}
          style={{ width: "100%", height: "100%" }}
          viewBox="0 0 800 600"
        >
        <Geographies geography={geoData}>
          {({ geographies }) => {
            console.log(`🗺️ Rendering ${geographies.length} provinces on map`);
            
            // Debug first few provinces to understand GeoJSON structure
            if (geographies.length > 0) {
              console.log('🔍 Sample GeoJSON properties:', geographies.slice(0, 3).map(geo => ({
                allProps: geo.properties,
                province: geo.properties?.PROVINCE,
                name1: geo.properties?.NAME_1
              })));
            }
            
            return geographies.map((geo, index) => {
              // Get province name from GeoJSON properties (macoymejia format uses 'PROVINCE' property)
              const provinceName = (
                geo.properties?.PROVINCE ||
                geo.properties?.NAME_1 ||
                geo.properties?.province ||
                geo.properties?.name ||
                ''
              );
              
              const normalizedProvinceName = provinceName?.toUpperCase()?.trim();
              const count = processedData[normalizedProvinceName] || 0;
              const color = getProvinceColor(provinceName);
              
              // Debug coloring for first few provinces
              if (index < 5) {
                console.log(`🏞️ Province ${index}: "${provinceName}" → "${normalizedProvinceName}" = ${count} emigrants → color: ${color}`);
              }
              
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={color}
                  stroke="#333"
                  strokeWidth={0.5}
                  style={{
                    default: { 
                      outline: "none",
                      cursor: "pointer"
                    },
                    hover: { 
                      outline: "none", 
                      stroke: "#000", 
                      strokeWidth: 2,
                      filter: "brightness(0.9)"
                    },
                    pressed: { 
                      outline: "none",
                      stroke: "#000", 
                      strokeWidth: 2 
                    }
                  }}
                  onMouseEnter={() => {
                    setTooltipData({
                      province: provinceName,
                      count: count.toLocaleString(),
                      year: effectiveYear
                    });
                  }}
                  onMouseLeave={() => {
                    setTooltipData(null);
                  }}
                />
              );
            });
          }}
        </Geographies>
      </ComposableMap>
      </div>
      
      {/* Cursor-following Tooltip */}
      {tooltipData && (
        <div 
          className="absolute bg-black bg-opacity-90 text-white p-2 rounded pointer-events-none z-30 text-sm"
          style={{ 
            left: mousePosition.x + 10, 
            top: mousePosition.y - 40,
            transform: mousePosition.x > 300 ? 'translateX(-100%)' : 'none'
          }}
        >
          <div className="font-semibold">{tooltipData.province}</div>
          <div>Year: {tooltipData.year}</div>
          <div>Emigrants: {tooltipData.count}</div>
        </div>
      )}
      
      {/* Debug info - positioned at top-left to avoid overlap */}
      {Object.keys(processedData).length > 0 && (
        <div className="absolute top-2 left-2 max-w-sm p-2 bg-white bg-opacity-95 rounded-lg text-xs text-gray-600 border border-gray-200 shadow-lg z-20 mt-12">
          <div className="space-y-1">
            <p className="truncate">
              <span className="font-medium">Provinces:</span> {Object.keys(processedData).length} in {effectiveYear}
              {effectiveYear !== selectedYear && <span className="text-gray-500"> (default)</span>}
            </p>
            <p className="truncate">
              <span className="font-medium">Total:</span> {Object.values(processedData).reduce((sum, count) => sum + count, 0).toLocaleString()}
            </p>
            <p className="truncate">
              <span className="font-medium">Max:</span> {Math.max(...Object.values(processedData)).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversalChart;
