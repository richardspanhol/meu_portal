let matchTimer;
let matchSeconds = 0;
let isTimerRunning = false;
let currentMatch = null;

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

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
            document.getElementById('homeTeam').textContent = data.name || 'Meu Time';
            if (data.logoUrl) {
                document.getElementById('teamLogo').src = data.logoUrl;
            }
        }
    } catch (error) {
        console.error('Erro ao carregar dados do time:', error);
        showAlert('Erro ao carregar dados do time', 'error');
    }
}

function toggleTimer() {
    const button = document.querySelector('.btn-control i');
    if (isTimerRunning) {
        clearInterval(matchTimer);
        button.className = 'fas fa-play';
    } else {
        matchTimer = setInterval(updateTimer, 1000);
        button.className = 'fas fa-pause';
    }
    isTimerRunning = !isTimerRunning;
}

function updateTimer() {
    matchSeconds++;
    const minutes = Math.floor(matchSeconds / 60);
    const seconds = matchSeconds % 60;
    document.getElementById('matchTimer').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function resetTimer() {
    clearInterval(matchTimer);
    matchSeconds = 0;
    isTimerRunning = false;
    document.getElementById('matchTimer').textContent = '00:00';
    document.querySelector('.btn-control i').className = 'fas fa-play';
}

document.getElementById('matchSetupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const user = firebase.auth().currentUser;
        if (!user) return;

        const matchData = {
            opponent: document.getElementById('opponent').value,
            location: document.getElementById('location').value,
            date: document.getElementById('matchDate').value,
            type: document.getElementById('matchType').value,
            homeScore: 0,
            awayScore: 0,
            events: [],
            status: 'in_progress',
            createdAt: new Date(),
            teamId: user.uid
        };

        const matchRef = await firebase.firestore()
            .collection('matches')
            .add(matchData);

        currentMatch = matchRef.id;
        document.getElementById('awayTeam').textContent = matchData.opponent;
        document.getElementById('matchSetup').style.display = 'none';
        document.getElementById('matchEvents').style.display = 'block';

    } catch (error) {
        console.error('Erro ao criar partida:', error);
        showAlert('Erro ao criar partida', 'error');
    }
});

async function registerGoal() {
    if (!currentMatch) return;
    
    try {
        const players = await loadPlayers();
        const modal = createEventModal('Gol', players, async (data) => {
            const event = {
                type: 'goal',
                time: matchSeconds,
                player: data.player,
                assist: data.assist,
                timestamp: new Date()
            };

            await addEventToMatch(event);
            updateScore('home');
        });

        document.body.appendChild(modal);
    } catch (error) {
        console.error('Erro ao registrar gol:', error);
        showAlert('Erro ao registrar gol', 'error');
    }
}

async function registerAssist() {
    if (!currentMatch) return;
    
    try {
        const players = await loadPlayers();
        const modal = createEventModal('Assistência', players, async (data) => {
            const event = {
                type: 'assist',
                time: matchSeconds,
                player: data.player,
                timestamp: new Date()
            };

            await addEventToMatch(event);
        });

        document.body.appendChild(modal);
    } catch (error) {
        console.error('Erro ao registrar assistência:', error);
        showAlert('Erro ao registrar assistência', 'error');
    }
}

async function registerCard(type) {
    if (!currentMatch) return;
    
    try {
        const players = await loadPlayers();
        const modal = createEventModal(`Cartão ${type === 'yellow' ? 'Amarelo' : 'Vermelho'}`, players, async (data) => {
            const event = {
                type: `${type}_card`,
                time: matchSeconds,
                player: data.player,
                timestamp: new Date()
            };

            await addEventToMatch(event);
        });

        document.body.appendChild(modal);
    } catch (error) {
        console.error('Erro ao registrar cartão:', error);
        showAlert('Erro ao registrar cartão', 'error');
    }
}

