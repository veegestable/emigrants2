import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const RelationshipsChart = ({ data, filters }) => {
  // Filter data based on year range
  const filteredData = data.filter(item => {
    if (filters.yearRange) {
      return item.year >= filters.yearRange[0] && item.year <= filters.yearRange[1];
    }
    return true;
  });

  // Process civil status relationships data
  const processCivilStatusData = (data) => {
    const civilStatusData = [];
    
    data.forEach(item => {
      // Civil status categories
      const statuses = {
        'Single': item.single || item.never_married || 0,
        'Married': item.married || 0,
        'Widowed': item.widowed || 0,
        'Divorced': item.divorced || item.separated || 0,
        'Other': item.other_civil_status || 0
      };
      
      Object.entries(statuses).forEach(([status, count]) => {
        if (count > 0) {
          civilStatusData.push({
            x: item.year,
            y: count,
            status: status,
            size: Math.max(count / 100, 10) // Bubble size based on count
          });
        }
      });
    });
    
    return civilStatusData;
  };

  const chartData = processCivilStatusData(filteredData);

  // Group data by civil status
  const civilStatusGroups = chartData.reduce((acc, item) => {
    const status = item.status;
    if (!acc[status]) acc[status] = [];
    acc[status].push(item);
    return acc;
  }, {});

  // Create dynamic title based on filters
  const getTitle = () => {
    if (!filters.yearRange || filteredData.length === 0) {
      return "Civil Status Relationships Over Time";
    }
    const startYear = filters.yearRange[0];
    const endYear = filters.yearRange[1];
    return startYear === endYear 
      ? `Civil Status Relationships Over Time (${startYear})`
      : `Civil Status Relationships Over Time (${startYear}-${endYear})`;
  };

  // Color palette for destinations
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16'];

  // If no data, show empty state
  if (filteredData.length === 0) {
    return (
      <div className="bg-white p-5 rounded-lg shadow-sm mb-5 transition-transform hover:-translate-y-0.5 hover:shadow-md">
        <h3 className="text-xl font-bold text-gray-800 mb-2 pb-2 border-b-2 border-gray-100">{getTitle()}</h3>
        <p className="text-sm text-gray-600 mb-5 leading-relaxed italic">
          Explore relationships between civil status categories and emigration patterns over time.
        </p>
        <div className="h-96 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <p className="text-lg mb-2">No civil status data available</p>
            <p className="text-sm">Upload Emigrant-1988-2020-CivilStatus.csv to see civil status relationships</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-5 rounded-lg shadow-sm mb-5 transition-transform hover:-translate-y-0.5 hover:shadow-md">
      <h3 className="text-xl font-bold text-gray-800 mb-2 pb-2 border-b-2 border-gray-100">{getTitle()}</h3>
      <p className="text-sm text-gray-600 mb-5 leading-relaxed italic">
        <strong>📄 Data Source:</strong> Emigrant-1988-2020-CivilStatus.csv - Explore relationships between civil status categories and emigration patterns over time, showing how marital status affects migration.
      </p>
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            type="number"
            dataKey="x"
            domain={['dataMin', 'dataMax']}
            name="Year"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            type="number"
            dataKey="y"
            name="Number of Emigrants"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${(value / 1000).toFixed(1)}K`}
          />
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }}
            formatter={(value, name, props) => [
              value.toLocaleString(),
              `${props.payload.status} (${name === 'y' ? 'Emigrants' : 'Year'})`
            ]}
          />
          <Legend />
          {Object.entries(civilStatusGroups).map(([status, data], index) => (
            <Scatter 
              key={status}
              name={status} 
              data={data} 
              fill={colors[index % colors.length]}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RelationshipsChart;