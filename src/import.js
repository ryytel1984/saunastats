import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBLDW1zvw-31GJTIbh4mBXtXwpNpDJK1uI",
  authDomain: "saunastats-f3807.firebaseapp.com",
  projectId: "saunastats-f3807",
  storageBucket: "saunastats-f3807.firebasestorage.app",
  messagingSenderId: "396824416968",
  appId: "1:396824416968:web:1236de8cc9d1e824e1cbfd"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Sinu UID — võta dashboardilt (F12 → console → auth.currentUser.uid)
const UID = "1tRQDUGWP6MU5BLBgL1XoOE5OzP2";

const DATA_2025 = [
  {date:"2025-01-03",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-01-07",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-01-11",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-01-15",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-01-18",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-01-19",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-01-23",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-01-26",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-01-31",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-02-02",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-02-09",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-02-12",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-02-21",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-03-06",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-03-09",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-03-13",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-03-16",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-03-17",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-03-23",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-03-30",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-04-01",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-04-04",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-04-07",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-04-10",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-04-13",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-04-16",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-04-20",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-04-24",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-05-04",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-05-12",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-05-15",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-05-18",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-05-29",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-06-01",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-06-05",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-06-17",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-07-05",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-07-13",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-07-22",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-07-27",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-08-04",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-08-10",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-08-15",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-08-25",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-08-31",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-09-07",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-09-11",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-09-13",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-09-18",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-09-21",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-09-25",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-09-28",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-10-05",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-10-12",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-10-15",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-10-24",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-10-26",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-11-02",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-11-07",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-11-09",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-11-11",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-11-16",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-11-23",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-11-30",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-12-03",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-12-05",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-12-14",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-12-20",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-12-28",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-12-30",type:"home",location:"",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-01-10",type:"away",location:"Ott",steams:0,drink:"beer",drinks:0,companions:["Ott"]},
  {date:"2025-02-06",type:"away",location:"Vend",steams:0,drink:"beer",drinks:0,companions:["Vend"]},
  {date:"2025-02-08",type:"away",location:"Juhan",steams:0,drink:"beer",drinks:0,companions:["Juhan"]},
  {date:"2025-02-16",type:"away",location:"Ott",steams:0,drink:"beer",drinks:0,companions:["Ott"]},
  {date:"2025-03-19",type:"away",location:"Ott",steams:0,drink:"beer",drinks:0,companions:["Ott"]},
  {date:"2025-03-26",type:"away",location:"Viimsi spa",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-03-29",type:"away",location:"Raua saun",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-04-12",type:"away",location:"Madis",steams:0,drink:"beer",drinks:0,companions:["Madis"]},
  {date:"2025-04-19",type:"away",location:"Vääna",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-04-26",type:"away",location:"Vääna",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-04-30",type:"away",location:"Ott",steams:0,drink:"beer",drinks:0,companions:["Ott"]},
  {date:"2025-05-01",type:"away",location:"Haapsalu spa",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-05-02",type:"away",location:"Haapsalu spa",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-05-03",type:"away",location:"Haapsalu spa",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-05-23",type:"away",location:"Ott",steams:0,drink:"beer",drinks:0,companions:["Ott"]},
  {date:"2025-05-26",type:"away",location:"Viimsi spa",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-05-30",type:"away",location:"Vääna",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-06-08",type:"away",location:"Viimsi spa",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-06-12",type:"away",location:"Madis",steams:0,drink:"beer",drinks:0,companions:["Madis"]},
  {date:"2025-06-19",type:"away",location:"Ott",steams:0,drink:"beer",drinks:0,companions:["Ott"]},
  {date:"2025-06-21",type:"away",location:"Vääna",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-07-02",type:"away",location:"Vääna",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-07-06",type:"away",location:"Viimsi spa",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-07-11",type:"away",location:"Viimsi spa",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-07-19",type:"away",location:"Vääna",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-08-01",type:"away",location:"Kalana",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-08-06",type:"away",location:"Vääna",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-08-19",type:"away",location:"Vend",steams:0,drink:"beer",drinks:0,companions:["Vend"]},
  {date:"2025-08-22",type:"away",location:"Aivo",steams:0,drink:"beer",drinks:0,companions:["Aivo"]},
  {date:"2025-08-24",type:"away",location:"Viimsi spa",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-09-27",type:"away",location:"Viimsi spa",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-10-16",type:"away",location:"Viimsi 18+",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-10-19",type:"away",location:"Ott",steams:0,drink:"beer",drinks:0,companions:["Ott"]},
  {date:"2025-10-20",type:"away",location:"Ring spa",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-10-24",type:"away",location:"Viimsi spa",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-10-29",type:"away",location:"Madis",steams:0,drink:"beer",drinks:0,companions:["Madis"]},
  {date:"2025-10-31",type:"away",location:"Vend",steams:0,drink:"beer",drinks:0,companions:["Vend"]},
  {date:"2025-11-29",type:"away",location:"Viimsi spa",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-12-06",type:"away",location:"Ott",steams:0,drink:"beer",drinks:0,companions:["Ott"]},
  {date:"2025-12-11",type:"away",location:"Madis",steams:0,drink:"beer",drinks:0,companions:["Madis"]},
  {date:"2025-12-21",type:"away",location:"Viimsi spa",steams:0,drink:"beer",drinks:0,companions:[]},
  {date:"2025-12-25",type:"away",location:"Hilton",steams:0,drink:"beer",drinks:0,companions:[]},
];

const DATA_2026 = [
  {date:"2026-01-01",type:"home",location:"",steams:0,drink:"beer",drinks:4,companions:[]},
  {date:"2026-01-03",type:"home",location:"",steams:0,drink:"beer",drinks:4,companions:[]},
  {date:"2026-01-09",type:"home",location:"",steams:0,drink:"beer",drinks:3,companions:[]},
  {date:"2026-01-11",type:"home",location:"",steams:0,drink:"beer",drinks:2,companions:[]},
  {date:"2026-01-15",type:"home",location:"",steams:0,drink:"beer",drinks:3,companions:[]},
  {date:"2026-01-26",type:"home",location:"",steams:0,drink:"none",drinks:0,companions:[]},
  {date:"2026-02-06",type:"home",location:"",steams:0,drink:"beer",drinks:3,companions:[]},
  {date:"2026-02-09",type:"home",location:"",steams:0,drink:"beer",drinks:4,companions:[]},
  {date:"2026-02-14",type:"home",location:"",steams:0,drink:"beer",drinks:3,companions:[]},
  {date:"2026-02-21",type:"home",location:"",steams:0,drink:"beer",drinks:3,companions:[]},
  {date:"2026-02-26",type:"home",location:"",steams:0,drink:"beer",drinks:3,companions:[]},
  {date:"2026-03-06",type:"home",location:"",steams:0,drink:"beer",drinks:3,companions:[]},
  {date:"2026-01-20",type:"away",location:"Madeira",steams:0,drink:"beer",drinks:1,companions:[]},
  {date:"2026-01-31",type:"away",location:"Viimsi spa",steams:0,drink:"none",drinks:0,companions:[]},
  {date:"2026-02-12",type:"away",location:"Ott",steams:0,drink:"beer",drinks:3,companions:["Ott"]},
  {date:"2026-02-22",type:"away",location:"Viimsi spa",steams:0,drink:"beer",drinks:2,companions:[]},
  {date:"2026-02-24",type:"away",location:"Madis",steams:0,drink:"beer",drinks:1,companions:["Madis"]},
  {date:"2026-02-28",type:"away",location:"Vend",steams:0,drink:"beer",drinks:3,companions:["Vend"]},
];

async function importData() {
  const allData = [...DATA_2025, ...DATA_2026];
  console.log(`Importin ${allData.length} kannet...`);
  
  for (const sauna of allData) {
    await addDoc(collection(db, "users", UID, "saunas"), {
      ...sauna,
      createdAt: new Date().toISOString()
    });
    process.stdout.write(".");
  }
  console.log(`\nValmis! ${allData.length} kannet imporditud.`);
}

importData().catch(console.error);