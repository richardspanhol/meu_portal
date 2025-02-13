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

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Controle do Sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('expanded');
}

// Função de Logout
async function logout() {
    try {
        await auth.signOut();
        window.location.href = '../index.html';
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
    }
}

// Variáveis da partida
let matchTimer;
let matchSeconds = 0;
let currentMatch = null;
let homeScore = 0;
let awayScore = 0;

// Iniciar nova partida
document.getElementById('matchSetupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const user = auth.currentUser;
    if (!user) return;

    try {
        // Buscar time do usuário
        const teamSnapshot = await db.collection('teams')
            .where('userId', '==', user.uid)
            .limit(1)
            .get();

        if (teamSnapshot.empty) {
            alert('Time não encontrado');
            return;
        }

        const teamId = teamSnapshot.docs[0].id;
        const matchData = {
            teamId: teamId,
            opponent: document.getElementById('opponent').value,
            location: document.getElementById('location').value,
            date: document.getElementById('matchDate').value,
            type: document.getElementById('matchType').value,
            homeScore: 0,
            awayScore: 0,
            events: [],
            status: 'in_progress',
            createdAt: new Date()
        };

        // Criar partida no Firestore
        const matchRef = await db.collection('matches').add(matchData);
        currentMatch = matchRef.id;

        // Atualizar interface
        document.getElementById('matchSetup').style.display = 'none';
        document.getElementById('matchEvents').style.display = 'block';
        document.getElementById('awayTeam').textContent = matchData.opponent;

        // Iniciar cronômetro
        startMatch();
    } catch (error) {
        console.error('Erro ao criar partida:', error);
        alert('Erro ao iniciar partida');
    }
});

// Funções do cronômetro
function startMatch() {
    matchTimer = setInterval(() => {
        matchSeconds++;
        updateMatchTimer();
    }, 1000);
}

function updateMatchTimer() {
    const minutes = Math.floor(matchSeconds / 60);
    const seconds = matchSeconds % 60;
    document.getElementById('matchTimer').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Registrar eventos
async function registerGoal() {
    if (!currentMatch) return;

    try {
        const playersSnapshot = await db.collection('players')
            .where('teamId', '==', currentMatch)
            .get();

        const players = [];
        playersSnapshot.forEach(doc => {
            players.push({ id: doc.id, ...doc.data() });
        });

        // Aqui você pode adicionar um modal para selecionar o jogador que marcou
        const scorer = await selectPlayer(players, 'Quem marcou o gol?');
        if (!scorer) return;

        homeScore++;
        document.getElementById('score').textContent = `${homeScore} x ${awayScore}`;

        const event = {
            type: 'goal',
            player: scorer.id,
            time: matchSeconds,
            timestamp: new Date()
        };

        await addEventToMatch(event);
        addEventToLog(`⚽ Gol de ${scorer.name} aos ${Math.floor(matchSeconds/60)}'`);
    } catch (error) {
        console.error('Erro ao registrar gol:', error);
    }
}

function registerAssist() {
    // Similar ao registerGoal
}

function registerCard(type) {
    // Registrar cartão
}

function registerFoul() {
    // Registrar falta
}

// Funções auxiliares
async function addEventToMatch(event) {
    if (!currentMatch) return;
    
    try {
        await db.collection('matches').doc(currentMatch).update({
            events: firebase.firestore.FieldValue.arrayUnion(event)
        });
    } catch (error) {
        console.error('Erro ao adicionar evento:', error);
    }
}

function addEventToLog(text) {
    const eventsLog = document.getElementById('eventsLog');
    const eventElement = document.createElement('div');
    eventElement.className = 'event-item';
    eventElement.textContent = text;
    eventsLog.appendChild(eventElement);
    eventsLog.scrollTop = eventsLog.scrollHeight;
}

// Verificar autenticação
auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = '../index.html';
    }
});