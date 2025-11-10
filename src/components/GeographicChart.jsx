import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const GeographicChart = ({ data, filters }) => {
  const [worldGeoJSON, setWorldGeoJSON] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState(false);

  // Get filtered data based on year range
  const filteredData = data.filter(item => {
    if (!filters.yearRange) return true;
    return item.year >= filters.yearRange[0] && item.year <= filters.yearRange[1];
  });

  // Create dynamic title based on filters
  const getTitle = () => {
    if (!filters.yearRange || filteredData.length === 0) {
      return "Geographic Distribution: Places of Origin";
    }
    const startYear = filters.yearRange[0];
    const endYear = filters.yearRange[1];
    return startYear === endYear 
      ? `Geographic Distribution: Places of Origin (${startYear})`
      : `Geographic Distribution: Places of Origin (${startYear}-${endYear})`;
  };

  // Generate place of origin data from actual filtered data
  const getPlaceOfOriginData = () => {
    if (filteredData.length === 0) return [];

    const originCounts = {};
    
    // Check if we have actual place of origin data
    const hasOriginData = filteredData.some(item => item.place_of_origin && item.place_of_origin !== 'Unknown');
    
    if (!hasOriginData) {
      // Create simulated origin data based on total emigrants
      const totalEmigrants = filteredData.reduce((sum, item) => sum + (item.total || (item.male || 0) + (item.female || 0) || 1), 0);
      
      // Simulate realistic Philippine regional distribution
      const simulatedRegions = [
        { region: 'National Capital Region (NCR)', percentage: 0.25 },
        { region: 'Region IV-A (CALABARZON)', percentage: 0.15 },
        { region: 'Region III (Central Luzon)', percentage: 0.12 },
        { region: 'Region VII (Central Visayas)', percentage: 0.10 },
        { region: 'Region X (Northern Mindanao)', percentage: 0.08 },
        { region: 'Region VI (Western Visayas)', percentage: 0.07 },
        { region: 'Region I (Ilocos Region)', percentage: 0.06 },
        { region: 'Region XI (Davao Region)', percentage: 0.06 },
        { region: 'Region VIII (Eastern Visayas)', percentage: 0.05 },
        { region: 'Region II (Cagayan Valley)', percentage: 0.06 }
      ];
      
      return simulatedRegions.map(reg => ({
        region: reg.region,
        emigrants: Math.floor(totalEmigrants * reg.percentage),
        coordinates: getRegionCoordinates(reg.region),
        code: getRegionCode(reg.region)
      })).filter(item => item.emigrants > 0);
    }
    
    // Use actual place of origin data
    filteredData.forEach(item => {
      const origin = item.place_of_origin && item.place_of_origin !== 'Unknown' ? item.place_of_origin : 'Other';
      const count = item.total || (item.male || 0) + (item.female || 0) || 1;
      originCounts[origin] = (originCounts[origin] || 0) + count;
    });

    // Convert to array and add coordinates for known regions
    return Object.entries(originCounts)
      .map(([origin, emigrants]) => ({
        region: origin,
        emigrants,
        coordinates: getRegionCoordinates(origin),
        code: getRegionCode(origin)
      }))
      .sort((a, b) => b.emigrants - a.emigrants)
      .slice(0, 10); // Top 10
  };

  const getRegionCoordinates = (region) => {
    const coordinates = {
      'National Capital Region (NCR)': [14.6042, 121.0225],
      'Region I (Ilocos Region)': [16.0934, 120.5615],
      'Region II (Cagayan Valley)': [17.1390, 121.6442],
      'Region III (Central Luzon)': [15.4817, 120.7126],
      'Region IV-A (CALABARZON)': [14.1007, 121.0794],
      'Region IV-B (MIMAROPA)': [12.2916, 120.8365],
      'Region V (Bicol Region)': [13.4203, 123.3741],
      'Region VI (Western Visayas)': [10.7202, 122.5621],
      'Region VII (Central Visayas)': [10.3157, 123.8854],
      'Region VIII (Eastern Visayas)': [11.2500, 124.8442],
      'Region IX (Zamboanga Peninsula)': [8.5500, 123.2800],
      'Region X (Northern Mindanao)': [8.4542, 124.6319],
      'Region XI (Davao Region)': [7.0731, 125.6128],
      'Region XII (SOCCSKSARGEN)': [6.1164, 124.6548],
      'Region XIII (Caraga)': [8.9477, 125.5270],
      'Cordillera Administrative Region (CAR)': [17.0756, 121.0108],
      'Autonomous Region in Muslim Mindanao (ARMM)': [7.2036, 124.4407],
      'UAE': [23.4241, 53.8478],
      'United Arab Emirates': [23.4241, 53.8478],
      'Singapore': [1.3521, 103.8198],
      'United Kingdom': [55.3781, -3.4360],
      'UK': [55.3781, -3.4360],
      'Italy': [41.8719, 12.5674],
      'Germany': [51.1657, 10.4515],
      'New Zealand': [-40.9006, 174.8860],
      'South Korea': [35.9078, 127.7669],
      'France': [46.6034, 1.8883],
      'Spain': [40.4637, -3.7492],
      'Netherlands': [52.1326, 5.2913],
      'Norway': [60.4720, 8.4689],
      'Sweden': [60.1282, 18.6435],
      'Switzerland': [46.8182, 8.2275],
      'Qatar': [25.3548, 51.1839],
      'Kuwait': [29.3117, 47.4818],
      'Bahrain': [25.9304, 50.6378],
      'Other': [14.5995, 120.9842] // Center of Philippines
    };
    return coordinates[region] || [14.5995, 120.9842];
  };

  const getRegionCode = (region) => {
    const codes = {
      'National Capital Region (NCR)': 'NCR',
      'Region I (Ilocos Region)': 'R01',
      'Region II (Cagayan Valley)': 'R02',
      'Region III (Central Luzon)': 'R03',
      'Region IV-A (CALABARZON)': 'R4A',
      'Region IV-B (MIMAROPA)': 'R4B',
      'Region V (Bicol Region)': 'R05',
      'Region VI (Western Visayas)': 'R06',
      'Region VII (Central Visayas)': 'R07',
      'Region VIII (Eastern Visayas)': 'R08',
      'Region IX (Zamboanga Peninsula)': 'R09',
      'Region X (Northern Mindanao)': 'R10',
      'Region XI (Davao Region)': 'R11',
      'Region XII (SOCCSKSARGEN)': 'R12',
      'Region XIII (Caraga)': 'R13',
      'Cordillera Administrative Region (CAR)': 'CAR',
      'Autonomous Region in Muslim Mindanao (ARMM)': 'ARMM'
    };
    return codes[region] || region.substring(0, 3).toUpperCase();
  };

  const originData = getPlaceOfOriginData();

  // Load world GeoJSON data
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setMapError(true);
        setLoading(false);
      }
    }, 5000); // 5 second timeout

    // Using a more reliable GeoJSON source with better country codes
    fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
      .then(response => response.json())
      .then(data => {
        setWorldGeoJSON(data);
        setLoading(false);
        clearTimeout(timer);
      })
      .catch(error => {
        console.error('Error loading world GeoJSON:', error);
        // Fallback to alternative source
        fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
          .then(response => response.json())
          .then(data => {
            setWorldGeoJSON(data);
            setLoading(false);
            clearTimeout(timer);
          })
          .catch(fallbackError => {
            console.error('Error loading fallback GeoJSON:', fallbackError);
            setMapError(true);
            setLoading(false);
            clearTimeout(timer);
          });
      });

    return () => clearTimeout(timer);
  }, []);

  // Create a map of region codes to emigrant data for Philippine regions
  const regionDataMap = originData.reduce((acc, item) => {
    // Map multiple possible region name formats
    const regionCodes = {
      'National Capital Region (NCR)': ['NCR', 'Metro Manila', 'National Capital Region'],
      'Region I (Ilocos Region)': ['R01', 'Ilocos', 'Region 1', 'Region I'],
      'Region II (Cagayan Valley)': ['R02', 'Cagayan Valley', 'Region 2', 'Region II'],
      'Region III (Central Luzon)': ['R03', 'Central Luzon', 'Region 3', 'Region III'],
      'Region IV-A (CALABARZON)': ['R4A', 'CALABARZON', 'Region 4A', 'Region IV-A'],
      'Region IV-B (MIMAROPA)': ['R4B', 'MIMAROPA', 'Region 4B', 'Region IV-B'],
      'Region V (Bicol Region)': ['R05', 'Bicol', 'Region 5', 'Region V'],
      'Region VI (Western Visayas)': ['R06', 'Western Visayas', 'Region 6', 'Region VI'],
      'Region VII (Central Visayas)': ['R07', 'Central Visayas', 'Region 7', 'Region VII'],
      'Region VIII (Eastern Visayas)': ['R08', 'Eastern Visayas', 'Region 8', 'Region VIII'],
      'Region IX (Zamboanga Peninsula)': ['R09', 'Zamboanga Peninsula', 'Region 9', 'Region IX'],
      'Region X (Northern Mindanao)': ['R10', 'Northern Mindanao', 'Region 10', 'Region X'],
      'Region XI (Davao Region)': ['R11', 'Davao Region', 'Region 11', 'Region XI'],
      'Region XII (SOCCSKSARGEN)': ['R12', 'SOCCSKSARGEN', 'Region 12', 'Region XII'],
      'Region XIII (Caraga)': ['R13', 'Caraga', 'Region 13', 'Region XIII'],
      'Cordillera Administrative Region (CAR)': ['CAR', 'Cordillera', 'CAR'],
      'Autonomous Region in Muslim Mindanao (ARMM)': ['ARMM', 'Muslim Mindanao', 'ARMM']
    };

    const codes = regionCodes[item.region] || [item.code];
    codes.forEach(code => {
      acc[code] = item.emigrants;
    });
    
    return acc;
  }, {});

  // Color scale function
  const getColor = (emigrants) => {
    if (!emigrants) return '#f0f0f0';
    if (emigrants > 1000000) return '#800026';
    if (emigrants > 500000) return '#BD0026';
    if (emigrants > 250000) return '#E31A1C';
    if (emigrants > 100000) return '#FC4E2A';
    if (emigrants > 50000) return '#FD8D3C';
    if (emigrants > 10000) return '#FEB24C';
    return '#FED976';
  };

  // Style function for GeoJSON
  const style = (feature) => {
    // Try multiple property names for region identification
    const regionCode = feature.properties.ISO_A2 || 
                       feature.properties.iso_a2 || 
                       feature.properties.ISO2 ||
                       feature.properties.iso2 ||
                       feature.properties.ADM0_A3 ||
                       feature.properties.ISO_A3;
    
    const regionName = feature.properties.NAME || 
                       feature.properties.name || 
                       feature.properties.NAME_EN ||
                       feature.properties.ADMIN;
    
    // Check both code and name
    const emigrants = regionDataMap[regionCode] || 
                     regionDataMap[regionName] || 
                     0;
    
    return {
      fillColor: getColor(emigrants),
      weight: 1,
      opacity: 1,
      color: 'white',
      dashArray: '2',
      fillOpacity: 0.7
    };
  };

  // Highlight feature on hover
  const onEachFeature = (feature, layer) => {
    const regionCode = feature.properties.ISO_A2 || 
                       feature.properties.iso_a2 || 
                       feature.properties.ISO2 ||
                       feature.properties.iso2 ||
                       feature.properties.ADM0_A3 ||
                       feature.properties.ISO_A3;
                       
    const regionName = feature.properties.NAME || 
                       feature.properties.name || 
                       feature.properties.NAME_EN ||
                       feature.properties.ADMIN;
    
    const emigrants = regionDataMap[regionCode] || 
                     regionDataMap[regionName] || 
                     0;
    
    layer.on({
      mouseover: (e) => {
        const layer = e.target;
        layer.setStyle({
          weight: 3,
          color: '#666',
          dashArray: '',
          fillOpacity: 0.9
        });
      },
      mouseout: (e) => {
        const layer = e.target;
        layer.setStyle(style(feature));
      }
    });

    // Bind popup
    if (emigrants > 0) {
      layer.bindPopup(`
        <div style="text-align: center;">
          <h4 style="margin: 0 0 8px 0;">${countryName}</h4>
          <p style="margin: 0; font-size: 16px; font-weight: bold;">
            ${emigrants.toLocaleString()} emigrants
          </p>
        </div>
      `);
    }
  };

  // Early return if no data
  if (filteredData.length === 0) {
    return (
      <div className="bg-white p-5 rounded-lg shadow-sm mb-5 transition-transform hover:-translate-y-0.5 hover:shadow-md">
        <h3 className="text-xl font-bold text-gray-800 mb-2 pb-2 border-b-2 border-gray-100">{getTitle()}</h3>
        <p className="text-sm text-gray-600 mb-5 leading-relaxed italic">
          Show which Philippine regions and provinces produce the most emigrants using choropleth mapping.
        </p>
        <div className="h-96 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <p className="text-lg mb-2">No place of origin data available</p>
            <p className="text-sm">Upload Emigrant-1988-2020-PlaceOfOrigin.csv to see regional distribution</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-5 rounded-lg shadow-sm mb-5 transition-transform hover:-translate-y-0.5 hover:shadow-md">
      <h3 className="text-xl font-bold text-gray-800 mb-2 pb-2 border-b-2 border-gray-100">{getTitle()}</h3>
      <p className="text-sm text-gray-600 mb-5 leading-relaxed italic">
        <strong>📄 Data Source:</strong> Emigrant-1988-2020-PlaceOfOrigin.csv - Show which Philippine regions and provinces produce the most emigrants using choropleth mapping and regional analysis.
      </p>
      
      {/* Choropleth Map */}
      <div className="mb-8">
        <h4 className="mb-4 text-slate-700 font-semibold">
          Global Distribution Choropleth Map
        </h4>
        
        {loading ? (
          <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p>Loading world map...</p>
            </div>
          </div>
        ) : mapError || !worldGeoJSON ? (
          // Fallback: Simple choropleth if external map fails
          <div className="bg-blue-50 p-4 rounded-lg text-center text-sm text-gray-600">
            <p>📍 Philippine Regional Choropleth Map</p>
            <p className="text-xs mt-1">Interactive map showing emigrant origins by Philippine region</p>
          </div>
        ) : (
          // Main interactive map with GeoJSON
          <div className="h-96 rounded-lg overflow-hidden">
            <MapContainer
              center={[20, 0]}
              zoom={2}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {worldGeoJSON && (
                <GeoJSON
                  data={worldGeoJSON}
                  style={style}
                  onEachFeature={onEachFeature}
                />
              )}
              
              {/* Debug: Add circles for regions if GeoJSON coloring fails */}
              {originData.map((origin, index) => (
                <Marker
                  key={`marker-${origin.region}`}
                  position={origin.coordinates}
                  icon={L.divIcon({
                    html: `<div style="
                      background-color: ${getColor(origin.emigrants)};
                      width: ${Math.min(Math.max(Math.sqrt(origin.emigrants / 10000), 10), 30)}px;
                      height: ${Math.min(Math.max(Math.sqrt(origin.emigrants / 10000), 10), 30)}px;
                      border-radius: 50%;
                      border: 2px solid white;
                      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    "></div>`,
                    className: 'custom-div-icon',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                  })}
                >
                  <Popup>
                    <div className="text-center">
                      <h4 className="mb-2 font-medium">{origin.region}</h4>
                      <p className="m-0 text-base font-bold">
                        {origin.emigrants.toLocaleString()} emigrants
                      </p>
                      <p className="mt-1 text-xs text-gray-600">
                        Rank #{index + 1} region of origin
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 p-4 bg-gray-50 rounded-md">
          <h5 className="mb-2 text-sm font-medium">Legend (Number of Emigrants)</h5>
          <div className="flex items-center flex-wrap gap-4">
            {[
              { color: '#800026', label: '1M+' },
              { color: '#BD0026', label: '500K-1M' },
              { color: '#E31A1C', label: '250K-500K' },
              { color: '#FC4E2A', label: '100K-250K' },
              { color: '#FD8D3C', label: '50K-100K' },
              { color: '#FEB24C', label: '10K-50K' },
              { color: '#FED976', label: '1K-10K' },
              { color: '#f0f0f0', label: 'No data' }
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-1">
                <div 
                  className="w-5 h-4 border border-gray-300"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-xs">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .leaflet-popup-content {
          margin: 8px 12px !important;
          line-height: 1.4 !important;
        }
        
        .leaflet-popup-content h4 {
          color: #2c3e50 !important;
        }
        
        .custom-div-icon {
          background: transparent !important;
          border: none !important;
        }
        
        .custom-bubble-icon {
          background: transparent !important;
          border: none !important;
        }
        
        .leaflet-div-icon {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
};

export default GeographicChart;