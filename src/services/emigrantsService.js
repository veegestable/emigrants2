import { db } from '../firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';

const emigrantsCollection = collection(db, "emigrants");

// CREATE
export const addEmigrant = async (data) => {
  await addDoc(emigrantsCollection, data);
};

// BULK CREATE for CSV uploads
export const addMultipleEmigrants = async (dataArray) => {
  const batch = writeBatch(db);
  
  dataArray.forEach((data) => {
    const docRef = doc(emigrantsCollection);
    batch.set(docRef, data);
  });
  
  await batch.commit();
};

// READ
export const getEmigrants = async () => {
  const snapshot = await getDocs(emigrantsCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// UPDATE
export const updateEmigrant = async (id, data) => {
  const docRef = doc(db, "emigrants", id);
  await updateDoc(docRef, data);
};

// DELETE
export const deleteEmigrant = async (id) => {
  const docRef = doc(db, "emigrants", id);
  await deleteDoc(docRef);
};

// ANALYTICS FUNCTIONS
export const getEmigrantsByYear = async () => {
  const emigrants = await getEmigrants();
  return emigrants.reduce((acc, curr) => {
    const year = curr.year;
    if (!acc[year]) {
      acc[year] = {
        year,
        total: 0,
        male: 0,
        female: 0,
        single: 0,
        married: 0,
        widower: 0,
        separated: 0,
        divorced: 0,
        notReported: 0
      };
    }
    acc[year].total += (curr.male || 0) + (curr.female || 0);
    acc[year].male += curr.male || 0;
    acc[year].female += curr.female || 0;
    acc[year].single += curr.single || 0;
    acc[year].married += curr.married || 0;
    acc[year].widower += curr.widower || 0;
    acc[year].separated += curr.separated || 0;
    acc[year].divorced += curr.divorced || 0;
    acc[year].notReported += curr.notReported || 0;
    return acc;
  }, {});
};

export const getDestinationData = async () => {
  const emigrants = await getEmigrants();
  return emigrants.reduce((acc, curr) => {
    const destination = curr.destination || 'Unknown';
    if (!acc[destination]) {
      acc[destination] = {
        destination,
        count: 0,
        coordinates: getCountryCoordinates(destination)
      };
    }
    acc[destination].count += curr.total || 1;
    return acc;
  }, {});
};

const getCountryCoordinates = (country) => {
  const coordinates = {
    'USA': [39.8283, -98.5795],
    'United States': [39.8283, -98.5795],
    'Canada': [56.1304, -106.3468],
    'Australia': [-25.2744, 133.7751],
    'Japan': [36.2048, 138.2529],
    'Saudi Arabia': [23.8859, 45.0792],
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
    'Bahrain': [25.9304, 50.6378]
  };
  return coordinates[country] || [0, 0];
};