async function registerSubstitution() {
    if (!currentMatch) return;
    
    try {
        const players = await loadPlayers();
        const modal = createSubstitutionModal(players, async (data) => {
            const event = {
                type: 'substitution',
                time: matchSeconds,
                playerOut: data.playerOut,
                playerIn: data.playerIn,
                timestamp: new Date()
            };

            await addEventToMatch(event);
        });

        document.body.appendChild(modal);
    } catch (error) {
        console.error('Erro ao registrar substituição:', error);
        showAlert('Erro ao registrar substituição', 'error');
    }
}

async function loadPlayers() {
    try {
        const user = firebase.auth().currentUser;
        const snapshot = await firebase.firestore()
            .collection('players')
            .where('teamId', '==', user.uid)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Erro ao carregar jogadores:', error);
        return [];
    }
}

function createEventModal(title, players, callback) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    // Implementar HTML do modal aqui
    // ...

    return modal;
}

function createSubstitutionModal(players, callback) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    // Implementar HTML do modal aqui
    // ...

    return modal;
}

async function addEventToMatch(event) {
    try {
        await firebase.firestore()
            .collection('matches')
            .doc(currentMatch)
            .update({
                events: firebase.firestore.FieldValue.arrayUnion(event)
            });

        addEventToLog(event);
    } catch (error) {
        console.error('Erro ao registrar evento:', error);
        showAlert('Erro ao registrar evento', 'error');
    }
}

function addEventToLog(event) {
    const log = document.getElementById('eventsLog');
    const minutes = Math.floor(event.time / 60);
    const seconds = event.time % 60;
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const eventItem = document.createElement('div');
    eventItem.className = 'event-item';
    eventItem.innerHTML = `
        <span class="event-time">${timeStr}</span>
        <div class="event-icon">
            ${getEventIcon(event.type)}
        </div>
        <div class="event-description">
            ${getEventDescription(event)}
        </div>
    `;

    log.insertBefore(eventItem, log.firstChild);
}

function getEventIcon(type) {
    const icons = {
        goal: '<i class="fas fa-futbol"></i>',
        assist: '<i class="fas fa-hands-helping"></i>',
        yellow_card: '<i class="fas fa-square" style="color: #ffc107"></i>',
        red_card: '<i class="fas fa-square" style="color: #dc3545"></i>',
        substitution: '<i class="fas fa-exchange-alt"></i>'
    };
    return icons[type] || '<i class="fas fa-circle"></i>';
}

function getEventDescription(event) {
    switch (event.type) {
        case 'goal':
            return `⚽ Gol de ${event.player.name}${event.assist ? ` (Assistência: ${event.assist.name})` : ''}`;
        case 'assist':
            return `👟 Assistência de ${event.player.name}`;
        case 'yellow_card':
            return `🟨 Cartão amarelo para ${event.player.name}`;
        case 'red_card':
            return `🟥 Cartão vermelho para ${event.player.name}`;
        case 'substitution':
            return `🔄 ${event.playerOut.name} sai para entrada de ${event.playerIn.name}`;
        default:
            return 'Evento registrado';
    }
}

function updateScore(team) {
    const scoreElement = document.getElementById('score');
    const [home, away] = scoreElement.textContent.split(' x ').map(Number);
    
    if (team === 'home') {
        scoreElement.textContent = `${home + 1} x ${away}`;
    } else {
        scoreElement.textContent = `${home} x ${away + 1}`;
    }
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
}

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

firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        loadTeamData();
    } else {
        window.location.href = '../index.html';
    }
});

// Sistema de gerenciamento de partidas
class MatchManager {
    constructor() {
        this.db = firebase.firestore();
        this.currentUser = null;
        this.currentMatch = null;
        this.timer = null;
        this.seconds = 0;
        this.isRunning = false;
        this.init();
    }

