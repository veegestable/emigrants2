import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const DistributionChart = ({ data, filters }) => {
  // Filter data first
  const filteredData = data.filter(item => {
    if (filters.yearRange) {
      return item.year >= filters.yearRange[0] && item.year <= filters.yearRange[1];
    }
    return true;
  });

  // Create dynamic title based on filters
  const getTitle = () => {
    if (!filters.yearRange || filteredData.length === 0) {
      return "Occupation Distribution of Filipino Emigrants";
    }
    const startYear = filters.yearRange[0];
    const endYear = filters.yearRange[1];
    return startYear === endYear 
      ? `Occupation Distribution of Filipino Emigrants (${startYear})`
      : `Occupation Distribution of Filipino Emigrants (${startYear}-${endYear})`;
  };

  // If no data, show empty state
  if (filteredData.length === 0) {
    return (
      <div className="bg-white p-5 rounded-lg shadow-sm mb-5 transition-transform hover:-translate-y-0.5 hover:shadow-md">
        <h3 className="text-xl font-bold text-gray-800 mb-2 pb-2 border-b-2 border-gray-100">{getTitle()}</h3>
        <p className="text-sm text-gray-600 mb-5 leading-relaxed italic">
          Show the frequency of different occupations among emigrants, identifying the most common job types.
        </p>
        <div className="h-96 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <p className="text-lg mb-2">No occupation data available</p>
            <p className="text-sm">Upload Emigrant-1981-2020-Occu.csv to see occupation distribution</p>
          </div>
        </div>
      </div>
    );
  }

  // Process occupation distribution data
  const processOccupationData = (data) => {
    const occupationTotals = data.reduce((acc, item) => {
      // Common occupation categories
      const occupations = {
        'Professional': item.professional || 0,
        'Technical': item.technical || 0,
        'Administrative': item.administrative || 0,
        'Service': item.service || 0,
        'Agricultural': item.agricultural || 0,
        'Production': item.production || 0,
        'Elementary': item.elementary || 0,
        'Other': item.other || 0
      };
      
      Object.entries(occupations).forEach(([occupation, count]) => {
        if (!acc[occupation]) acc[occupation] = 0;
        acc[occupation] += count;
      });
      
      return acc;
    }, {});
    
    // Convert to chart format and sort by count
    return Object.entries(occupationTotals)
      .map(([occupation, count]) => ({ occupation, count }))
      .sort((a, b) => b.count - a.count);
  };

  const occupationData = processOccupationData(filteredData);

  return (
    <div className="bg-white p-5 rounded-lg shadow-sm mb-5 transition-transform hover:-translate-y-0.5 hover:shadow-md">
      <h3 className="text-xl font-bold text-gray-800 mb-2 pb-2 border-b-2 border-gray-100">{getTitle()}</h3>
      <p className="text-sm text-gray-600 mb-5 leading-relaxed italic">
        <strong>📄 Data Source:</strong> Emigrant-1981-2020-Occu.csv - Show the frequency of different occupations among emigrants, identifying the most common job types and professional categories.
      </p>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={occupationData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="occupation" 
            tick={{ fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${(value / 1000).toFixed(1)}K`}
          />
          <Tooltip 
            formatter={(value) => [value.toLocaleString(), 'Emigrants']}
            labelFormatter={(label) => `Occupation: ${label}`}
          />
          <Bar 
            dataKey="count" 
            fill="#3b82f6" 
            name="Total Emigrants"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DistributionChart;