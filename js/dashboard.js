// Controle do menu
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

// Carregar dados do time
async function loadTeamData() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) return;

        const teamDoc = await firebase.firestore()
            .collection('teams')
            .doc(user.uid)
            .get();

        if (teamDoc.exists) {
            const data = teamDoc.data();
            document.getElementById('teamName').textContent = data.name || 'Meu Time';
            if (data.logoUrl) {
                document.getElementById('teamLogo').src = data.logoUrl;
            }
        }
    } catch (error) {
        console.error('Erro ao carregar dados do time:', error);
        showAlert('Erro ao carregar dados do time', 'error');
    }
}

// Carregar estatísticas
async function loadStats() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) return;

        // Total de jogadores
        const playersSnapshot = await firebase.firestore()
            .collection('players')
            .where('teamId', '==', user.uid)
            .get();
        
        document.getElementById('totalPlayers').textContent = playersSnapshot.size;

        // Próxima partida
        const nextMatchSnapshot = await firebase.firestore()
            .collection('matches')
            .where('teamId', '==', user.uid)
            .where('date', '>=', new Date())
            .orderBy('date')
            .limit(1)
            .get();

        if (!nextMatchSnapshot.empty) {
            const match = nextMatchSnapshot.docs[0].data();
            document.getElementById('nextMatch').textContent = formatNextMatch(match);
        }

        // Saldo em caixa
        const financialSnapshot = await firebase.firestore()
            .collection('financial')
            .where('teamId', '==', user.uid)
            .get();

        let balance = 0;
        financialSnapshot.forEach(doc => {
            const transaction = doc.data();
            if (transaction.type === 'income') {
                balance += transaction.amount;
            } else {
                balance -= transaction.amount;
            }
        });

        document.getElementById('balance').textContent = formatCurrency(balance);

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        showAlert('Erro ao carregar estatísticas', 'error');
    }
}

// Carregar últimas atividades
async function loadRecentActivities() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) return;

        const activitiesList = document.getElementById('activitiesList');
        activitiesList.innerHTML = '';

        // Últimas partidas
        const matchesSnapshot = await firebase.firestore()
            .collection('matches')
            .where('teamId', '==', user.uid)
            .orderBy('date', 'desc')
            .limit(5)
            .get();

        // Últimas transações
        const financialSnapshot = await firebase.firestore()
            .collection('financial')
            .where('teamId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();

        const activities = [];

        matchesSnapshot.forEach(doc => {
            const match = doc.data();
            activities.push({
                type: 'match',
                date: match.date,
                data: match
            });
        });

        financialSnapshot.forEach(doc => {
            const transaction = doc.data();
            activities.push({
                type: 'transaction',
                date: transaction.createdAt.toDate(),
                data: transaction
            });
        });

        // Ordenar por data
        activities.sort((a, b) => b.date - a.date);

        // Criar elementos HTML
        activities.slice(0, 5).forEach(activity => {
            const activityElement = createActivityElement(activity);
            activitiesList.appendChild(activityElement);
        });

    } catch (error) {
        console.error('Erro ao carregar atividades:', error);
        showAlert('Erro ao carregar atividades recentes', 'error');
    }
}

// Funções auxiliares
function formatNextMatch(match) {
    const date = new Date(match.date);
    return `${match.opponent} - ${date.toLocaleDateString('pt-BR')}`;
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function createActivityElement(activity) {
    const div = document.createElement('div');
    div.className = 'activity-item';

    if (activity.type === 'match') {
        div.innerHTML = `
            <div class="activity-icon match">
                <i class="fas fa-futbol"></i>
            </div>
            <div class="activity-info">
                <p>Partida contra ${activity.data.opponent}</p>
                <small>${new Date(activity.date).toLocaleDateString('pt-BR')}</small>
            </div>
        `;
    } else {
        div.innerHTML = `
            <div class="activity-icon ${activity.data.type}">
                <i class="fas fa-${activity.data.type === 'income' ? 'arrow-up' : 'arrow-down'}"></i>
            </div>
            <div class="activity-info">
                <p>${activity.data.description}</p>
                <small>${formatCurrency(activity.data.amount)}</small>
            </div>
        `;
    }

    return div;
}

// Função de logout
function logout() {
    firebase.auth().signOut()
        .then(() => {
            window.location.href = '../index.html';
        })
        .catch((error) => {
            console.error('Erro ao fazer logout:', error);
            showAlert('Erro ao fazer logout', 'error');
        });
}

// Função para mostrar alertas
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
}

// Verificar autenticação e inicializar
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        loadTeamData();
        loadStats();
        loadRecentActivities();
    } else {
        window.location.href = '../index.html';
    }
});

// Fechar menu ao clicar fora no mobile
document.addEventListener('click', function(e) {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.querySelector('.toggle-sidebar');
    
    if (window.innerWidth <= 768 && 
        sidebar.classList.contains('collapsed') && 
        !sidebar.contains(e.target) && 
        !toggleBtn.contains(e.target)) {
        sidebar.classList.remove('collapsed');
    }
}); 