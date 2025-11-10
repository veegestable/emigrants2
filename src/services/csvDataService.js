// Fallback CSV parser if papaparse is not available
const parseCSVFallback = (csvText) => {
  const lines = csvText.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
};

// Import Firebase functions
import { db } from '../firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, writeBatch, query, where } from 'firebase/firestore';

// CSV file configurations
export const csvConfigurations = {
  age: {
    fileName: 'Emigrant-1981-2020-Age.csv',
    keyField: 'AGE_GROUP',
    displayName: 'Age Group',
    yearFields: ['1981', '1982', '1983', '1984', '1985', '1986', '1987', '1988', '1989', '1990', '1991', '1992', '1993', '1994', '1995', '1996', '1997', '1998', '1999', '2000', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020'],
    chartType: 'distribution', // 📊 Distribution - violin plot/density plot showing age distribution by year
    purpose: 'Distribution Analysis',
    predefinedOptions: [
      '14 - Below', '15 - 19', '20 - 24', '25 - 29', '30 - 34', '35 - 39', 
      '40 - 44', '45 - 49', '50 - 54', '55 - 59', '60 - 64', '65 - 69', 
      '70 - Above', 'Not Reported / No Response'
    ],
    inputFields: [
      { name: 'ageGroup', type: 'select', label: 'Age Group', required: true },
      { name: 'year', type: 'select', label: 'Year', required: true },
      { name: 'count', type: 'number', label: 'Count', required: true, min: 0 }
    ]
  },
  occupation: {
    fileName: 'Emigrant-1981-2020-Occu.csv',
    keyField: 'Occupation',
    displayName: 'Occupation',
    yearFields: ['1981', '1982', '1983', '1984', '1985', '1986', '1987', '1988', '1989', '1990', '1991', '1992', '1993', '1994', '1995', '1996', '1997', '1998', '1999', '2000', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020'],
    chartType: 'trends', // � Multi-series line chart showing occupation trends over time
    purpose: 'Trends Analysis',
    predefinedOptions: [
      "Prof'l", 'Managerial', 'Clerical', 'Sales', 'Service', 'Agriculture', 
      'Production', 'Armed Forces', 'Housewives', 'Retirees', 'Students', 
      'Minors', 'Out of School Youth', 'No Occupation Reported'
    ],
    inputFields: [
      { name: 'occupation', type: 'select', label: 'Occupation', required: true },
      { name: 'year', type: 'select', label: 'Year', required: true },
      { name: 'count', type: 'number', label: 'Count', required: true, min: 0 }
    ]
  },
  education: {
    fileName: 'Emigrant-1988-2020-Educ.csv',
    keyField: 'EDUCATIONAL ATTAINMENT',
    displayName: 'Education Level',
    yearFields: ['1988', '1989', '1990', '1991', '1992', '1993', '1994', '1995', '1996', '1997', '1998', '1999', '2000', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020'],
    chartType: 'trends', // Keep original chart type
    purpose: 'Composition Analysis',
    predefinedOptions: [
      'Not of Schooling Age', 'No Formal Education', 'Elementary Level', 'Elementary Graduate', 
      'High School Level', 'High School Graduate', 'Vocational Level', 'Vocational Graduate', 
      'College Level', 'College Graduate', 'Post Graduate Level', 'Post Graduate', 
      'Non-Formal Education', 'Not Reported / No Response'
    ],
    inputFields: [
      { name: 'educationLevel', type: 'select', label: 'Education Level', required: true },
      { name: 'year', type: 'select', label: 'Year', required: true },
      { name: 'count', type: 'number', label: 'Count', required: true, min: 0 }
    ]
  },
  civilStatus: {
    fileName: 'Emigrant-1988-2020-CivilStatus.csv',
    keyField: 'YEAR',
    displayName: 'Civil Status',
    yearFields: ['Single', 'Married', 'Widower', 'Separated', 'Divorced', 'Not Reported'],
    chartType: 'stackedAreaPercent', // 🧠 Composition (Detailed) - 100% stacked area showing civil status breakdown by year
    purpose: 'Composition Analysis',
    predefinedOptions: [
      'Single', 'Married', 'Widower', 'Separated', 'Divorced', 'Not Reported'
    ],
    inputFields: [
      { name: 'civilStatus', type: 'select', label: 'Civil Status', required: true },
      { name: 'year', type: 'select', label: 'Year', required: true },
      { name: 'count', type: 'number', label: 'Count', required: true, min: 0 }
    ]
  },
  destination: {
    fileName: 'Emigrant-1981-2020-MajorCountry.csv',
    keyField: 'YEAR',
    displayName: 'Destination Country',
    yearFields: ['USA', 'CANADA', 'JAPAN', 'AUSTRALIA', 'ITALY', 'NEW ZEALAND', 'UNITED KINGDOM', 'GERMANY', 'SOUTH KOREA', 'SPAIN', 'OTHERS'],
    chartType: 'trends', // Keep original chart type
    purpose: 'Composition Analysis',
    predefinedOptions: [
      'USA', 'CANADA', 'JAPAN', 'AUSTRALIA', 'ITALY', 'NEW ZEALAND', 'UNITED KINGDOM', 
      'GERMANY', 'SOUTH KOREA', 'SPAIN', 'OTHERS'
    ],
    inputFields: [
      { name: 'destinationCountry', type: 'select', label: 'Destination Country', required: true },
      { name: 'year', type: 'select', label: 'Year', required: true },
      { name: 'count', type: 'number', label: 'Count', required: true, min: 0 }
    ]
  },
  sex: {
    fileName: 'Emigrant-1981-2020-Sex.csv',
    keyField: 'YEAR',
    displayName: 'Sex',
    yearFields: ['MALE', 'FEMALE'],
    chartType: 'scatter', // Keep original chart type
    purpose: 'Relationship Analysis',
    predefinedOptions: [
      'MALE', 'FEMALE'
    ],
    inputFields: [
      { name: 'year', type: 'select', label: 'Year', required: true },
      { name: 'male', type: 'number', label: 'Male Count', required: true, min: 0 },
      { name: 'female', type: 'number', label: 'Female Count', required: true, min: 0 }
    ]
  },
  region: {
    fileName: 'Emigrant-1988-2020-PlaceOfOrigin.csv',
    keyField: 'REGION',
    displayName: 'Region of Origin',
    yearFields: ['1988', '1989', '1990', '1991', '1992', '1993', '1994', '1995', '1996', '1997', '1998', '1999', '2000', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020'],
    chartType: 'groupedBar', // � Comparison - grouped bar chart showing regions compared by year
    purpose: 'Comparison Analysis',
    predefinedOptions: [
      'Region I - Ilocos Region', 'Region II - Cagayan Valley', 'Region III - Central Luzon',
      'Region IV A - CALABARZON', 'Region IV B - MIMAROPA', 'Region V - Bicol Region',
      'Region VI - Western Visayas', 'Region VII - Central Visayas', 'Region VIII - Eastern Visayas',
      'Region IX - Zamboanga Peninsula', 'Region X - Northern Mindanao', 'Region XI - Davao Region',
      'Region XII - SOCCSKSARGEN', 'Region XIII - Caraga', 'Autonomous Region in Muslim Mindanao (ARMM)',
      'Cordillera Administrative Region (CAR)', 'National Capital Region (NCR)'
    ],
    inputFields: [
      { name: 'region', type: 'select', label: 'Region', required: true },
      { name: 'year', type: 'select', label: 'Year', required: true },
      { name: 'count', type: 'number', label: 'Count', required: true, min: 0 }
    ]
  },
  total: {
    fileName: 'Emigrant-1981-2020-Total.csv',
    keyField: 'YEAR',
    displayName: 'Year',
    yearFields: ['TOTAL'],
    chartType: 'line', // Simple 2D data: year x total_count - line chart showing overall trends
    purpose: 'Overall Trends',
    predefinedOptions: [],
    inputFields: [
      { name: 'year', type: 'select', label: 'Year', required: true },
      { name: 'total', type: 'number', label: 'Total Count', required: true, min: 0 }
    ]
  },
  relationship: {
    fileName: 'Emigrant-1981-2020-Relationship.csv',
    keyField: 'RELATIONSHIP_TYPE',
    displayName: 'Relationship Type',
    yearFields: ['1981', '1982', '1983', '1984', '1985', '1986', '1987', '1988', '1989', '1990', '1991', '1992', '1993', '1994', '1995', '1996', '1997', '1998', '1999', '2000', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020'],
    chartType: 'stackedArea', // 3D data: relationship_type x year x count - good for showing family relationship trends
    purpose: 'Family Relationship Trends',
    predefinedOptions: [
      'Principal Applicant', 'Spouse', 'Child', 'Parent', 'Sibling', 'Other Relative', 'Not Reported'
    ],
    inputFields: [
      { name: 'relationshipType', type: 'select', label: 'Relationship Type', required: true },
      { name: 'year', type: 'select', label: 'Year', required: true },
      { name: 'count', type: 'number', label: 'Count', required: true, min: 0 }
    ]
  },
  allCountries: {
    fileName: 'Emigrant-1981-2020-AllCountries.csv',
    keyField: 'COUNTRY',
    displayName: 'Country',
    yearFields: ['1981', '1982', '1983', '1984', '1985', '1986', '1987', '1988', '1989', '1990', '1991', '1992', '1993', '1994', '1995', '1996', '1997', '1998', '1999', '2000', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020'],
    chartType: 'worldMap', // Keep original chart type
    purpose: 'Comparison Analysis',
    predefinedOptions: [
      'AFGHANISTAN', 'ALBANIA', 'ALGERIA', 'ANGOLA', 'ARGENTINA', 'ARMENIA', 'AUSTRALIA', 'AUSTRIA', 
      'AZERBAIJAN', 'BAHAMAS', 'BANGLADESH', 'BELARUS', 'BELGIUM', 'BELIZE', 'BENIN', 'BHUTAN', 
      'BOLIVIA', 'BOSNIA AND HERZEGOVINA', 'BOTSWANA', 'BRAZIL', 'BRUNEI DARUSSALAM', 'BULGARIA', 
      'BURKINA', 'BURUNDI', 'CAMBODIA', 'CAMEROON', 'CANADA', 'CENTRAL AFRICAN REPUBLIC', 'CHAD', 
      'CHILE', 'CHINA (P.R.O.C.)', 'COLOMBIA', 'COSTA RICA', 'COTE D\' IVOIRE (IVORY COAST)', 'CROATIA', 
      'CUBA', 'CYPRUS', 'CZECH REPUBLIC', 'DEMOCRATIC REPUBLIC OF THE CONGO (ZAIRE)', 'DENMARK', 
      'DJIBOUTI', 'DOMINICAN REPUBLIC', 'ECUADOR', 'EGYPT', 'EL SALVADOR', 'EQUATORIAL GUINEA', 
      'ESTONIA', 'ETHIOPIA', 'FALKLAND ISLANDS (MALVINAS)', 'FIJI', 'FINLAND', 'FRANCE', 'GABON', 
      'GAMBIA', 'GEORGIA', 'GERMANY', 'GHANA', 'GREECE', 'GUATEMALA', 'GUINEA', 'GUYANA', 'HAITI', 
      'HONDURAS', 'HONG KONG', 'HUNGARY', 'ICELAND', 'INDIA', 'INDONESIA', 'IRAN', 'IRAQ', 'IRELAND', 
      'ISRAEL', 'ITALY', 'JAMAICA', 'JAPAN', 'JORDAN', 'KAZAKHSTAN', 'KENYA', 'KUWAIT', 'KYRGYZSTAN', 
      'LAOS', 'LATVIA', 'LEBANON', 'LESOTHO', 'LIBYA', 'LITHUANIA', 'LUXEMBOURG', 'MACEDONIA', 
      'MADAGASCAR', 'MALAWI', 'MALAYSIA', 'MALDIVES', 'MALI', 'MALTA', 'MAURITIUS', 'MEXICO', 
      'MONGOLIA', 'MOROCCO', 'MOZAMBIQUE', 'MYANMAR', 'NEPAL', 'NETHERLANDS', 'NEW ZEALAND', 
      'NICARAGUA', 'NIGERIA', 'NORTH KOREA', 'NORWAY', 'OMAN', 'PAKISTAN', 'PANAMA', 'PARAGUAY', 
      'PERU', 'POLAND', 'PORTUGAL', 'PUERTO RICO', 'QATAR', 'ROMANIA', 'RUSSIAN FEDERATION / USSR', 
      'RWANDA', 'SAUDI ARABIA', 'SEYCHELLES', 'SIERRA LEONE', 'SINGAPORE', 'SLOVAK REPUBLIC', 
      'SLOVENIA', 'SOLOMON ISLANDS', 'SOUTH AFRICA', 'SOUTH KOREA', 'SPAIN', 'SRI LANKA', 'SURINAME', 
      'SWAZILAND', 'SWEDEN', 'SWITZERLAND', 'SYRIA', 'TAIWAN (ROC)', 'TANZANIA', 'THAILAND', 
      'TRINIDAD AND TOBAGO', 'TUNISIA', 'TURKEY', 'UGANDA', 'UKRAINE', 'UNITED ARAB EMIRATES', 
      'UNITED KINGDOM', 'UNITED STATES OF AMERICA', 'URUGUAY', 'VENEZUELA', 'VIETNAM', 'YEMEN', 
      'ZAMBIA', 'ZIMBABWE', 'OTHERS'
    ],
    inputFields: [
      { name: 'country', type: 'select', label: 'Country', required: true },
      { name: 'year', type: 'select', label: 'Year', required: true },
      { name: 'count', type: 'number', label: 'Count', required: true, min: 0 }
    ]
  },
  province: {
    fileName: 'Emigrant-1988-2020-PlaceOfOrigin-Province.csv',
    keyField: 'PROVINCE',
    displayName: 'Province',
    yearFields: ['1988', '1989', '1990', '1991', '1992', '1993', '1994', '1995', '1996', '1997', '1998', '1999', '2000', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020'],
    chartType: 'choropleth', // 📊 Geographic - interactive choropleth map of Philippine provinces
    purpose: 'Geographic Representation',
    predefinedOptions: [
      // Luzon
      'ABRA', 'ALBAY', 'APAYAO', 'AURORA', 'BATAAN', 'BATANES', 'BATANGAS', 'BENGUET', 'BULACAN', 'CAGAYAN', 
      'CAMARINES NORTE', 'CAMARINES SUR', 'CATANDUANES', 'CAVITE', 'IFUGAO', 'ILOCOS NORTE', 'ILOCOS SUR', 
      'ISABELA', 'KALINGA', 'LA UNION', 'LAGUNA', 'MARINDUQUE', 'MASBATE', 'METRO MANILA', 'MOUNTAIN PROVINCE', 
      'NUEVA ECIJA', 'NUEVA VIZCAYA', 'OCCIDENTAL MINDORO', 'ORIENTAL MINDORO', 'PALAWAN', 'PAMPANGA', 
      'PANGASINAN', 'QUEZON', 'QUIRINO', 'RIZAL', 'ROMBLON', 'SORSOGON', 'TARLAC', 'ZAMBALES',
      
      // Visayas
      'AKLAN', 'ANTIQUE', 'BOHOL', 'CAPIZ', 'CEBU', 'EASTERN SAMAR', 'GUIMARAS', 'ILOILO', 'LEYTE', 
      'NEGROS OCCIDENTAL', 'NEGROS ORIENTAL', 'NORTHERN SAMAR', 'SAMAR', 'SIQUIJOR', 'SOUTHERN LEYTE',
      
      // Mindanao
      'AGUSAN DEL NORTE', 'AGUSAN DEL SUR', 'BASILAN', 'BUKIDNON', 'CAMIGUIN', 'COMPOSTELA VALLEY', 
      'DAVAO DEL NORTE', 'DAVAO DEL SUR', 'DAVAO OCCIDENTAL', 'DAVAO ORIENTAL', 'DINAGAT ISLANDS', 
      'LANAO DEL NORTE', 'LANAO DEL SUR', 'MAGUINDANAO', 'MISAMIS OCCIDENTAL', 'MISAMIS ORIENTAL', 
      'NORTH COTABATO', 'SARANGANI', 'SOUTH COTABATO', 'SULTAN KUDARAT', 'SULU', 'SURIGAO DEL NORTE', 
      'SURIGAO DEL SUR', 'TAWI-TAWI', 'ZAMBOANGA DEL NORTE', 'ZAMBOANGA DEL SUR', 'ZAMBOANGA SIBUGAY'
    ].sort(),
    inputFields: [
      { name: 'province', type: 'select', label: 'Province', required: true },
      { name: 'year', type: 'select', label: 'Year', required: true },
      { name: 'count', type: 'number', label: 'Count', required: true, min: 0 }
    ]
  }
};

// CSV data service class
export class CSVDataService {
  constructor(datasetType) {
    this.config = csvConfigurations[datasetType];
    this.data = [];
    this.datasetType = datasetType;
    this.collectionName = `csv_data_${datasetType}`;
  }

  // Load data from Firebase
  async loadFromFirebase() {
    try {
      console.log(`Loading from Firebase collection: ${this.collectionName}`);
      const csvCollection = collection(db, this.collectionName);
      const snapshot = await getDocs(csvCollection);
      
      console.log(`Firebase snapshot has ${snapshot.docs.length} documents for ${this.datasetType}`);
      
      const firebaseData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      
      if (firebaseData.length > 0) {
        console.log(`Sample Firebase document for ${this.datasetType}:`, firebaseData[0]);
      }
      
      // Convert Firebase documents back to CSV format
      this.data = firebaseData.map(item => {
        const { id, ...csvRow } = item; // Remove Firebase doc ID
        return csvRow;
      });
      
      console.log(`Loaded ${this.data.length} records from Firebase for ${this.datasetType}`);
      console.log(`Sample processed data for ${this.datasetType}:`, this.data[0]);
      
      return this.data;
    } catch (error) {
      console.error('Error loading from Firebase:', error);
      return [];
    }
  }

  // Save data to Firebase
  async saveToFirebase() {
    try {
      const csvCollection = collection(db, this.collectionName);
      
      // Clear existing data first
      const existingSnapshot = await getDocs(csvCollection);
      const batch = writeBatch(db);
      
      existingSnapshot.docs.forEach((document) => {
        batch.delete(document.ref);
      });
      
      // Add new data
      this.data.forEach((row) => {
        const docRef = doc(csvCollection);
        batch.set(docRef, row);
      });
      
      await batch.commit();
      console.log(`Saved ${this.data.length} records to Firebase for ${this.datasetType}`);
    } catch (error) {
      console.error('Error saving to Firebase:', error);
      throw error;
    }
  }

  // Add a single record and save to Firebase
  async addRecordToFirebase(categoryValue, year, count) {
    try {
      // Add to local data first
      this.addSimpleRecord(categoryValue, year, count);
      
      // Save all data to Firebase
      await this.saveToFirebase();
      
      return this.data;
    } catch (error) {
      console.error('Error adding record to Firebase:', error);
      throw error;
    }
  }

  // Update a record and save to Firebase
  async updateRecordInFirebase(categoryValue, year, count) {
    try {
      // Update local data first
      this.updateSimpleRecord(categoryValue, year, count);
      
      // Save all data to Firebase
      await this.saveToFirebase();
      
      return this.data;
    } catch (error) {
      console.error('Error updating record in Firebase:', error);
      throw error;
    }
  }

  // Delete a record and save to Firebase
  async deleteRecordFromFirebase(categoryValue, year) {
    try {
      // Delete from local data first
      this.deleteSimpleRecord(categoryValue, year);
      
      // Save all data to Firebase
      await this.saveToFirebase();
      
      return this.data;
    } catch (error) {
      console.error('Error deleting record from Firebase:', error);
      throw error;
    }
  }

  // Parse uploaded CSV file
  parseCSV(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csvText = e.target.result;
          
          // Try to use Papa Parse if available, otherwise use fallback
          if (typeof window !== 'undefined' && window.Papa) {
            window.Papa.parse(csvText, {
              header: true,
              complete: (results) => {
                try {
                  const processedData = this.processCSVData(results.data);
                  this.data = processedData;
                  resolve(processedData);
                } catch (error) {
                  reject(error);
                }
              },
              error: (error) => {
                reject(error);
              }
            });
          } else {
            // Fallback parser
            const rawData = parseCSVFallback(csvText);
            const processedData = this.processCSVData(rawData);
            this.data = processedData;
            resolve(processedData);
          }
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // Process raw CSV data according to configuration
  processCSVData(rawData) {
    return rawData
      .filter(row => row[this.config.keyField] && row[this.config.keyField].trim() !== '')
      .map(row => {
        const processed = {};
        
        // Set the key field
        processed[this.config.keyField.toLowerCase()] = row[this.config.keyField];
        
        // Process year fields
        this.config.yearFields.forEach(year => {
          if (row[year] !== undefined) {
            processed[year] = parseInt(row[year]) || 0;
          }
        });
        
        return processed;
      });
  }

  // Convert data to CSV format for export
  exportToCSV() {
    const csvData = this.data.map(row => {
      const csvRow = {};
      csvRow[this.config.keyField] = row[this.config.keyField.toLowerCase()];
      
      this.config.yearFields.forEach(year => {
        csvRow[year] = row[year] || 0;
      });
      
      return csvRow;
    });
    
    // Create CSV string manually
    const headers = [this.config.keyField, ...this.config.yearFields];
    const csvRows = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => row[header] || '').join(','))
    ];
    const csv = csvRows.join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.config.fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // CRUD operations
  addRow(newRow) {
    const processedRow = {};
    processedRow[this.config.keyField.toLowerCase()] = newRow[this.config.keyField.toLowerCase()] || '';
    
    this.config.yearFields.forEach(year => {
      processedRow[year] = parseInt(newRow[year]) || 0;
    });
    
    this.data.push(processedRow);
    return this.data;
  }

  updateRow(index, updatedRow) {
    if (index >= 0 && index < this.data.length) {
      this.data[index] = { ...this.data[index], ...updatedRow };
    }
    return this.data;
  }

  deleteRow(index) {
    if (index >= 0 && index < this.data.length) {
      this.data.splice(index, 1);
    }
    return this.data;
  }

  // Simplified CRUD methods for specific field + year format
  addSimpleRecord(categoryValue, year, count) {
    
    console.log('🎯 addSimpleRecord called:', {
      categoryValue,
      year, 
      count,
      keyField: this.config.keyField,
      isYearBased: this.config.keyField === 'YEAR',
      datasetType: this.config.fileName?.includes('CivilStatus') ? 'civilStatus' : 'other'
    });
    
    // 🎯 YEAR-BASED DATASETS (Civil Status, Sex, Destination, Total)
    if (this.config.keyField === 'YEAR') {
      console.log('📊 Processing year-based dataset');
      
      // Find existing row with this year - handle both 'year' and 'YEAR' field names
      let existingRowIndex = this.data.findIndex(row => {
        const rowYear = row.year || row.YEAR || row['year'] || row['YEAR'];
        return rowYear?.toString() === year.toString();
      });

      console.log('📊 Year-based search result:', {
        searchYear: year,
        existingRowIndex,
        existingRow: existingRowIndex >= 0 ? this.data[existingRowIndex] : null
      });

      if (existingRowIndex !== -1) {
        // 🎯 ADDITIVE BEHAVIOR: Add to existing value for the category
        const existingValue = parseInt(this.data[existingRowIndex][categoryValue]) || 0;
        const newValue = parseInt(count) || 0;
        this.data[existingRowIndex][categoryValue] = existingValue + newValue;
        
        console.log(`📊 Adding emigrant data (year-based): ${categoryValue} ${year}`, {
          existingValue,
          addingValue: newValue,
          newTotal: existingValue + newValue,
          updatedRow: this.data[existingRowIndex]
        });
      } else {
        // Create new row for this year
        const newRow = { year: parseInt(year) };
        newRow[categoryValue] = parseInt(count) || 0;
        
        console.log(`📊 Creating new emigrant record (year-based): ${categoryValue} ${year} = ${count}`, newRow);
        
        this.data.push(newRow);
      }
    } 
    // 🎯 CATEGORY-BASED DATASETS (Age, Education, Occupation, Region)
    else {
      // Find existing row with this category
      const keyFieldLower = this.config.keyField.toLowerCase();
      console.log('🎯 Category-based search:', {
        categoryValue,
        keyField: this.config.keyField,
        keyFieldLower,
        existingCategories: this.data.map(row => row[keyFieldLower] || row[this.config.keyField]).filter(Boolean)
      });
      
      let existingRowIndex = this.data.findIndex(row => 
        row[keyFieldLower] === categoryValue || row[this.config.keyField] === categoryValue
      );

      console.log('🎯 Category search result:', {
        existingRowIndex,
        foundRow: existingRowIndex >= 0 ? this.data[existingRowIndex] : null
      });

      if (existingRowIndex !== -1) {
        // 🎯 ADDITIVE BEHAVIOR: Add to existing value instead of replacing
        const existingValue = parseInt(this.data[existingRowIndex][year]) || 0;
        const newValue = parseInt(count) || 0;
        this.data[existingRowIndex][year] = existingValue + newValue;
        
        console.log(`📊 Adding emigrant data (category-based): ${categoryValue} ${year}`, {
          existingValue,
          addingValue: newValue,
          newTotal: existingValue + newValue
        });
      } else {
        // Create new row - only initialize the specific year, not all years
        const newRow = {};
        newRow[keyFieldLower] = categoryValue;
        
        // Only set the specific year that was requested, don't initialize all years
        newRow[year] = parseInt(count) || 0;
        
        console.log(`📊 Creating new emigrant record (category-based): ${categoryValue} ${year} = ${count}`);
        
        this.data.push(newRow);
      }
    }
    
    return this.data;
  }

  updateSimpleRecord(categoryValue, year, count) {
    
    // 🎯 YEAR-BASED DATASETS (Civil Status, Sex, Destination, Total)
    if (this.config.keyField === 'YEAR') {
      // Find existing row with this year
      let existingRowIndex = this.data.findIndex(row => 
        row.year?.toString() === year.toString() || row['year']?.toString() === year.toString()
      );

      if (existingRowIndex !== -1) {
        // 🎯 UPDATE BEHAVIOR: Replace existing value for the category
        const oldValue = parseInt(this.data[existingRowIndex][categoryValue]) || 0;
        const newValue = parseInt(count) || 0;
        this.data[existingRowIndex][categoryValue] = newValue;
        
        console.log(`✏️ Updating emigrant data (year-based): ${categoryValue} ${year}`, {
          oldValue,
          newValue,
          change: newValue - oldValue
        });
      } else {
        // Create new row for this year
        const newRow = { year: parseInt(year) };
        newRow[categoryValue] = parseInt(count) || 0;
        
        console.log(`✏️ Creating new emigrant record via update (year-based): ${categoryValue} ${year} = ${count}`);
        
        this.data.push(newRow);
      }
    } 
    // 🎯 CATEGORY-BASED DATASETS (Age, Education, Occupation, Region)
    else {
      // Find existing row with this category
      const keyFieldLower = this.config.keyField.toLowerCase();
      let existingRowIndex = this.data.findIndex(row => 
        row[keyFieldLower] === categoryValue || row[this.config.keyField] === categoryValue
      );

      if (existingRowIndex !== -1) {
        // 🎯 UPDATE BEHAVIOR: Replace existing value (for corrections)
        const oldValue = parseInt(this.data[existingRowIndex][year]) || 0;
        const newValue = parseInt(count) || 0;
        this.data[existingRowIndex][year] = newValue;
        
        console.log(`✏️ Updating emigrant data (category-based): ${categoryValue} ${year}`, {
          oldValue,
          newValue,
          change: newValue - oldValue
        });
      } else {
        // If no existing record, create new one
        const newRow = {};
        newRow[keyFieldLower] = categoryValue;
        newRow[year] = parseInt(count) || 0;
        
        console.log(`✏️ Creating new emigrant record via update (category-based): ${categoryValue} ${year} = ${count}`);
        
        this.data.push(newRow);
      }
    }
    
    return this.data;
  }

  deleteSimpleRecord(categoryValue, year) {
    console.log('🗑️ CSV SERVICE DELETE SIMPLE RECORD', { 
      categoryValue, 
      year, 
      keyField: this.config.keyField,
      isYearBased: this.config.keyField === 'YEAR'
    });

    // For year-based datasets (like civilStatus, destination, sex)
    if (this.config.keyField === 'YEAR') {
      console.log('🗑️ Year-based delete logic');
      const yearValue = parseInt(year);
      const existingRowIndex = this.data.findIndex(row => 
        parseInt(row.YEAR || row.year) === yearValue
      );

      if (existingRowIndex !== -1) {
        console.log('🗑️ Found row to modify at index:', existingRowIndex);
        // Set the specific category to 0
        this.data[existingRowIndex][categoryValue] = 0;
        
        // Check if all category values are now 0 (excluding year field)
        const categoryFields = this.config.yearFields || Object.keys(this.data[existingRowIndex]).filter(key => 
          key !== 'YEAR' && key !== 'year' && key !== 'id'
        );
        
        const hasNonZeroValue = categoryFields.some(field => 
          (this.data[existingRowIndex][field] || 0) > 0
        );
        
        if (!hasNonZeroValue) {
          console.log('🗑️ All categories are 0, removing entire row');
          this.data.splice(existingRowIndex, 1);
        } else {
          console.log('🗑️ Other categories still have values, keeping row');
        }
      } else {
        console.log('🗑️ Year not found:', yearValue);
      }
    } else {
      // Original logic for category-based datasets
      console.log('🗑️ Category-based delete logic');
      const keyFieldLower = this.config.keyField.toLowerCase();
      const existingRowIndex = this.data.findIndex(row => 
        row[keyFieldLower] === categoryValue
      );

      if (existingRowIndex !== -1) {
        // Set the specific year to 0 instead of deleting the whole row
        this.data[existingRowIndex][year] = 0;
        
        // If all years are 0, remove the row entirely
        const hasNonZeroValue = this.config.yearFields.some(yearField => 
          (this.data[existingRowIndex][yearField] || 0) > 0
        );
        
        if (!hasNonZeroValue) {
          this.data.splice(existingRowIndex, 1);
        }
      }
    }
    
    console.log('🗑️ Delete completed, data length:', this.data.length);
    return this.data;
  }

  // Get predefined options for the category field
  getPredefinedOptions() {
    return this.config.predefinedOptions || [];
  }

  // Get input field configuration
  getInputFields() {
    return this.config.inputFields || [];
  }

  // Get a specific record for editing
  getRecord(categoryValue, year) {
    const keyFieldLower = this.config.keyField.toLowerCase();
    const row = this.data.find(row => row[keyFieldLower] === categoryValue);
    
    return {
      category: categoryValue,
      year: year,
      count: row ? (row[year] || 0) : 0
    };
  }

  // Data processing for different chart types
  getDataForTrends() {
    if (this.config.keyField === 'YEAR') {
      // For year-based data (sex, civil status, destination), return with all category fields
      return this.data.map(row => {
        // Handle both 'year' and 'YEAR' field names for backwards compatibility
        const yearValue = row.year || row.YEAR || row['year'] || row['YEAR'];
        const yearData = { year: parseInt(yearValue) };
        
        // Add all category fields (countries, genders, civil status types)
        this.config.yearFields.forEach(field => {
          yearData[field] = parseInt(row[field]) || 0;
        });
        
        // Also add TOTAL if it exists (for total dataset)
        if (row.TOTAL !== undefined) {
          yearData.total = parseInt(row.TOTAL) || 0;
        }
        
        return yearData;
      });
    }
    
    // For other datasets, aggregate by year
    const years = this.config.yearFields.filter(year => year.match(/^\d{4}$/));
    return years.map(year => {
      const yearData = { year: parseInt(year) };
      this.data.forEach(row => {
        const key = row[this.config.keyField.toLowerCase()];
        yearData[key] = row[year] || 0;
      });
      return yearData;
    });
  }

  getDataForComparison(selectedYear) {
    if (!selectedYear) {
      console.log('getDataForComparison: No year selected');
      return [];
    }
    
    console.log('getDataForComparison:', { selectedYear, dataLength: this.data.length, keyField: this.config.keyField });
    
    const result = this.data.map(row => {
      // Try both lowercase and original case for keyField
      const category = row[this.config.keyField.toLowerCase()] || row[this.config.keyField];
      const value = row[selectedYear.toString()] || 0;
      
      console.log('Processing row:', { row, category, value, selectedYear });
      
      return {
        category,
        value: parseInt(value) || 0
      };
    }).filter(item => item.category && item.value > 0);
    
    console.log('getDataForComparison result:', result);
    return result;
  }

  getDataForComposition(selectedYear) {
    if (!selectedYear) {
      console.log('getDataForComposition: No year selected');
      return [];
    }
    
    console.log('getDataForComposition:', { selectedYear, dataLength: this.data.length });
    
    const result = this.data.map(row => {
      // Try both lowercase and original case for keyField
      const name = row[this.config.keyField.toLowerCase()] || row[this.config.keyField];
      const value = row[selectedYear.toString()] || 0;
      
      return {
        name,
        value: parseInt(value) || 0
      };
    }).filter(item => item.name && item.value > 0);
    
    console.log('getDataForComposition result:', result);
    return result;
  }

  // Get years available in the dataset
  getAvailableYears() {
    if (this.config.keyField === 'YEAR') {
      // For datasets where YEAR is the key field, extract years from the actual data
      if (this.data.length > 0) {
        return this.data
          .map(row => parseInt(row.YEAR || row.year))
          .filter(year => !isNaN(year))
          .sort((a, b) => a - b);
      }
      // If no data, return empty array (user needs to upload data first)
      return [];
    }
    // For other datasets, return configured year fields as integers
    return this.config.yearFields.filter(year => year.match(/^\d{4}$/)).map(year => parseInt(year));
  }

  // Get field names for display
  getFieldNames() {
    return {
      keyField: this.config.keyField,
      displayName: this.config.displayName,
      yearFields: this.config.yearFields
    };
  }
}

// Factory function to create service instances
export const createCSVService = (datasetType) => {
  return new CSVDataService(datasetType);
};

// Helper function to get all dataset types
export const getDatasetTypes = () => {
  return Object.keys(csvConfigurations);
};

export default CSVDataService;