import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyCIOOFrxcicYuGQtKmAw8NbXe5Q9n9y_Kc",
  authDomain: "filipinoemigrantsdb-b6b14.firebaseapp.com",
  projectId: "filipinoemigrantsdb-b6b14",
  storageBucket: "filipinoemigrantsdb-b6b14.firebasestorage.app",
  messagingSenderId: "202353927604",
  appId: "1:202353927604:web:316e3dfdbed492d47cfee1"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
