import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Upload, Plus, Edit, Trash2, Download, FileText } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#d084d0', '#ffb347'];

const AgeChart = () => {
  const [ageData, setAgeData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState('trends'); // trends, comparison, composition
  const [selectedYear, setSelectedYear] = useState(null);
  const [showCrud, setShowCrud] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [newRow, setNewRow] = useState({});

  // Define available years (1981-2020)
  const availableYears = Array.from({ length: 40 }, (_, i) => 1981 + i);

  // Don't auto-load CSV on mount - start with empty data
  // User must upload CSV file manually

  // Function to parse CSV data
  const parseCSVData = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row = { ageGroup: values[0] };
      headers.slice(1).forEach((header, index) => {
        if (header.match(/^\d{4}$/)) {
          row[header] = parseInt(values[index + 1]) || 0;
        }
      });
      return row;
    }).filter(row => row.ageGroup && row.ageGroup !== '' && row.ageGroup !== 'Not Reported / No Response');
  };

  // Process data for trends chart (showing age groups over time)
  const processTrendsData = () => {
    if (!ageData || ageData.length === 0) return [];
    const years = Object.keys(ageData[0] || {}).filter(key => key !== 'ageGroup' && key.match(/^\d{4}$/));
    return years.map(year => {
      const yearData = { year: parseInt(year) };
      ageData.forEach(row => {
        yearData[row.ageGroup] = row[year] || 0;
      });
      return yearData;
    });
  };

  // Process data for comparison chart (comparing age groups for selected year)
  const processComparisonData = () => {
    if (!ageData || ageData.length === 0 || !selectedYear) return [];
    return ageData.map(row => ({
      ageGroup: row.ageGroup,
      count: row[selectedYear.toString()] || 0
    })).filter(item => item.count > 0);
  };

  // Process data for composition chart (pie chart of age distribution)
  const processCompositionData = () => {
    if (!ageData || ageData.length === 0 || !selectedYear) return [];
    return ageData.map(row => ({
      name: row.ageGroup,
      value: row[selectedYear.toString()] || 0
    })).filter(item => item.value > 0);
  };

  // Handle CSV file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setLoading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csvText = e.target.result;
          const processedData = parseCSVData(csvText);
          setAgeData(processedData);
          setLoading(false);
          alert(`Successfully loaded ${processedData.length} age groups from CSV!`);
        } catch (error) {
          console.error('Error parsing CSV:', error);
          alert('Error parsing CSV file. Please check the format.');
          setLoading(false);
        }
      };
      reader.readAsText(file);
    }
  };

  // Export data to CSV
  const exportToCSV = () => {
    const csvData = ageData.map(row => {
      const csvRow = { AGE_GROUP: row.ageGroup };
      Object.keys(row).forEach(key => {
        if (key !== 'ageGroup') {
          csvRow[key] = row[key];
        }
      });
      return csvRow;
    });
    
    // Create CSV string manually
    const headers = ['AGE_GROUP', ...Object.keys(ageData[0] || {}).filter(key => key !== 'ageGroup')];
    const csvRows = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => row[header] || '').join(','))
    ];
    const csv = csvRows.join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'emigrant-age-data.csv';
    a.click();
  };

  // Add new row
  const addRow = () => {
    if (!newRow.ageGroup || newRow.ageGroup.trim() === '') {
      alert('Please enter an age group name');
      return;
    }

    const newRowData = { ageGroup: newRow.ageGroup.trim() };
    
    // Add all years with values from form or default to 0
    availableYears.forEach(year => {
      newRowData[year.toString()] = parseInt(newRow[year.toString()]) || 0;
    });
    
    setAgeData([...ageData, newRowData]);
    setNewRow({});
    alert('Age group added successfully!');
  };

  // Delete row
  const deleteRow = (index) => {
    setAgeData(ageData.filter((_, i) => i !== index));
  };

  // Update row
  const updateRow = (index, updatedRow) => {
    const updated = [...ageData];
    updated[index] = updatedRow;
    setAgeData(updated);
    setEditingRow(null);
  };

  const trendsData = processTrendsData();
  const comparisonData = processComparisonData();
  const compositionData = processCompositionData();
  const years = ageData && ageData.length > 0 ? Object.keys(ageData[0] || {}).filter(key => key !== 'ageGroup' && key.match(/^\d{4}$/)) : [];

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-5 rounded-lg shadow-sm">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-gray-800 font-semibold text-lg">Processing CSV Data...</h3>
              <p className="text-gray-600 mt-2">
                Loading and parsing age distribution data
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state when no data is loaded
  const hasData = ageData && ageData.length > 0;

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="bg-white p-5 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Age Distribution Analysis</h2>
            <p className="text-sm text-gray-600 mt-1">
              {hasData ? `${ageData.length} age groups loaded` : 'No data loaded - Please upload a CSV file'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCrud(!showCrud)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <FileText size={16} />
              {showCrud ? 'Hide' : 'Show'} Data Management
            </button>
            {hasData && (
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
              >
                <Download size={16} />
                Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Chart type selector - only show if data exists */}
        {hasData && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setChartType('trends')}
              className={`px-4 py-2 rounded-md ${chartType === 'trends' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Trends Over Time
            </button>
            <button
              onClick={() => setChartType('comparison')}
              className={`px-4 py-2 rounded-md ${chartType === 'comparison' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Age Group Comparison
            </button>
            <button
              onClick={() => setChartType('composition')}
              className={`px-4 py-2 rounded-md ${chartType === 'composition' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Age Composition
            </button>
          </div>
        )}

        {/* Year selector for comparison and composition - only show if data exists */}
        {hasData && (chartType === 'comparison' || chartType === 'composition') && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Year:</label>
            <select
              value={selectedYear || ''}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Choose a year</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        )}

        {/* File upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Upload Age CSV File:</label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
      </div>

      {/* Charts - only show when data exists */}
      {hasData ? (
        <div className="bg-white p-5 rounded-lg shadow-sm">
          {chartType === 'trends' && (
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Age Group Trends Over Time (1981-2020)</h3>
              <ResponsiveContainer width="100%" height={500}>
                <LineChart data={trendsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(value) => value === 0 ? '0' : value > 999 ? `${(value / 1000).toFixed(0)}K` : value.toString()} />
                  <Tooltip formatter={(value) => value.toLocaleString()} />
                  <Legend />
                  {ageData.slice(0, 6).map((ageGroup, index) => (
                    <Line
                      key={ageGroup.ageGroup}
                      type="monotone"
                      dataKey={ageGroup.ageGroup}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {chartType === 'comparison' && selectedYear && (
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Age Group Comparison for {selectedYear}</h3>
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ageGroup" angle={-45} textAnchor="end" height={100} />
                  <YAxis tickFormatter={(value) => value === 0 ? '0' : value > 999 ? `${(value / 1000).toFixed(0)}K` : value.toString()} />
                  <Tooltip formatter={(value) => value.toLocaleString()} />
                  <Bar dataKey="count" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {chartType === 'composition' && selectedYear && (
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Age Composition for {selectedYear}</h3>
              <ResponsiveContainer width="100%" height={500}>
                <PieChart>
                  <Pie
                    data={compositionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {compositionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => value.toLocaleString()} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ) : (
        /* Empty state when no data */
        <div className="bg-white p-5 rounded-lg shadow-sm">
          <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 text-gray-300 mb-4">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4zm2.5 2.25h-15A2.25 2.25 0 012.25 17V4.75A2.25 2.25 0 014.5 2.5h15A2.25 2.25 0 0121.75 4.75V17a2.25 2.25 0 01-2.25 2.25z"/>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Age Data Available</h3>
            <p className="text-gray-500 mb-6">
              Upload a CSV file with age distribution data to see charts and analytics.
              <br />
              Expected format: AGE_GROUP,1981,1982,...,2020
            </p>
            <div className="flex justify-center">
              <label className="cursor-pointer bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                <Upload size={20} />
                Upload Age CSV File
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* CRUD Interface */}
      {showCrud && (
        <div className="bg-white p-5 rounded-lg shadow-sm">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Data Management</h3>
          
          {/* Add new row */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-3">Add New Age Group</h4>
            <div className="space-y-4">
              {/* Age Group Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age Group Name:</label>
                <input
                  type="text"
                  placeholder="e.g., 50 - 54"
                  value={newRow.ageGroup || ''}
                  onChange={(e) => setNewRow({...newRow, ageGroup: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              
              {/* Sample Years Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter data for sample years (optional - others will default to 0):
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {[1981, 1990, 2000, 2010, 2015, 2020].map(year => (
                    <div key={year}>
                      <label className="block text-xs text-gray-600 mb-1">{year}:</label>
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        value={newRow[year.toString()] || ''}
                        onChange={(e) => setNewRow({...newRow, [year.toString()]: e.target.value})}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  All years from 1981-2020 will be included. Unspecified years will be set to 0.
                </p>
              </div>
            </div>
            
            <button
              onClick={addRow}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
            >
              <Plus size={16} />
              Add Age Group
            </button>
          </div>

          {/* Data table */}
          {hasData ? (
            <div className="overflow-x-auto">
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Showing {ageData.length} age groups. Scroll horizontally to see all years.
                </p>
              </div>
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left sticky left-0 bg-gray-100 z-10">Age Group</th>
                    {availableYears.slice(0, 10).map(year => (
                      <th key={year} className="px-3 py-2 text-left whitespace-nowrap">{year}</th>
                    ))}
                    <th className="px-4 py-2 text-left sticky right-0 bg-gray-100 z-10">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ageData.map((row, index) => (
                    <tr key={index} className="border-b">
                      <td className="px-4 py-2 font-medium sticky left-0 bg-white z-10">{row.ageGroup}</td>
                      {availableYears.slice(0, 10).map(year => (
                        <td key={year} className="px-3 py-2 text-sm whitespace-nowrap">
                          {row[year.toString()]?.toLocaleString() || '0'}
                        </td>
                      ))}
                      <td className="px-4 py-2 sticky right-0 bg-white z-10">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingRow(index)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => deleteRow(index)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No data available for management.</p>
              <p className="text-sm">Upload a CSV file or add age groups manually to get started.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AgeChart;