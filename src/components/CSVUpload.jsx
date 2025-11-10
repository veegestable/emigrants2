import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { addMultipleEmigrants } from '../services/emigrantsService';

const CSVUpload = ({ onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setUploadStatus(null);
    } else {
      setUploadStatus({ type: 'error', message: 'Please select a valid CSV file.' });
    }
  };

  const parseCSV = (csvText) => {
    const lines = csvText.split('\n');
    const data = [];
    
    // Check file type
    const isDestinationFile = csvText.toLowerCase().includes('country') || 
                             csvText.toLowerCase().includes('destination') ||
                             csvText.toLowerCase().includes('usa') ||
                             csvText.toLowerCase().includes('canada') ||
                             csvText.toLowerCase().includes('australia');
                             
    const isEducationFile = csvText.toLowerCase().includes('educational attainment') ||
                           csvText.toLowerCase().includes('schooling') ||
                           csvText.toLowerCase().includes('college') ||
                           csvText.toLowerCase().includes('graduate');
                           
    const isOccupationFile = csvText.toLowerCase().includes('occupational group') ||
                            csvText.toLowerCase().includes('major occupation') ||
                            csvText.toLowerCase().includes('professional') ||
                            csvText.toLowerCase().includes('housewives');
                            
    const isPlaceOfOriginFile = csvText.toLowerCase().includes('region of origin') ||
                               csvText.toLowerCase().includes('place of origin') ||
                               csvText.toLowerCase().includes('region i') ||
                               csvText.toLowerCase().includes('region ii') ||
                               csvText.toLowerCase().includes('ncr');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and header lines
      if (!line || line.includes('NUMBER OF REGISTERED') || line.includes('MAJOR OCCUPATION') || line.includes('YEAR') || line.includes('Source:') || line.includes('A. EMPLOYED') || line.includes('B. UNEMPLOYED')) {
        continue;
      }

      const values = line.split(',');
      
      // Skip lines that don't have enough data or are clearly headers/empty
      if (values.length < 3 || values.every(v => !v || v.trim() === '')) continue;
      
      // Look for destination countries (for destination data files)
      const commonCountries = ['USA', 'CANADA', 'AUSTRALIA', 'JAPAN', 'SAUDI ARABIA', 'UAE', 'SINGAPORE', 'UNITED KINGDOM', 'UK', 'ITALY', 'GERMANY', 'SPAIN', 'FRANCE', 'NETHERLANDS', 'NORWAY', 'SWEDEN'];
      const isDestinationData = commonCountries.some(country => 
        line.toUpperCase().includes(country) || 
        values[0].toUpperCase().replace(/['"]/g, '').trim().includes(country)
      );
      
      if (isDestinationData && isDestinationFile) {
        // Parse destination data differently
        const countryName = values[0].replace(/['"]/g, '').trim();
        if (!countryName) continue;
        
        // Extract year-by-year data for this destination
        for (let yearIndex = 1; yearIndex < values.length - 2; yearIndex++) {
          const year = 1980 + yearIndex; // Adjust based on your data structure
          if (year > 2020) break;
          
          const count = parseNumber(values[yearIndex]);
          if (count > 0) {
            data.push({
              year: year,
              male: Math.floor(count * 0.55), // Estimate 55% male
              female: Math.floor(count * 0.45), // Estimate 45% female
              single: Math.floor(count * 0.4),
              married: Math.floor(count * 0.5),
              widower: Math.floor(count * 0.02),
              separated: Math.floor(count * 0.02),
              divorced: Math.floor(count * 0.01),
              notReported: Math.floor(count * 0.05),
              destination: countryName,
              total: count
            });
          }
        }
        continue;
      }
      
      // Look for education categories (for education data files)
      const educationLevels = ['Not of Schooling Age', 'No Formal Education', 'Elementary', 'High School', 'Vocational', 'College', 'Post Graduate', 'Non-Formal Education'];
      const isEducationData = educationLevels.some(level => 
        line.includes(level) || values[0].replace(/['"]/g, '').trim().includes(level)
      ) && isEducationFile;
      
      if (isEducationData) {
        // Parse education data differently
        const educationLevel = values[0].replace(/['"]/g, '').trim();
        if (!educationLevel || educationLevel.includes('TOTAL')) continue;
        
        // Extract year-by-year data for this education level
        for (let yearIndex = 1; yearIndex < values.length - 2; yearIndex++) { // -2 to skip TOTAL and % columns
          const year = 1987 + yearIndex; // Education data starts from 1988, adjust as needed
          if (year > 2020) break;
          
          const count = parseNumber(values[yearIndex]);
          if (count > 0) {
            data.push({
              year: year,
              male: Math.floor(count * 0.55),
              female: Math.floor(count * 0.45),
              single: Math.floor(count * 0.4),
              married: Math.floor(count * 0.5),
              widower: Math.floor(count * 0.02),
              separated: Math.floor(count * 0.02),
              divorced: Math.floor(count * 0.01),
              notReported: Math.floor(count * 0.05),
              destination: 'Unknown',
              educationLevel: educationLevel,
              total: count
            });
          }
        }
        continue;
      }
      
      // Look for place of origin/regional categories (for regional data files)
      const regions = ['Region I', 'Region II', 'Region III', 'Region IV', 'Region V', 'Region VI', 'Region VII', 'Region VIII', 'Region IX', 'Region X', 'Region XI', 'Region XII', 'Region XIII', 'NCR', 'CAR', 'ARMM'];
      const isRegionalData = regions.some(region => 
        line.includes(region) || values[0].replace(/['"]/g, '').trim().includes(region)
      ) && isPlaceOfOriginFile;
      
      if (isRegionalData) {
        // Parse regional data differently
        const regionName = values[0].replace(/['"]/g, '').trim();
        if (!regionName || regionName.includes('TOTAL')) continue;
        
        // Extract year-by-year data for this region
        for (let yearIndex = 1; yearIndex < values.length - 2; yearIndex++) { // -2 to skip TOTAL and % columns
          const year = 1987 + yearIndex; // Regional data starts from 1988
          if (year > 2020) break;
          
          const count = parseNumber(values[yearIndex]);
          if (count > 0) {
            data.push({
              year: year,
              male: Math.floor(count * 0.55),
              female: Math.floor(count * 0.45),
              single: Math.floor(count * 0.4),
              married: Math.floor(count * 0.5),
              widower: Math.floor(count * 0.02),
              separated: Math.floor(count * 0.02),
              divorced: Math.floor(count * 0.01),
              notReported: Math.floor(count * 0.05),
              destination: 'Unknown',
              region: regionName,
              placeOfOrigin: regionName,
              total: count
            });
          }
        }
        continue;
      }
      
      // Look for occupation categories (for occupational data files)
      const occupationCategories = ['Workers', 'Professional', 'Manager', 'Clerical', 'Sales', 'Service', 'Agriculture', 'Production', 'Housewives', 'Students', 'Retirees', 'Minors', 'Armed Forces'];
      const isOccupationData = (occupationCategories.some(cat => line.includes(cat)) || 
                               line.includes('Executive') || line.includes('Administrative') ||
                               line.includes('Out of School') || line.includes('No Occupation')) && isOccupationFile;
      
      if (isOccupationData) {
        // Parse occupational data differently
        const occupationName = values[0].replace(/['"]/g, '').trim();
        if (!occupationName || occupationName.includes('TOTAL')) continue;
        
        // Extract year-by-year data
        for (let yearIndex = 1; yearIndex < values.length - 2; yearIndex++) { // -2 to skip TOTAL and % columns
          const year = 1980 + yearIndex; // Years start from 1981
          if (year > 2020) break;
          
          const count = parseNumber(values[yearIndex]);
          if (count > 0) {
            data.push({
              year: year,
              male: Math.floor(count * 0.6), // Estimate 60% male for occupational data
              female: Math.floor(count * 0.4), // Estimate 40% female
              single: Math.floor(count * 0.4), // Rough estimates for civil status
              married: Math.floor(count * 0.5),
              widower: Math.floor(count * 0.02),
              separated: Math.floor(count * 0.02),
              divorced: Math.floor(count * 0.01),
              notReported: Math.floor(count * 0.05),
              destination: 'Unknown', // No destination data in occupational files
              occupation: occupationName,
              total: count
            });
          }
        }
        continue;
      }
      
      // Try to find year column (look for 4-digit number between 1981-2020)
      let yearValue = null;
      let yearIndex = -1;
      
      for (let j = 0; j < values.length; j++) {
        const cleanValue = values[j].replace(/["\s]/g, '');
        const year = parseInt(cleanValue);
        if (year >= 1981 && year <= 2020) {
          yearValue = year;
          yearIndex = j;
          break;
        }
      }
      
      // Skip if no valid year found
      if (!yearValue) continue;
      
      // Create row object based on detected file type
      const row = {
        year: yearValue,
        male: 0,
        female: 0,
        single: 0,
        married: 0,
        widower: 0,
        separated: 0,
        divorced: 0,
        notReported: 0,
        destination: 'Unknown'
      };
      
      // Try to detect destination from the row data
      if (isDestinationFile) {
        // Look for country name in the first few columns
        for (let k = 0; k < Math.min(3, values.length); k++) {
          if (k === yearIndex) continue; // Skip year column
          const possibleCountry = values[k].replace(/['"]/g, '').trim();
          const commonCountries = ['USA', 'CANADA', 'AUSTRALIA', 'JAPAN', 'SAUDI ARABIA', 'UAE', 'SINGAPORE', 'UNITED KINGDOM', 'UK', 'ITALY', 'GERMANY', 'SPAIN', 'FRANCE', 'NETHERLANDS', 'NORWAY', 'SWEDEN'];
          if (commonCountries.some(country => possibleCountry.toUpperCase().includes(country))) {
            row.destination = possibleCountry;
            break;
          }
        }
      }
      
      // Parse different CSV formats
      if (line.includes('M/100F') || values.length >= 4) {
        // Sex data format: year, male, female, total, ratio
        if (values.length >= 4) {
          row.male = parseNumber(values[yearIndex + 1]) || 0;
          row.female = parseNumber(values[yearIndex + 2]) || 0;
          // Estimate civil status if not provided
          const total = row.male + row.female;
          row.single = Math.floor(total * 0.4);
          row.married = Math.floor(total * 0.5);
          row.widower = Math.floor(total * 0.02);
          row.separated = Math.floor(total * 0.02);
          row.divorced = Math.floor(total * 0.01);
          row.notReported = Math.floor(total * 0.05);
        }
      } else if (line.toLowerCase().includes('single') || values.length >= 7) {
        // Civil status format: year, single, married, widower, separated, divorced, notReported, total
        if (values.length >= 7) {
          row.single = parseNumber(values[yearIndex + 1]) || 0;
          row.married = parseNumber(values[yearIndex + 2]) || 0;
          row.widower = parseNumber(values[yearIndex + 3]) || 0;
          row.separated = parseNumber(values[yearIndex + 4]) || 0;
          row.divorced = parseNumber(values[yearIndex + 5]) || 0;
          row.notReported = parseNumber(values[yearIndex + 6]) || 0;
          // Estimate gender if not provided
          const total = row.single + row.married + row.widower + row.separated + row.divorced + row.notReported;
          row.male = Math.floor(total * 0.55);
          row.female = Math.floor(total * 0.45);
        }
      }
      
      // Only add valid rows with some data
      if (row.male > 0 || row.female > 0 || row.single > 0 || row.married > 0) {
        data.push(row);
      }
    }
    
    return data;
  };

  // Helper function to parse numbers with commas and quotes
  const parseNumber = (value) => {
    if (!value) return 0;
    // Remove quotes, spaces, and commas, then convert to number
    const cleaned = value.replace(/[",\s]/g, '');
    const num = parseInt(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadStatus(null);

    try {
      const text = await file.text();
      const parsedData = parseCSV(text);
      
      if (parsedData.length === 0) {
        throw new Error('No valid data found in CSV file');
      }

      // Clean data to ensure no empty fields for Firebase
      const cleanedData = parsedData
        .filter(item => item.year && item.year > 0) // Only include rows with valid years
        .map(item => {
          // Remove any undefined, null, or empty string values
          const cleaned = {};
          Object.keys(item).forEach(key => {
            const value = item[key];
            if (value !== undefined && value !== null && value !== '') {
              cleaned[key] = value;
            }
          });
          
          // Ensure required fields exist with default values
          return {
            year: cleaned.year,
            male: cleaned.male || 0,
            female: cleaned.female || 0,
            single: cleaned.single || 0,
            married: cleaned.married || 0,
            widower: cleaned.widower || 0,
            separated: cleaned.separated || 0,
            divorced: cleaned.divorced || 0,
            notReported: cleaned.notReported || 0,
            destination: cleaned.destination || 'Unknown'
          };
        });

      if (cleanedData.length === 0) {
        throw new Error('No valid data found after cleaning');
      }


      await addMultipleEmigrants(cleanedData);
      setUploadStatus({ 
        type: 'success', 
        message: `Successfully uploaded ${cleanedData.length} records!` 
      });
      setFile(null);
      if (onUploadComplete) onUploadComplete();
      
      // Reset file input
      document.getElementById('csv-upload').value = '';
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus({ 
        type: 'error', 
        message: `Upload failed: ${error.message}` 
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <input
          id="csv-upload"
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full p-2 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-gray-400 transition-colors text-sm"
        />
      </div>

      {file && (
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
          <FileText size={14} />
          <span className="truncate">{file.name}</span>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className={`flex items-center justify-center gap-2 w-full px-4 py-2 rounded text-white transition-colors text-sm ${
          file && !uploading 
            ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer' 
            : 'bg-gray-400 cursor-not-allowed'
        }`}
      >
        <Upload size={16} />
        {uploading ? 'Uploading...' : 'Upload CSV'}
      </button>

      {uploadStatus && (
        <div className={`p-2 rounded text-xs ${
          uploadStatus.type === 'success' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {uploadStatus.message}
        </div>
      )}
    </div>
  );
};

export default CSVUpload;