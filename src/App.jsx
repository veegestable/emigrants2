import React, { useEffect, useState } from "react";
import { getEmigrants, getEmigrantsByYear } from './services/emigrantsService';

// Import new chart navigation system
import ChartNavigator from './components/ChartNavigator';

function App() {
  const [emigrants, setEmigrants] = useState([]);
  const [yearlyData, setYearlyData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [rawData, yearlyDataObj] = await Promise.all([
        getEmigrants(),
        getEmigrantsByYear()
      ]);
      
      setEmigrants(rawData);
      
      // Convert yearly data object to array
      const yearlyArray = Object.values(yearlyDataObj);
      setYearlyData(yearlyArray);
      
      // Set initial filter range
      if (yearlyArray.length > 0) {
        const years = yearlyArray.map(item => item.year).filter(year => year);
        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);
        setFilters(prev => ({
          ...prev,
          yearRange: [minYear, maxYear]
        }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate dashboard stats
  const calculateStats = () => {
    if (yearlyData.length === 0) return {};
    
    const totalEmigrants = yearlyData.reduce((sum, item) => sum + (item.total || 0), 0);
    const years = yearlyData.map(item => item.year).filter(year => year);
    const yearRange = years.length > 0 ? `${Math.min(...years)}-${Math.max(...years)}` : 'N/A';
    
    return {
      totalEmigrants,
      yearRange,
      topDestination: 'USA' // This would be calculated from destination data
    };
  };

  const stats = calculateStats();

  // Determine which charts to show based on filters
  const shouldShowChart = (chartType) => {
    return filters.chartType === 'all' || filters.chartType === chartType;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-indigo-500 to-purple-600">
        <div className="bg-white p-10 rounded-lg shadow-lg text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-5"></div>
          <h3 className="text-gray-800 font-semibold text-lg">Loading Dashboard...</h3>
          <p className="text-gray-600 mt-2">
            Fetching Filipino emigrants data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-800 to-darkblue-400">
      {/* Enhanced Header */}
      <header className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 shadow-2xl border-b-4 border-blue-500">
        <div className="container mx-auto px-6 py-6">
          <div className="flex justify-between items-center flex-wrap gap-6">
            <div className="flex items-center gap-6">
              {/* Logo/Icon */}
              
              
              {/* Title Section */}
              <div>
                <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
                   Filipino Emigrants Analytics
                </h1>
                <div className="flex items-center gap-4 flex-wrap">
                  <p className="text-blue-200 text-lg font-medium">
                     Interactive Data Dashboard
                  </p>
                  <span className="px-3 py-1 bg-blue-600 text-white text-sm rounded-full font-semibold">
                    1981-2020
                  </span>
                  <span className="px-3 py-1 bg-green-600 text-white text-sm rounded-full font-semibold">
                    40 Years of Data
                  </span>
                </div>
              </div>
            </div>
            
            {/* Status Indicators */}
            <div className="flex items-center gap-4">
              <div className="bg-slate-700 px-4 py-2 rounded-lg border border-slate-600">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 text-sm font-semibold">Live Dashboard</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>


      {/* Main Layout */}
      <div className="flex h-screen">
        {/* Main Content Area */}
        <main className="flex-1 p-5 overflow-y-auto">
          <ChartNavigator />
        </main>
      </div>
      
      {/* Compact Footer */}
      <footer className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border-t-2 border-blue-500 shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Left: Main Info */}
            <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
              <div className="flex items-center gap-2">
                <span className="text-blue-400"></span>
                <span className="text-white font-semibold">Filipino Emigrants Analytics</span>
              </div>
              <div className="flex items-center gap-4 text-slate-300 text-sm">
                <span> Data: Philippine Statistics Authority</span>
                <span> 1981-2020</span>
              </div>
            </div>
            
            {/* Right: Powered By Tech Stack & Status */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-slate-400 text-sm font-medium">Powered by:</span>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded font-semibold">React</span>
                  <span className="px-2 py-1 bg-cyan-600 text-white text-xs rounded font-semibold">Tailwind</span>
                  <span className="px-2 py-1 bg-orange-600 text-white text-xs rounded font-semibold">Firebase</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>Live</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
