// Controle do menu
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

// Sistema de Dashboard
class DashboardManager {
    constructor() {
        this.db = firebase.firestore();
        this.currentUser = null;
        this.init();
    }

    async init() {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                this.loadTeamData();
                this.loadStats();
                this.loadRecentActivities();
            } else {
                window.location.href = '../index.html';
            }
        });
    }

    async loadTeamData() {
        try {
            const teamDoc = await this.db.collection('teams')
                .doc(this.currentUser.uid)
                .get();

            if (teamDoc.exists) {
                const data = teamDoc.data();
                document.getElementById('teamName').textContent = data.name;
                if (data.logoUrl) {
                    document.getElementById('teamLogo').src = data.logoUrl;
                }
            }
        } catch (error) {
            console.error('Erro ao carregar dados do time:', error);
            this.showAlert('Erro ao carregar dados do time', 'error');
        }
    }

    async loadStats() {
        try {
            // Total de jogadores
            const playersSnapshot = await this.db.collection('players')
                .where('teamId', '==', this.currentUser.uid)
                .get();
            
            document.getElementById('totalPlayers').textContent = playersSnapshot.size;

            // Próxima partida
            const now = new Date();
            const matchesSnapshot = await this.db.collection('matches')
                .where('teamId', '==', this.currentUser.uid)
                .where('date', '>=', now)
                .orderBy('date', 'asc')
                .limit(1)
                .get();

            if (!matchesSnapshot.empty) {
                const match = matchesSnapshot.docs[0].data();
                document.getElementById('nextMatch').textContent = this.formatNextMatch(match);
            }

            // Saldo em caixa
            const financialSnapshot = await this.db.collection('financial')
                .where('teamId', '==', this.currentUser.uid)
                .get();

            let balance = 0;
            financialSnapshot.forEach(doc => {
                const transaction = doc.data();
                balance += transaction.type === 'income' ? transaction.amount : -transaction.amount;
            });

            document.getElementById('balance').textContent = this.formatCurrency(balance);

        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
            this.showAlert('Erro ao carregar estatísticas', 'error');
        }
    }

    async loadRecentActivities() {
        try {
            const activities = [];
            const now = new Date();

            // Últimas partidas
            const matchesSnapshot = await this.db.collection('matches')
                .where('teamId', '==', this.currentUser.uid)
                .limit(3)
                .get();

            matchesSnapshot.forEach(doc => {
                const match = doc.data();
                activities.push({
                    type: 'match',
                    date: this.parseDate(match.date),
                    data: match
                });
            });

            // Últimas transações
            const financialSnapshot = await this.db.collection('financial')
                .where('teamId', '==', this.currentUser.uid)
                .limit(3)
                .get();

            financialSnapshot.forEach(doc => {
                const transaction = doc.data();
                activities.push({
                    type: 'transaction',
                    date: this.parseDate(transaction.date),
                    data: transaction
                });
            });

            // Ordenar por data
            activities.sort((a, b) => b.date - a.date);

            // Atualizar interface
            const activitiesList = document.getElementById('activitiesList');
            activitiesList.innerHTML = '';

            if (activities.length === 0) {
                activitiesList.innerHTML = '<p class="no-activities">Nenhuma atividade recente</p>';
                return;
            }

            activities.forEach(activity => {
                const element = this.createActivityElement(activity);
                activitiesList.appendChild(element);
            });

        } catch (error) {
            console.error('Erro ao carregar atividades:', error);
            this.showAlert('Erro ao carregar atividades recentes', 'error');
        }
    }

    // Método auxiliar para tratar datas
    parseDate(date) {
        if (!date) return new Date();
        if (date instanceof firebase.firestore.Timestamp) {
            return date.toDate();
        }
        if (typeof date === 'string') {
            return new Date(date);
        }
        if (date instanceof Date) {
            return date;
        }
        return new Date();
    }

    formatNextMatch(match) {
        // Verificar se a data é um timestamp do Firestore
        const date = match.date instanceof firebase.firestore.Timestamp 
            ? match.date.toDate() 
            : new Date(match.date);
        return `${match.opponent} - ${date.toLocaleDateString('pt-BR')}`;
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    createActivityElement(activity) {
        const div = document.createElement('div');
        div.className = 'activity-item';

        if (activity.type === 'match') {
            div.innerHTML = `
                <div class="activity-icon match">
                    <i class="fas fa-futbol"></i>
                </div>
                <div class="activity-info">
                    <p>Partida contra ${activity.data.opponent}</p>
                    <small>${activity.date.toLocaleDateString('pt-BR')}</small>
                </div>
            `;
        } else {
            div.innerHTML = `
                <div class="activity-icon ${activity.data.type}">
                    <i class="fas fa-${activity.data.type === 'income' ? 'arrow-up' : 'arrow-down'}"></i>
                </div>
                <div class="activity-info">
                    <p>${activity.data.description}</p>
                    <small>${this.formatCurrency(activity.data.amount)}</small>
                </div>
            `;
        }

        return div;
    }

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        
        document.body.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 3000);
    }
}

// Inicializar dashboard
const dashboardManager = new DashboardManager();

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