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

// Funções do Modal
function openAddPlayerModal() {
    document.getElementById('addPlayerModal').style.display = 'block';
}

function closeAddPlayerModal() {
    document.getElementById('addPlayerModal').style.display = 'none';
    document.getElementById('addPlayerForm').reset();
    document.getElementById('photoPreview').innerHTML = `
        <i class="fas fa-camera"></i>
        <span>Adicionar foto</span>
    `;
}

// Preview da foto
document.getElementById('playerPhoto').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('photoPreview').innerHTML = `
                <img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover;">
            `;
        };
        reader.readAsDataURL(file);
    }
});

// Adicionar jogador
document.getElementById('addPlayerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const user = auth.currentUser;
    if (!user) return;

    try {
        // Buscar ID do time do usuário
        const teamSnapshot = await db.collection('teams')
            .where('userId', '==', user.uid)
            .limit(1)
            .get();

        if (teamSnapshot.empty) {
            alert('Time não encontrado');
            return;
        }

        const teamId = teamSnapshot.docs[0].id;
        const playerData = {
            name: document.getElementById('playerName').value,
            number: document.getElementById('playerNumber').value,
            position: document.getElementById('playerPosition').value,
            teamId: teamId,
            createdAt: new Date()
        };

        // Se houver foto, converter para base64
        const photoInput = document.getElementById('playerPhoto');
        if (photoInput.files.length > 0) {
            const base64Photo = await getBase64Image(photoInput.files[0]);
            playerData.photo = base64Photo;
        }

        await db.collection('players').add(playerData);
        closeAddPlayerModal();
        loadPlayers();
    } catch (error) {
        console.error('Erro ao adicionar jogador:', error);
        alert('Erro ao adicionar jogador');
    }
});

// Carregar jogadores
async function loadPlayers() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        // Buscar ID do time do usuário
        const teamSnapshot = await db.collection('teams')
            .where('userId', '==', user.uid)
            .limit(1)
            .get();

        if (!teamSnapshot.empty) {
            const teamId = teamSnapshot.docs[0].id;
            const playersSnapshot = await db.collection('players')
                .where('teamId', '==', teamId)
                .get();

            const playersList = document.getElementById('playersList');
            playersList.innerHTML = '';

            playersSnapshot.forEach(doc => {
                const player = doc.data();
                const playerCard = createPlayerCard(player, doc.id);
                playersList.appendChild(playerCard);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar jogadores:', error);
    }
}

// Criar card do jogador
function createPlayerCard(player, playerId) {
    const div = document.createElement('div');
    div.className = 'player-card';
    div.innerHTML = `
        <div class="player-photo">
            ${player.photo ? 
                `<img src="${player.photo}" alt="${player.name}">` : 
                `<div class="no-photo">
                    <i class="fas fa-user"></i>
                </div>`
            }
        </div>
        <h3>${player.name}</h3>
        <p class="player-number">#${player.number}</p>
        <p class="player-position">${player.position}</p>
        <div class="player-actions">
            <button onclick="editPlayer('${playerId}')" class="btn-icon">
                <i class="fas fa-edit"></i>
            </button>
            <button onclick="deletePlayer('${playerId}')" class="btn-icon delete">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    return div;
}

// Função auxiliar para converter imagem em base64
function getBase64Image(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Verificar autenticação e carregar dados
auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = '../index.html';
    } else {
        loadPlayers();
    }
});