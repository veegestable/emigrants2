import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Upload, Download, Plus, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { createCSVService, csvConfigurations } from '../services/csvDataService';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#d084d0', '#ffb347'];

const UniversalChart = ({ datasetType, initialData = null }) => {
  const [csvService] = useState(() => createCSVService(datasetType));
  const [data, setData] = useState([]);
  const [chartType, setChartType] = useState('trends');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(10);

  const config = csvConfigurations[datasetType];

  if (!config) {
    return <div className="p-4 text-red-600">Invalid dataset type: {datasetType}</div>;
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const loadedData = await csvService.loadFromFirebase();
      if (loadedData && loadedData.length > 0) {
        setData(loadedData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Handle CSV file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    const parsedData = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });

    csvService.data = parsedData;
    await csvService.saveToFirebase();
    setData([...parsedData]);
    alert('CSV uploaded successfully!');
    event.target.value = '';
  };

  // Get processed data for charts
  const getChartData = () => {
    if (!data || data.length === 0) return [];

    if (chartType === 'trends') {
      // For trends, aggregate by year
      const yearData = {};
      data.forEach(row => {
        Object.keys(row).forEach(key => {
          if (key.match(/^\d{4}$/)) { // Year fields
            if (!yearData[key]) yearData[key] = { year: key, total: 0 };
            yearData[key].total += parseInt(row[key]) || 0;
          }
        });
      });
      return Object.values(yearData).sort((a, b) => a.year - b.year);
    } else {
      // For other chart types, use category data
      return data.map(row => {
        const categoryKey = Object.keys(row)[0];
        const category = row[categoryKey];
        const total = Object.keys(row)
          .filter(key => key !== categoryKey)
          .reduce((sum, key) => sum + (parseInt(row[key]) || 0), 0);
        
        return { name: category, value: total };
      }).filter(item => item.value > 0);
    }
  };

  // Get all records for pagination
  const getAllRecords = () => {
    const records = [];
    if (!data || data.length === 0) return records;

    data.forEach((row, rowIndex) => {
      const categoryKey = Object.keys(row)[0];
      const categoryValue = row[categoryKey];
      
      Object.keys(row).forEach(key => {
        if (key !== categoryKey && row[key] && parseInt(row[key]) > 0) {
          records.push({
            id: `${rowIndex}-${key}`,
            category: categoryValue,
            year: key,
            count: parseInt(row[key]),
            rowIndex: rowIndex
          });
        }
      });
    });
    
    return records;
  };

  const allRecords = getAllRecords();
  const totalRecords = allRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));
  const startIndex = (currentPage - 1) * recordsPerPage;
  const currentRecords = allRecords.slice(startIndex, startIndex + recordsPerPage);

  // Add new record
  const handleAddRecord = async (formData) => {
    const category = formData.get('category');
    const year = formData.get('year');
    const count = parseInt(formData.get('count')) || 0;

    if (!category || !year) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await csvService.addRecordToFirebase(category, year, count);
      await loadData();
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding record:', error);
      alert('Error adding record');
    }
  };

  // Delete record
  const handleDeleteRecord = async (category, year) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      await csvService.deleteRecordFromFirebase(category, year);
      await loadData();
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Error deleting record');
    }
  };

  const chartData = getChartData();

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="h-96 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <p className="text-lg mb-2">No data available</p>
            <p className="text-sm">Upload a CSV file or add records manually</p>
          </div>
        </div>
      );
    }

    switch (chartType) {
      case 'trends':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip formatter={(value) => [value.toLocaleString(), 'Count']} />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'composition':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold text-gray-800">{config.displayName} Analysis</h2>
          
          <div className="flex items-center gap-2">
            {/* Chart Type Selector */}
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {config.chartTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>

            {/* CSV Upload */}
            <label className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 text-sm">
              <Upload size={16} />
              Upload CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Add Record Button */}
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              <Plus size={16} />
              Add Record
            </button>
          </div>
        </div>

        {/* Add Record Form */}
        {showAddForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddRecord(new FormData(e.target));
            }}
            className="bg-gray-50 p-4 rounded-lg border"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {config.displayName}
                </label>
                <select name="category" required className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option value="">Select {config.displayName}</option>
                  {config.predefinedOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select name="year" required className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option value="">Select Year</option>
                  {config.yearFields.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Count</label>
                <input
                  type="number"
                  name="count"
                  required
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Chart */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          {chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart
        </h3>
        {renderChart()}
      </div>

      {/* Records Table */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Records ({totalRecords} total)
          </h3>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-md disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 py-1 text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-md disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {currentRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left">{config.displayName}</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Year</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Count</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.map(record => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">{record.category}</td>
                    <td className="border border-gray-300 px-4 py-2">{record.year}</td>
                    <td className="border border-gray-300 px-4 py-2">{record.count.toLocaleString()}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <button
                        onClick={() => handleDeleteRecord(record.category, record.year)}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Delete record"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No records found</p>
        )}
      </div>
    </div>
  );
};

export default UniversalChart;