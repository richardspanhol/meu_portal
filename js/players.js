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
        this.storageRef = this.storage.ref();
        this.currentUser = null;
        this.editingPlayerId = null;
        this.teamSport = null;
        this.init();
    }

    async init() {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                this.loadTeamData();
                this.loadPlayers();
                this.setupEventListeners();
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
                this.teamSport = data.sport;
                this.updatePositionOptions();
            }
        } catch (error) {
            console.error('Erro ao carregar dados do time:', error);
            this.showAlert('Erro ao carregar dados do time', 'error');
        }
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
        div.onclick = () => this.showPlayerDetails(player, id);
        div.innerHTML = `
            <div class="player-photo-container">
                <img src="${player.photoUrl || '../assets/default-player.png'}" 
                     alt="${player.name}" 
                     class="player-photo"
                     onerror="this.src='../assets/default-player.png'">
            </div>
            <div class="player-info">
                <div class="player-name">${player.name}</div>
            </div>
        `;
        return div;
    }

    showPlayerDetails(player, id) {
        const modal = document.createElement('div');
        modal.className = 'player-details-modal';
        
        // Formatar as datas para exibição
        const birthDate = player.birthDate ? new Date(player.birthDate).toLocaleDateString('pt-BR') : 'Não informado';
        const joinDate = player.joinDate ? new Date(player.joinDate).toLocaleDateString('pt-BR') : 'Não informado';
        
        modal.innerHTML = `
            <div class="player-details-content">
                <img src="${player.photoUrl || '../assets/default-player.png'}" 
                     alt="${player.name}" 
                     class="details-photo"
                     onerror="this.src='../assets/default-player.png'">
                <div class="details-info">
                    <button class="close-details" onclick="this.closest('.player-details-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="details-header">
                        <div class="details-name">${player.name}</div>
                        <div class="details-number">#${player.number}</div>
                        <div class="details-position">${player.position}</div>
                    </div>
                    <div class="details-data">
                        <div class="data-item">
                            <div class="data-label">Data de Nascimento</div>
                            <div class="data-value">${birthDate}</div>
                        </div>
                        <div class="data-item">
                            <div class="data-label">Data de Entrada</div>
                            <div class="data-value">${joinDate}</div>
                        </div>
                    </div>
                    <div class="details-actions">
                        <button onclick="playersManager.openModal('${id}')" class="btn-primary">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button onclick="playersManager.deletePlayer('${id}', this)" class="btn-secondary">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('active'), 10);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            }
        });
    }

    setupPhotoUpload() {
        const photoInput = document.getElementById('playerPhoto');
        const photoPreview = document.getElementById('photoPreview');

        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Preview da imagem
                const reader = new FileReader();
                reader.onload = (e) => {
                    photoPreview.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    async uploadPhoto(file) {
        if (!file) return null;
        
        try {
            // Criar nome único para o arquivo
            const timestamp = new Date().getTime();
            const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            
            // Criar referência para o arquivo
            const fileRef = this.storageRef.child(`players/${fileName}`);
            
            // Fazer o upload
            const snapshot = await fileRef.put(file);
            
            // Obter a URL do arquivo
            const downloadURL = await snapshot.ref.getDownloadURL();
            
            return downloadURL;
        } catch (error) {
            console.error('Erro detalhado do upload:', error);
            throw error;
        }
    }

    async savePlayer() {
        try {
            const photoFile = document.getElementById('playerPhoto').files[0];
            let photoUrl = '../assets/default-player.png';

            if (photoFile) {
                try {
                    const uploadedUrl = await this.uploadPhoto(photoFile);
                    if (uploadedUrl) {
                        photoUrl = uploadedUrl;
                    }
                } catch (uploadError) {
                    console.error('Erro no upload da foto:', uploadError);
                    // Continua com a foto padrão se houver erro no upload
                }
            }

            const playerData = {
                name: document.getElementById('playerName').value,
                number: parseInt(document.getElementById('playerNumber').value),
                position: document.getElementById('playerPosition').value,
                birthDate: document.getElementById('playerBirthDate').value || null,
                joinDate: document.getElementById('playerJoinDate').value || null,
                teamId: this.currentUser.uid,
                photoUrl: photoUrl,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (this.editingPlayerId) {
                await this.db.collection('players')
                    .doc(this.editingPlayerId)
                    .update(playerData);
            } else {
                playerData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await this.db.collection('players').add(playerData);
            }

            this.closeModal();
            this.loadPlayers();
            this.showAlert('Jogador salvo com sucesso!', 'success');

        } catch (error) {
            console.error('Erro completo:', error);
            this.showAlert(`Erro ao salvar jogador: ${error.message}`, 'error');
        }
    }

    async deletePlayer(id, buttonElement) {
        if (confirm('Tem certeza que deseja excluir este jogador?')) {
            try {
                await this.db.collection('players').doc(id).delete();
                this.showAlert('Jogador excluído com sucesso!', 'success');
                
                // Fechar o modal de detalhes
                const detailsModal = buttonElement.closest('.player-details-modal');
                if (detailsModal) {
                    detailsModal.classList.remove('active');
                    setTimeout(() => detailsModal.remove(), 300);
                }
                
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
        
        // Reset do formulário e preview da foto
        document.getElementById('playerForm').reset();
        document.getElementById('photoPreview').src = '../assets/default-player.png';
        
        if (playerId) {
            title.textContent = 'Editar Jogador';
            this.loadPlayerData(playerId);
        } else {
            title.textContent = 'Adicionar Jogador';
        }
        
        this.setupPhotoUpload();
        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('playerModal').style.display = 'none';
        document.getElementById('playerForm').reset();
        document.getElementById('photoPreview').src = '../assets/default-player.png';
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
                document.getElementById('playerBirthDate').value = player.birthDate || '';
                document.getElementById('playerJoinDate').value = player.joinDate || '';
                document.getElementById('photoPreview').src = player.photoUrl || '../assets/default-player.png';
            }
        } catch (error) {
            console.error('Erro ao carregar dados do jogador:', error);
            this.showAlert('Erro ao carregar dados do jogador', 'error');
        }
    }

    getPositionsByTeamSport() {
        switch (this.teamSport) {
            case 'futsal':
                return ['Goleiro', 'Fixo', 'Ala', 'Pivô'];
            case 'society':
            case 'campo':
                return ['Goleiro', 'Zagueiro', 'Lateral', 'Meio-campista', 'Atacante'];
            default:
                return ['Goleiro', 'Jogador'];
        }
    }

    updatePositionOptions() {
        const positions = this.getPositionsByTeamSport();
        const positionSelect = document.getElementById('playerPosition');
        const positionFilter = document.getElementById('positionFilter');
        
        const optionsHtml = positions.map(pos => 
            `<option value="${pos}">${pos}</option>`
        ).join('');

        positionSelect.innerHTML = `<option value="">Selecione a posição</option>${optionsHtml}`;
        positionFilter.innerHTML = `<option value="">Todas as posições</option>${optionsHtml}`;
    }
}

// Inicializar gerenciador
const playersManager = new PlayersManager();

// Função para abrir modal (chamada pelo HTML)
function openPlayerModal() {
    playersManager.openModal();
}

// Função para fechar modal (chamada pelo HTML)
function closePlayerModal() {
    playersManager.closeModal();
}

// Função para expandir/recolher detalhes do jogador
function togglePlayerDetails(header) {
    const card = header.closest('.player-card');
    card.classList.toggle('expanded');
}