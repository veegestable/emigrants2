import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, BarChart3, PieChart, TrendingUp, Map, Users, FileText, Briefcase, GraduationCap, Heart } from 'lucide-react';

// Import the universal chart component
import UniversalChart from './UniversalChart';

const ChartNavigator = () => {
  const [currentChartIndex, setCurrentChartIndex] = useState(0);

  // Define all available charts with their metadata
  const charts = [
    {
      id: 'age',
      name: 'Age Distribution',
      description: 'Analysis of emigrants by age groups over time',
      icon: Users,
      purpose: 'Distribution',
      datasetType: 'age',
      csvFile: 'Emigrant-1981-2020-Age.csv',
      // No initial sample data by default (start empty until user uploads CSV)
      initialData: null
    },
    {
      id: 'occupation',
      name: 'Occupation Trends',
      description: 'Multi-series trends of emigrant occupations over time',
      icon: Briefcase,
      purpose: 'Trends',
      datasetType: 'occupation',
      csvFile: 'Emigrant-1981-2020-Occu.csv',
      initialData: null
    },
    {
      id: 'education',
      name: 'Education Levels',
      description: 'Educational background distribution',
      icon: GraduationCap,
      purpose: 'Composition',
      datasetType: 'education',
      csvFile: 'Emigrant-1988-2020-Educ.csv',
      initialData: null
    },
    {
      id: 'civilStatus',
      name: 'Civil Status',
      description: 'Marital status distribution of emigrants',
      icon: Heart,
      purpose: 'Composition',
      datasetType: 'civilStatus',
      csvFile: 'Emigrant-1988-2020-CivilStatus.csv',
      initialData: null
    },
    {
      id: 'destination',
      name: 'Destination Countries',
      description: 'Geographic distribution of emigrant destinations',
      icon: Map,
      purpose: 'Composition',
      datasetType: 'destination',
      csvFile: 'Emigrant-1981-2020-MajorCountry.csv',
      initialData: null
    },
    {
      id: 'sex',
      name: 'Sex Relationship',
      description: 'Male vs Female emigrant comparison',
      icon: Users,
      purpose: 'Relationship',
      datasetType: 'sex',
      csvFile: 'Emigrant-1981-2020-Sex.csv',
      initialData: null
    },
    {
      id: 'region',
      name: 'Region of Origin',
      description: 'Philippine regions where emigrants originate',
      icon: Map,
      purpose: 'Comparison & Ranking',
      datasetType: 'region',
      csvFile: 'Emigrant-1988-2020-PlaceOfOrigin.csv',
      initialData: null
    },
    {
      id: 'allCountries',
      name: 'Global Country Analysis',
      description: 'Comprehensive analysis of all destination countries worldwide',
      icon: Map,
      purpose: 'Comparison',
      datasetType: 'allCountries',
      csvFile: 'Emigrant-1981-2020-AllCountries.csv',
      initialData: null
    },
    {
      id: 'province',
      name: 'Province Comparison',
      description: 'Provincial-level emigration patterns and comparisons',
      icon: Map,
      purpose: 'Geographic Representation',
      datasetType: 'province',
      csvFile: 'Emigrant-1988-2020-PlaceOfOrigin-Province.csv',
      initialData: null
    }
  ];

  const currentChart = charts[currentChartIndex];

  const goToPrevious = () => {
    setCurrentChartIndex((prev) => (prev > 0 ? prev - 1 : charts.length - 1));
  };

  const goToNext = () => {
    setCurrentChartIndex((prev) => (prev < charts.length - 1 ? prev + 1 : 0));
  };

  const goToChart = (index) => {
    setCurrentChartIndex(index);
  };

  return (
    <div className="space-y-6">
      {/* Chart Navigation Header */}
      <div className="bg-white p-5 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={goToPrevious}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Previous chart"
            >
              <ChevronLeft size={24} />
            </button>
            
            <div className="flex items-center gap-3">
              <currentChart.icon size={32} className="text-blue-600" />
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{currentChart.name}</h2>
                <p className="text-gray-600">{currentChart.description}</p>
              </div>
            </div>
            
            <button
              onClick={goToNext}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Next chart"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">
              Chart {currentChartIndex + 1} of {charts.length}
            </div>
            <div className="text-sm font-medium text-blue-600">
              Purpose: {currentChart.purpose}
            </div>
            <div className="text-xs text-gray-400">
              Data: {currentChart.csvFile}
            </div>
          </div>
        </div>

        {/* Chart Selector Pills */}
        <div className="flex flex-wrap gap-2">
          {charts.map((chart, index) => {
            const IconComponent = chart.icon;
            return (
              <button
                key={chart.id}
                onClick={() => goToChart(index)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                  index === currentChartIndex
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <IconComponent size={16} />
                {chart.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Chart Display */}
      <div className="min-h-[600px]">
        <UniversalChart 
          key={currentChart.datasetType} // Force new component instance for each chart type
          datasetType={currentChart.datasetType}
          initialData={currentChart.initialData}
        />
      </div>


      {/* Chart Information Panel */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Chart Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Visualization Purpose</h4>
            <p className="text-sm text-gray-600">{currentChart.purpose}</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Data Source</h4>
            <p className="text-sm text-gray-600">{currentChart.csvFile}</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Analysis Type</h4>
            <p className="text-sm text-gray-600">
              {currentChart.purpose.includes('Trends') ? 'Time series analysis' :
               currentChart.purpose.includes('Comparison') ? 'Comparative analysis' :
               currentChart.purpose.includes('Composition') ? 'Compositional breakdown' :
               currentChart.purpose.includes('Geographic') ? 'Spatial analysis' :
               currentChart.purpose.includes('Distribution') ? 'Statistical distribution' :
               'Relationship analysis'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartNavigator;