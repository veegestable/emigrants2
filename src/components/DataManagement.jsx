import React, { useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { getEmigrants, deleteEmigrant } from '../services/emigrantsService';

const DataManagement = ({ onDataChange }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const handleClearDatabase = async () => {
    if (!window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setStatus(null);
    
    try {
      const emigrants = await getEmigrants();
      const deletePromises = emigrants.map(emigrant => deleteEmigrant(emigrant.id));
      await Promise.all(deletePromises);
      
      setStatus({ type: 'success', message: `Cleared ${emigrants.length} records from database` });
      if (onDataChange) onDataChange();
    } catch (error) {
      setStatus({ type: 'error', message: `Error clearing database: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const emigrants = await getEmigrants();
      if (emigrants.length === 0) {
        setStatus({ type: 'warning', message: 'No data to export' });
        return;
      }

      // Convert to CSV
      const headers = ['year', 'male', 'female', 'single', 'married', 'widower', 'separated', 'divorced', 'notReported', 'destination'];
      const csvContent = [
        headers.join(','),
        ...emigrants.map(row => 
          headers.map(header => row[header] || '').join(',')
        )
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `filipino-emigrants-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      setStatus({ type: 'success', message: `Exported ${emigrants.length} records to CSV` });
    } catch (error) {
      setStatus({ type: 'error', message: `Export failed: ${error.message}` });
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <button
          onClick={handleExportData}
          disabled={loading}
          className={`flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm ${
            loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <Download size={16} />
          Export Data
        </button>

        <button
          onClick={handleClearDatabase}
          disabled={loading}
          className={`flex items-center justify-center gap-2 w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors text-sm ${
            loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <Trash2 size={16} />
          Clear All Data
        </button>
      </div>

      {status && (
        <div className={`p-2 rounded-md text-xs border ${
          status.type === 'success' ? 'bg-green-100 text-green-800 border-green-200' : 
          status.type === 'error' ? 'bg-red-100 text-red-800 border-red-200' : 
          'bg-yellow-100 text-yellow-800 border-yellow-200'
        }`}>
          {status.message}
        </div>
      )}
    </div>
  );
};

export default DataManagement;