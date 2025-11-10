# Filipino Emigrants Dashboard - Quick Setup Guide

## Prerequisites Check
- Node.js version 18+ installed
- Git installed
- Firebase account created

## Quick Start Commands

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Access the Application
Open http://localhost:5173 in your browser

### 4. Load Sample Data
1. Click "Populate Sample Data" button in the dashboard
2. This will load 40 years of Filipino emigrants data (1981-2020)

## Firebase Setup (Required for data persistence)

### 1. Create Firebase Project
1. Go to https://console.firebase.google.com
2. Click "Create a project"
3. Follow the setup wizard

### 2. Enable Firestore
1. In your Firebase project, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" for development

### 3. Get Configuration
1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click "Web" icon to add a web app
4. Copy the configuration object

### 4. Update Firebase Config
Edit `src/firebase.js` and replace the configuration:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

## Features Overview

### 📊 Chart Types Available
1. **Comparison**: Male vs Female emigrants by year
2. **Composition**: Civil status distribution (pie chart)
3. **Trends**: Total emigrants over time (line chart)
4. **Distribution**: Age group distribution (stacked bars)
5. **Relationships**: Age groups vs destinations
6. **Geographic**: Top destination countries

### 🎛️ Interactive Features
- Year range filtering
- Chart type filtering
- CSV data upload
- Data export functionality
- Sample data population
- Database management

## Sample Data Structure

If uploading your own CSV, use this format:
```
year,male,female,single,married,widower,separated,divorced,notReported,destination
2020,65000,62000,68000,41000,4100,3800,3200,6900,USA
```

## Troubleshooting

### Common Issues:

1. **App won't start**: Run `npm install` to ensure all dependencies are installed
2. **Data not saving**: Check Firebase configuration and internet connection
3. **Charts not displaying**: Ensure data is loaded (use "Populate Sample Data")
4. **Upload fails**: Check CSV format matches the expected structure

### Need Help?
- Check the browser console for error messages
- Verify Firebase project is active and accessible
- Ensure you're using the correct Firebase configuration

## Production Deployment

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

## Project Structure
```
src/
  components/     # All chart and UI components
  data/          # Sample data files
  services/      # Firebase service functions
  App.jsx        # Main application
  firebase.js    # Firebase configuration
```

## Support
For technical issues, check:
1. Browser developer console
2. Firebase console for database issues
3. Network tab for API call problems

---

**Ready to explore Filipino emigration patterns? Start the app and begin analyzing 40 years of migration data!**