# Filipino Emigrants Analytics Dashboard

A comprehensive, interactive web application for visualizing and analyzing Filipino emigration data from 1981-2020. This dashboard provides multiple chart types, filters, and data management features to explore migration patterns, demographics, and destination trends.

![Dashboard Preview](https://img.shields.io/badge/Status-Active-green) ![React](https://img.shields.io/badge/React-18.0+-blue) ![Firebase](https://img.shields.io/badge/Firebase-9.0+-orange)

## 🌟 Features

### 📊 Six Types of Data Visualizations

1. **Comparison Charts** - Male vs Female Emigrants (Clustered Bar Chart)
   - Compares gender distribution across years
   - Shows migration trends by gender over four decades

2. **Composition Charts** - Civil Status Distribution (Pie Chart)
   - Displays proportions by marital status (single, married, widowed, separated, divorced)
   - Visual understanding of emigrant composition

3. **Trends Charts** - Total Emigration Over Time (Line Chart)
   - Illustrates growth trends from 1981-2020
   - Highlights periods of increase or decline

4. **Distribution Charts** - Age Group Distribution (Stacked Bar Chart)
   - Shows emigrant spread across age groups
   - Emphasizes dominance of young adults (25-34 years)

5. **Relationships Charts** - Age vs Destination Country (Grouped Bar Chart)
   - Visualizes connections between age groups and destinations
   - Shows migration preferences by demographics

6. **Geographic Representation** - Top Destination Countries (Bar + Map Combo)
   - Combines numerical and spatial visualization
   - Demonstrates global reach of Filipino migrants

### 🎛️ Interactive Features

- **Real-time Filters**: Filter data by year range and chart type
- **CSV Upload**: Import custom datasets directly to Firebase
- **Data Export**: Download current data as CSV
- **Database Management**: Populate with sample data or clear database
- **Responsive Design**: Works on desktop, tablet, and mobile devices

### 🚀 Grade Booster Features

- ✅ **Advanced Filters**: Year range and chart type filtering
- ✅ **CSV Upload Functionality**: Drag-and-drop file upload with data validation
- ✅ **Dashboard Layout**: Professional, modern design with navigation and stats
- ✅ **Data Management**: Sample data seeding and export capabilities

## 🛠️ Technology Stack

- **Frontend**: React 19.1.1
- **Charts**: Recharts 3.2.1
- **Database**: Firebase Firestore
- **Icons**: Lucide React
- **UI Components**: Material-UI
- **Build Tool**: Vite 7.1.6
- **Styling**: CSS3 with responsive design

## 📦 Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Firebase account

### 1. Clone the Repository
```bash
git clone <repository-url>
cd filipino-emigrants-app
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Firebase Configuration
1. Create a Firebase project at https://console.firebase.google.com
2. Enable Firestore Database
3. Update `src/firebase.js` with your Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### 4. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🗄️ Database Schema

### Emigrants Collection
```javascript
{
  id: "auto-generated-id",
  year: Number,           // Year of emigration
  male: Number,           // Male emigrants count
  female: Number,         // Female emigrants count
  single: Number,         // Single status count
  married: Number,        // Married status count
  widower: Number,        // Widowed status count
  separated: Number,      // Separated status count
  divorced: Number,       // Divorced status count
  notReported: Number,    // Unreported status count
  destination: String,    // Destination country
  total: Number          // Total emigrants (calculated)
}
```

## 📊 Data Insights

### Key Findings from the Dashboard:

1. **Migration Trends**: Filipino emigration shows significant growth over four decades, with peak periods corresponding to global economic opportunities and policy changes.

2. **Demographics**: Young adults (25-34) represent the largest emigrant group, with married individuals forming the majority across all destination countries.

3. **Destinations**: USA, Canada, and Australia remain top destinations, reflecting preference for developed countries with established Filipino communities.

4. **Gender Distribution**: Shows relatively balanced gender distribution with slight variations based on destination countries and economic factors.

## 🎯 Usage Guide

### Getting Started
1. **Populate Sample Data**: Click "Populate Sample Data" to load 40 years of historical data
2. **Explore Charts**: Use the navigation pills to focus on specific chart types
3. **Apply Filters**: Adjust year ranges and chart views using the filter panel
4. **Upload Data**: Use the CSV upload feature to add your own datasets

### Data Management
- **Export Data**: Download current database as CSV for offline analysis
- **Clear Database**: Remove all records (use with caution)
- **Bulk Import**: Upload CSV files with proper column formatting

### CSV Format for Upload
Ensure your CSV includes these columns:
```
year,male,female,single,married,widower,separated,divorced,notReported,destination
```

## 🚀 Build & Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## 📝 Project Structure

```
filipino-emigrants-app/
├── public/
├── src/
│   ├── components/         # React components
│   │   ├── ComparisonChart.jsx
│   │   ├── CompositionChart.jsx
│   │   ├── TrendsChart.jsx
│   │   ├── DistributionChart.jsx
│   │   ├── RelationshipsChart.jsx
│   │   ├── GeographicChart.jsx
│   │   ├── FilterPanel.jsx
│   │   ├── CSVUpload.jsx
│   │   ├── DataManagement.jsx
│   │   └── DashboardLayout.jsx
│   ├── data/              # Sample data
│   │   └── sampleData.js
│   ├── services/          # Firebase services
│   │   └── emigrantsService.js
│   ├── App.jsx           # Main application
│   ├── App.css           # Styles
│   ├── firebase.js       # Firebase configuration
│   └── main.jsx          # Entry point
├── package.json
├── vite.config.js
└── README.md
```

## 📋 Assignment Requirements Checklist

- ✅ **Case Study Implementation**: All 6 visualization types implemented
  - ✅ Comparison (Clustered Bar Chart)
  - ✅ Composition (Pie Chart)
  - ✅ Trends (Line Chart)
  - ✅ Distribution (Stacked Bar Chart)
  - ✅ Relationships (Grouped Bar Chart)
  - ✅ Geographic Representation (Bar + Map Combo)

- ✅ **Database Population**: Firebase Firestore integration with sample data
- ✅ **Frontend Design**: Professional dashboard with user-friendly interface
- ✅ **Grade Booster Features**:
  - ✅ Interactive filters for graphs and plots
  - ✅ CSV upload functionality with Firebase integration
  - ✅ Dashboard layout with enhanced visual appeal

## 🐛 Troubleshooting

### Common Issues

1. **Firebase Connection Error**
   - Verify Firebase configuration in `src/firebase.js`
   - Check Firestore security rules
   - Ensure Firebase project is active

2. **Chart Not Displaying**
   - Check browser console for errors
   - Verify data format matches expected schema
   - Ensure Recharts dependency is installed

3. **CSV Upload Fails**
   - Verify CSV format matches expected columns
   - Check file size limitations
   - Ensure Firebase write permissions

## 📞 Support

For questions or issues:
1. Check the troubleshooting section
2. Review Firebase documentation
3. Create an issue in the repository

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Philippine Statistics Authority for emigration data insights
- React and Firebase communities for excellent documentation
- Recharts library for powerful charting capabilities

---

**Note**: This dashboard is created for educational purposes as part of Case Study #2. The data includes both historical patterns and simulated values for demonstration purposes.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
