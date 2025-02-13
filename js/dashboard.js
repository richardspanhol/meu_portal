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

// Carregar dados do dashboard
async function loadDashboardData() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        // Carregar dados do time
        const teamSnapshot = await db.collection('teams')
            .where('userId', '==', user.uid)
            .limit(1)
            .get();

        if (!teamSnapshot.empty) {
            const teamData = teamSnapshot.docs[0].data();
            document.getElementById('teamInfo').innerHTML = `
                <div class="team-header">
                    ${teamData.logo ? `<img src="${teamData.logo}" alt="${teamData.name}">` : ''}
                    <h2>${teamData.name}</h2>
                </div>
            `;

            // Aplicar cores do time
            document.documentElement.style.setProperty('--primary-color', teamData.colors.primary);
            document.documentElement.style.setProperty('--secondary-color', teamData.colors.secondary);
        }

        // Carregar total de jogadores
        const playersSnapshot = await db.collection('players')
            .where('teamId', '==', teamSnapshot.docs[0].id)
            .get();
        document.getElementById('totalPlayers').textContent = playersSnapshot.size;

        // Carregar saldo
        const financialSnapshot = await db.collection('transactions')
            .where('teamId', '==', teamSnapshot.docs[0].id)
            .get();
        
        let balance = 0;
        financialSnapshot.forEach(doc => {
            const transaction = doc.data();
            balance += transaction.type === 'income' ? transaction.amount : -transaction.amount;
        });
        document.getElementById('balance').textContent = `R$ ${balance.toFixed(2)}`;

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
}

// Verificar autenticação e carregar dados
auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = '../index.html';
    } else {
        loadDashboardData();
    }
}); 