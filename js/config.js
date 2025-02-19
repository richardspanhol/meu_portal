// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyC27EDdAil79iq62sPEmijeibGgiMYFbGc",
    authDomain: "meu-portal-eb44a.firebaseapp.com",
    projectId: "meu-portal-eb44a",
    storageBucket: "meu-portal-eb44a.firebasestorage.app",
    messagingSenderId: "717097816319",
    appId: "1:717097816319:web:fd6b184cf8b1ad46da3cca",
    measurementId: "G-F08REPBSQC"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Exportar serviços do Firebase
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// Configurações do Firestore
db.settings({
    ignoreUndefinedProperties: true
}); 