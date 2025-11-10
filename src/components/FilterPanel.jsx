import React from 'react';

const FilterPanel = ({ filters, setFilters, data }) => {
  // Return a minimal component with just essential data info
  return (
    <div className="space-y-4">
      {/* Minimal data info */}
      <div className="p-3 bg-blue-50 rounded text-sm border border-blue-200">
        <div className="font-semibold text-blue-800 mb-1">Dataset Info</div>
        <div className="text-blue-700">{data.length} total records</div>
      </div>
    </div>
  );
};

export default FilterPanel;