    async init() {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                this.loadTeamData();
                this.setupEventListeners();
            } else {
                window.location.href = '../index.html';
            }
        });
    }

    setupEventListeners() {
        // Formulário de setup da partida
        document.getElementById('matchSetupForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.startMatch();
        });

        // Botões de eventos
        document.querySelectorAll('.event-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const eventType = btn.dataset.event;
                this.registerEvent(eventType);
            });
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
                document.getElementById('homeTeam').textContent = data.name;
                if (data.logoUrl) {
                    document.getElementById('teamLogo').src = data.logoUrl;
                }
            }
        } catch (error) {
            console.error('Erro ao carregar dados do time:', error);
            this.showAlert('Erro ao carregar dados do time', 'error');
        }
    }

    async startMatch() {
        try {
            const matchData = {
                opponent: document.getElementById('opponent').value,
                location: document.getElementById('location').value,
                date: document.getElementById('matchDate').value,
                type: document.getElementById('matchType').value,
                homeScore: 0,
                awayScore: 0,
                events: [],
                status: 'in_progress',
                teamId: this.currentUser.uid,
                createdAt: new Date()
            };

            const matchRef = await this.db.collection('matches').add(matchData);
            this.currentMatch = matchRef.id;
            
            document.getElementById('awayTeam').textContent = matchData.opponent;
            document.getElementById('matchSetup').style.display = 'none';
            document.getElementById('matchEvents').style.display = 'block';

            this.showAlert('Partida iniciada!', 'success');
        } catch (error) {
            console.error('Erro ao iniciar partida:', error);
            this.showAlert('Erro ao iniciar partida', 'error');
        }
    }

    toggleTimer() {
        if (!this.currentMatch) return;

        const button = document.querySelector('.btn-control i');
        if (this.isRunning) {
            clearInterval(this.timer);
            button.className = 'fas fa-play';
        } else {
            this.timer = setInterval(() => this.updateTimer(), 1000);
            button.className = 'fas fa-pause';
        }
        this.isRunning = !this.isRunning;
    }

    updateTimer() {
        this.seconds++;
        const minutes = Math.floor(this.seconds / 60);
        const remainingSeconds = this.seconds % 60;
        document.getElementById('matchTimer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    resetTimer() {
        clearInterval(this.timer);
        this.seconds = 0;
        this.isRunning = false;
        document.getElementById('matchTimer').textContent = '00:00';
        document.querySelector('.btn-control i').className = 'fas fa-play';
    }

    async registerEvent(type) {
        if (!this.currentMatch) return;

        try {
            const players = await this.loadPlayers();
            const modal = this.createEventModal(type, players);
            document.body.appendChild(modal);
        } catch (error) {
            console.error('Erro ao registrar evento:', error);
            this.showAlert('Erro ao registrar evento', 'error');
        }
    }

    async loadPlayers() {
        try {
            const snapshot = await this.db.collection('players')
                .where('teamId', '==', this.currentUser.uid)
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Erro ao carregar jogadores:', error);
            return [];
        }
    }

    createEventModal(type, players) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';

        const content = document.createElement('div');
        content.className = 'modal-content';
        
        // Implementar conteúdo específico para cada tipo de evento
        switch (type) {
            case 'goal':
                content.innerHTML = this.createGoalModalContent(players);
                break;
            case 'card':
                content.innerHTML = this.createCardModalContent(players);
                break;
            case 'substitution':
                content.innerHTML = this.createSubstitutionModalContent(players);
                break;
        }

        modal.appendChild(content);
        return modal;
    }

    // Templates para os modais de eventos
    createGoalModalContent(players) {
        return `
            <div class="modal-header">
                <h2>Registrar Gol</h2>
                <button class="close-modal" onclick="matchManager.closeEventModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form id="goalForm" class="event-form">
                <div class="form-group">
                    <label>Jogador</label>
                    <select required>
                        <option value="">Selecione o jogador</option>
                        ${players.map(p => `<option value="${p.id}">${p.name} (${p.number})</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Assistência</label>
                    <select>
                        <option value="">Sem assistência</option>
                        ${players.map(p => `<option value="${p.id}">${p.name} (${p.number})</option>`).join('')}
                    </select>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn-primary">Registrar</button>
                </div>
            </form>
        `;
    }

    // Implementar outros métodos auxiliares...
    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        
        document.body.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 3000);
    }
}

// Inicializar gerenciador
const matchManager = new MatchManager();