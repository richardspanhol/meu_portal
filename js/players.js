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

// Variáveis de controle
let editingPlayerId = null;
let teamSport = null;

// Controle do menu
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

// Fechar menu ao clicar fora
document.addEventListener('click', function(e) {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.querySelector('.toggle-menu');
    
    if (window.innerWidth <= 768 && 
        sidebar.classList.contains('active') && 
        !sidebar.contains(e.target) && 
        !toggleBtn.contains(e.target)) {
        sidebar.classList.remove('active');
    }
});

// Função de Logout
async function logout() {
    try {
        await auth.signOut();
        window.location.href = '../index.html';
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
    }
}

// Carregar dados do time e posições
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
            teamSport = data.sport;
            updatePositionOptions();
        }
    } catch (error) {
        console.error('Erro ao carregar dados do time:', error);
        showAlert('Erro ao carregar dados do time', 'error');
    }
}

// Atualizar opções de posição baseado no esporte
function updatePositionOptions() {
    const positions = getPositionsByTeamSport();
    const positionSelect = document.getElementById('playerPosition');
    const positionFilter = document.getElementById('positionFilter');
    
    const optionsHtml = positions.map(pos => 
        `<option value="${pos}">${pos}</option>`
    ).join('');

    positionSelect.innerHTML = `<option value="">Selecione a posição</option>${optionsHtml}`;
    positionFilter.innerHTML = `<option value="">Todas as posições</option>${optionsHtml}`;
}

function getPositionsByTeamSport() {
    switch (teamSport) {
        case 'futsal':
            return ['Goleiro', 'Fixo', 'Ala', 'Pivô'];
        case 'society':
        case 'campo':
            return ['Goleiro', 'Zagueiro', 'Lateral', 'Meio-campista', 'Atacante'];
        default:
            return ['Goleiro', 'Jogador'];
    }
}

// Sistema de gerenciamento de jogadores
class PlayersManager {
    constructor() {
        this.db = firebase.firestore();
        this.storage = firebase.storage();
        this.currentUser = null;
        this.editingPlayerId = null;
        this.init();
    }

    async init() {
        // Verificar autenticação
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                this.loadPlayers();
                this.setupEventListeners();
            } else {
                window.location.href = '../index.html';
            }
        });
    }

    setupEventListeners() {
        // Formulário de jogador
        document.getElementById('playerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePlayer();
        });

        // Preview de foto
        document.getElementById('playerPhoto').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('photoPreview').src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });

        // Filtros
        document.getElementById('searchPlayer').addEventListener('input', () => this.filterPlayers());
        document.getElementById('positionFilter').addEventListener('change', () => this.filterPlayers());
    }

    async loadPlayers() {
        try {
            const snapshot = await this.db.collection('players')
                .where('teamId', '==', this.currentUser.uid)
                .orderBy('number', 'asc')
                .get();

            const playersGrid = document.getElementById('playersGrid');
            playersGrid.innerHTML = '';

            snapshot.forEach(doc => {
                const player = doc.data();
                const card = this.createPlayerCard(player, doc.id);
                playersGrid.appendChild(card);
            });

        } catch (error) {
            console.error('Erro ao carregar jogadores:', error);
            this.showAlert('Erro ao carregar jogadores', 'error');
        }
    }

    createPlayerCard(player, id) {
        const div = document.createElement('div');
        div.className = 'player-card';
        div.innerHTML = `
            <div class="player-header">
                <img src="${player.photoUrl || '../assets/default-player.png'}" 
                     alt="${player.name}" 
                     class="player-photo">
            </div>
            <div class="player-info">
                <h3 class="player-name">${player.name}</h3>
                <div class="player-number">#${player.number}</div>
                <span class="player-position">${player.position}</span>
            </div>
            <div class="player-actions">
                <button onclick="playersManager.editPlayer('${id}')" class="btn-icon">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="playersManager.deletePlayer('${id}')" class="btn-icon delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        return div;
    }

    async savePlayer() {
        try {
            const playerData = {
                name: document.getElementById('playerName').value,
                number: parseInt(document.getElementById('playerNumber').value),
                position: document.getElementById('playerPosition').value,
                teamId: this.currentUser.uid,
                updatedAt: new Date()
            };

            // Upload da foto se houver
            const photoInput = document.getElementById('playerPhoto');
            if (photoInput.files.length > 0) {
                const file = photoInput.files[0];
                const photoUrl = await this.uploadPhoto(file);
                playerData.photoUrl = photoUrl;
            }

            if (this.editingPlayerId) {
                await this.db.collection('players')
                    .doc(this.editingPlayerId)
                    .update(playerData);
                this.showAlert('Jogador atualizado com sucesso!', 'success');
            } else {
                playerData.createdAt = new Date();
                await this.db.collection('players').add(playerData);
                this.showAlert('Jogador adicionado com sucesso!', 'success');
            }

            this.closeModal();
            this.loadPlayers();

        } catch (error) {
            console.error('Erro ao salvar jogador:', error);
            this.showAlert('Erro ao salvar jogador', 'error');
        }
    }

    async uploadPhoto(file) {
        try {
            const fileRef = this.storage.ref()
                .child(`player-photos/${this.currentUser.uid}/${Date.now()}_${file.name}`);
            await fileRef.put(file);
            return await fileRef.getDownloadURL();
        } catch (error) {
            console.error('Erro ao fazer upload da foto:', error);
            throw error;
        }
    }

    async deletePlayer(id) {
        if (confirm('Tem certeza que deseja excluir este jogador?')) {
            try {
                await this.db.collection('players').doc(id).delete();
                this.showAlert('Jogador excluído com sucesso!', 'success');
                this.loadPlayers();
            } catch (error) {
                console.error('Erro ao excluir jogador:', error);
                this.showAlert('Erro ao excluir jogador', 'error');
            }
        }
    }

    filterPlayers() {
        const search = document.getElementById('searchPlayer').value.toLowerCase();
        const position = document.getElementById('positionFilter').value;
        const cards = document.querySelectorAll('.player-card');

        cards.forEach(card => {
            const name = card.querySelector('.player-name').textContent.toLowerCase();
            const playerPosition = card.querySelector('.player-position').textContent;
            
            const matchesSearch = name.includes(search);
            const matchesPosition = !position || playerPosition === position;

            card.style.display = matchesSearch && matchesPosition ? 'block' : 'none';
        });
    }

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        
        document.body.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 3000);
    }

    openModal(playerId = null) {
        this.editingPlayerId = playerId;
        const modal = document.getElementById('playerModal');
        const title = document.getElementById('modalTitle');
        
        if (playerId) {
            title.textContent = 'Editar Jogador';
            this.loadPlayerData(playerId);
        } else {
            title.textContent = 'Adicionar Jogador';
            document.getElementById('playerForm').reset();
            document.getElementById('photoPreview').src = '../assets/default-player.png';
        }
        
        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('playerModal').style.display = 'none';
        document.getElementById('playerForm').reset();
        this.editingPlayerId = null;
    }

    async loadPlayerData(id) {
        try {
            const doc = await this.db.collection('players').doc(id).get();
            if (doc.exists) {
                const player = doc.data();
                document.getElementById('playerName').value = player.name;
                document.getElementById('playerNumber').value = player.number;
                document.getElementById('playerPosition').value = player.position;
                document.getElementById('photoPreview').src = player.photoUrl || '../assets/default-player.png';
            }
        } catch (error) {
            console.error('Erro ao carregar dados do jogador:', error);
            this.showAlert('Erro ao carregar dados do jogador', 'error');
        }
    }
}

// Inicializar gerenciador
const playersManager = new PlayersManager();