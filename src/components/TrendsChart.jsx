import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const TrendsChart = ({ data, filters }) => {
  // Filter and sort data by year
  const filteredData = data
    .filter(item => {
      if (filters.yearRange) {
        return item.year >= filters.yearRange[0] && item.year <= filters.yearRange[1];
      }
      return true;
    })
    .sort((a, b) => a.year - b.year);

  // Process age group trends data
  const processAgeGroupTrends = (data) => {
    const yearlyAgeData = data.reduce((acc, item) => {
      const year = item.year;
      if (!acc[year]) {
        acc[year] = {
          year,
          '0-14': 0,
          '15-24': 0,
          '25-34': 0,
          '35-44': 0,
          '45-54': 0,
          '55-64': 0,
          '65+': 0
        };
      }
      
      // Map age columns to age groups
      if (item.age_0_14) acc[year]['0-14'] += item.age_0_14;
      if (item.age_15_24) acc[year]['15-24'] += item.age_15_24;
      if (item.age_25_34) acc[year]['25-34'] += item.age_25_34;
      if (item.age_35_44) acc[year]['35-44'] += item.age_35_44;
      if (item.age_45_54) acc[year]['45-54'] += item.age_45_54;
      if (item.age_55_64) acc[year]['55-64'] += item.age_55_64;
      if (item.age_65_plus) acc[year]['65+'] += item.age_65_plus;
      
      return acc;
    }, {});
    
    return Object.values(yearlyAgeData).sort((a, b) => a.year - b.year);
  };

  const chartData = processAgeGroupTrends(filteredData);

  // Create dynamic title based on filters
  const getTitle = () => {
    if (!filters.yearRange || filteredData.length === 0) {
      return "Age Group Emigration Trends";
    }
    const startYear = filters.yearRange[0];
    const endYear = filters.yearRange[1];
    return startYear === endYear 
      ? `Age Group Emigration Trends (${startYear})`
      : `Age Group Emigration Trends (${startYear}-${endYear})`;
  };

  // If no data, show empty state
  if (chartData.length === 0) {
    return (
      <div className="bg-white p-5 rounded-lg shadow-sm mb-5 transition-transform hover:-translate-y-0.5 hover:shadow-md">
        <h3 className="text-xl font-bold text-gray-800 mb-2 pb-2 border-b-2 border-gray-100">{getTitle()}</h3>
        <p className="text-sm text-gray-600 mb-5 leading-relaxed italic">
          Show how different age groups emigrate over time, revealing demographic shifts and generational patterns.
        </p>
        <div className="h-96 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <p className="text-lg mb-2">No age data available</p>
            <p className="text-sm">Upload Emigrant-1981-2020-Age.csv to see age group trends</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-5 rounded-lg shadow-sm mb-5 transition-transform hover:-translate-y-0.5 hover:shadow-md">
      <h3 className="text-xl font-bold text-gray-800 mb-2 pb-2 border-b-2 border-gray-100">{getTitle()}</h3>
      <p className="text-sm text-gray-600 mb-5 leading-relaxed italic">
        <strong>📄 Data Source:</strong> Emigrant-1981-2020-Age.csv - Show how different age groups emigrate over time, revealing demographic shifts and generational patterns.
      </p>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="year" 
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${(value / 1000).toFixed(1)}K`}
          />
          <Tooltip 
            formatter={(value, name) => [value.toLocaleString(), `Age ${name}`]}
            labelFormatter={(label) => `Year: ${label}`}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="0-14" 
            stroke="#ef4444" 
            strokeWidth={2}
            dot={{ r: 3 }}
            name="0-14"
          />
          <Line 
            type="monotone" 
            dataKey="15-24" 
            stroke="#f97316" 
            strokeWidth={2}
            dot={{ r: 3 }}
            name="15-24"
          />
          <Line 
            type="monotone" 
            dataKey="25-34" 
            stroke="#eab308" 
            strokeWidth={2}
            dot={{ r: 3 }}
            name="25-34"
          />
          <Line 
            type="monotone" 
            dataKey="35-44" 
            stroke="#22c55e" 
            strokeWidth={2}
            dot={{ r: 3 }}
            name="35-44"
          />
          <Line 
            type="monotone" 
            dataKey="45-54" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={{ r: 3 }}
            name="45-54"
          />
          <Line 
            type="monotone" 
            dataKey="55-64" 
            stroke="#8b5cf6" 
            strokeWidth={2}
            dot={{ r: 3 }}
            name="55-64"
          />
          <Line 
            type="monotone" 
            dataKey="65+" 
            stroke="#ec4899" 
            strokeWidth={2}
            dot={{ r: 3 }}
            name="65+"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendsChart;