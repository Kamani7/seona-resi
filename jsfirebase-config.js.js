// Remplacez les valeurs ci-dessous par les identifiants officiels de votre projet Firebase
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "seona-resi.firebaseapp.com",
  projectId: "seona-resi",
  storageBucket: "seona-resi.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

// Initialisation de Firebase
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();