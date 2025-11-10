import React from 'react';

const SimpleChoroplethMap = ({ destinationData }) => {
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

  const countries = [
    { name: 'United States', code: 'US', x: 20, y: 45, width: 15, height: 8 },
    { name: 'Canada', code: 'CA', x: 15, y: 35, width: 18, height: 8 },
    { name: 'Australia', code: 'AU', x: 75, y: 70, width: 12, height: 8 },
    { name: 'Japan', code: 'JP', x: 78, y: 40, width: 6, height: 4 },
    { name: 'Saudi Arabia', code: 'SA', x: 58, y: 50, width: 8, height: 6 },
    { name: 'UAE', code: 'AE', x: 62, y: 52, width: 4, height: 3 },
    { name: 'Singapore', code: 'SG', x: 72, y: 58, width: 2, height: 2 },
    { name: 'United Kingdom', code: 'GB', x: 45, y: 35, width: 4, height: 5 },
    { name: 'Italy', code: 'IT', x: 50, y: 42, width: 3, height: 6 },
    { name: 'Germany', code: 'DE', x: 50, y: 38, width: 4, height: 4 }
  ];

  const countryDataMap = destinationData.reduce((acc, item) => {
    const mapping = {
      'USA': 'US',
      'United Kingdom': 'GB',
      'UAE': 'AE'
    };
    const code = mapping[item.country] || item.code;
    acc[code] = item.emigrants;
    return acc;
  }, {});

  return (
    <div style={{
      width: '100%',
      height: '400px',
      background: '#e6f3ff',
      borderRadius: '8px',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '15px',
        fontWeight: 'bold',
        fontSize: '16px',
        color: '#2c3e50'
      }}>
        Choropleth-Style World Map
      </div>
      
      {/* Simplified SVG World Map */}
      <svg 
        width="100%" 
        height="300" 
        viewBox="0 0 100 80" 
        style={{ background: '#87CEEB' }}
      >
        {/* World base (simplified) */}
        <rect width="100" height="80" fill="#87CEEB" />
        
        {/* Continents (simplified shapes) */}
        <path d="M10,20 Q25,15 40,25 L45,35 Q30,45 15,40 Z" fill="#d3d3d3" stroke="white" strokeWidth="0.2" />
        <path d="M45,25 Q60,20 75,30 L80,40 Q65,50 50,45 Z" fill="#d3d3d3" stroke="white" strokeWidth="0.2" />
        <path d="M70,55 Q85,50 95,60 L90,75 Q75,70 70,60 Z" fill="#d3d3d3" stroke="white" strokeWidth="0.2" />
        
        {/* Country representations */}
        {countries.map(country => {
          const emigrants = countryDataMap[country.code] || 0;
          const color = getColor(emigrants);
          
          return (
            <g key={country.code}>
              <rect
                x={country.x}
                y={country.y}
                width={country.width}
                height={country.height}
                fill={color}
                stroke="white"
                strokeWidth="0.3"
                style={{ cursor: 'pointer' }}
              >
                <title>{`${country.name}: ${emigrants.toLocaleString()} emigrants`}</title>
              </rect>
              
              {/* Country labels for top destinations */}
              {emigrants > 200000 && (
                <text
                  x={country.x + country.width / 2}
                  y={country.y + country.height / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="2"
                  fill="white"
                  fontWeight="bold"
                >
                  {country.code}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      
      {/* Interactive overlays for major destinations */}
      <div style={{
        position: 'absolute',
        top: '100px',
        right: '20px',
        background: 'rgba(255,255,255,0.95)',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        maxWidth: '200px'
      }}>
        <h5 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Top Destinations</h5>
        {destinationData.slice(0, 5).map((dest, index) => (
          <div key={dest.country} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '5px 0',
            borderBottom: index < 4 ? '1px solid #eee' : 'none'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: getColor(dest.emigrants),
                borderRadius: '2px'
              }}></div>
              <span style={{ fontSize: '12px' }}>{dest.country}</span>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>
              {(dest.emigrants / 1000).toFixed(0)}K
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SimpleChoroplethMap;