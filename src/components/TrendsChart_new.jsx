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

  // Aggregate data by year and calculate totals
  const yearlyData = filteredData.reduce((acc, item) => {
    const year = item.year;
    if (!acc[year]) {
      acc[year] = {
        year,
        total: 0,
        male: 0,
        female: 0
      };
    }
    acc[year].total += (item.total || (item.male || 0) + (item.female || 0));
    acc[year].male += (item.male || 0);
    acc[year].female += (item.female || 0);
    return acc;
  }, {});

  const chartData = Object.values(yearlyData).sort((a, b) => a.year - b.year);

  // Create dynamic title based on filters
  const getTitle = () => {
    if (!filters.yearRange || filteredData.length === 0) {
      return "Total Number of Filipino Emigrants";
    }
    const startYear = filters.yearRange[0];
    const endYear = filters.yearRange[1];
    return startYear === endYear 
      ? `Total Number of Filipino Emigrants (${startYear})`
      : `Total Number of Filipino Emigrants (${startYear}-${endYear})`;
  };

  // If no data, show empty state
  if (chartData.length === 0) {
    return (
      <div className="bg-white p-5 rounded-lg shadow-sm mb-5 transition-transform hover:-translate-y-0.5 hover:shadow-md">
        <h3 className="text-xl font-bold text-gray-800 mb-2 pb-2 border-b-2 border-gray-100">{getTitle()}</h3>
        <p className="text-sm text-gray-600 mb-5 leading-relaxed italic">
          Illustrates the growth trend of emigration over time, highlighting key periods of increase or decline.
        </p>
        <div className="h-96 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <p className="text-lg mb-2">No data available</p>
            <p className="text-sm">Upload CSV/Excel files or adjust filters to see trends</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-5 rounded-lg shadow-sm mb-5 transition-transform hover:-translate-y-0.5 hover:shadow-md">
      <h3 className="text-xl font-bold text-gray-800 mb-2 pb-2 border-b-2 border-gray-100">{getTitle()}</h3>
      <p className="text-sm text-gray-600 mb-5 leading-relaxed italic">
        Illustrates the growth trend of emigration over time, highlighting key periods of increase or decline.
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
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
          />
          <Tooltip 
            formatter={(value) => [value.toLocaleString(), 'Total Emigrants']}
            labelFormatter={(label) => `Year: ${label}`}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="total" 
            stroke="#8884d8" 
            strokeWidth={3}
            dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#8884d8', strokeWidth: 2 }}
            name="Total Emigrants"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendsChart;