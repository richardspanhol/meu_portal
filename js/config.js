// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyC27EDdAil79iq62sPEmijeibGgiMYFbGc",
    authDomain: "meu-portal-eb44a.firebaseapp.com",
    projectId: "meu-portal-eb44a",
    storageBucket: "meu-portal-eb44a.appspot.com",
    messagingSenderId: "717097816319",
    appId: "1:717097816319:web:fd6b184cf8b1ad46da3cca",
    measurementId: "G-F08REPBSQC"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Exportar serviços do Firebase
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Configurar índices do Firestore
async function setupFirestoreIndexes() {
    try {
        // Índice para transações
        await db.collection('financial')
            .where('teamId', '==', '')
            .orderBy('date', 'desc')
            .limit(1)
            .get();

        // Índice para jogadores
        await db.collection('players')
            .where('teamId', '==', '')
            .orderBy('number', 'asc')
            .get();

        // Índice para partidas
        await db.collection('matches')
            .where('teamId', '==', '')
            .where('date', '>=', new Date())
            .orderBy('date', 'asc')
            .get();

    } catch (error) {
        console.error('Erro ao configurar índices:', error);
    }
}

// Configurar regras de segurança
const securityRules = {
    rules_version: '2',
    service: 'cloud.firestore',
    match: '/databases/{database}/documents',
    rules: {
        match: '/{document=**}',
        allow: 'read, write',
        if: 'request.auth != null'
    }
};

// Executar setup
setupFirestoreIndexes(); 