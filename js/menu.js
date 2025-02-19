class MenuManager {
    constructor() {
        this.db = firebase.firestore();
        this.currentUser = null;
        this.init();
    }

    async init() {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                await this.loadTeamData();
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
                const teamData = teamDoc.data();
                
                // Atualizar logo e nome do time
                const teamLogo = document.getElementById('teamLogo');
                const teamName = document.getElementById('teamName');

                if (teamLogo) {
                    teamLogo.src = teamData.logoUrl || '../assets/default-team.png';
                    teamLogo.onerror = function() {
                        this.src = '../assets/default-team.png';
                    };
                }
                
                if (teamName) {
                    teamName.textContent = teamData.name;
                }
            }
        } catch (error) {
            console.error('Erro ao carregar dados do time:', error);
        }
    }
}

// Inicializar o gerenciador de menu
const menuManager = new MenuManager();

// Função para alternar a visibilidade do menu lateral
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
}

// Função de logout
function logout() {
    firebase.auth().signOut()
        .then(() => {
            window.location.href = '../index.html';
        })
        .catch((error) => {
            console.error('Erro ao fazer logout:', error);
        });
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