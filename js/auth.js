// Sistema de autenticação
class AuthSystem {
    constructor() {
        this.auth = firebase.auth();
        this.db = firebase.firestore();
    }

    // Login com Google
    async signInWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.setCustomParameters({
                prompt: 'select_account'
            });
            
            const result = await this.auth.signInWithPopup(provider);
            
            if (result.user) {
                await this.createTeamIfNotExists(result.user);
                window.location.href = 'pages/dashboard.html';
                return true;
            }
            return false;
        } catch (error) {
            console.error('Erro no login:', error);
            throw error;
        }
    }

    // Criar time se não existir
    async createTeamIfNotExists(user) {
        try {
            const teamRef = this.db.collection('teams').doc(user.uid);
            const doc = await teamRef.get();

            if (!doc.exists) {
                await teamRef.set({
                    name: 'Meu Time',
                    createdAt: new Date(),
                    owner: user.uid,
                    email: user.email,
                    sport: 'futsal',
                    logoUrl: null,
                    settings: {
                        emailNotifications: true,
                        matchReminders: true,
                        publicProfile: false
                    }
                });
            }
        } catch (error) {
            console.error('Erro ao criar time:', error);
            throw error;
        }
    }

    // Verificar autenticação
    onAuthStateChanged(callback) {
        return this.auth.onAuthStateChanged(callback);
    }

    // Logout
    async logout() {
        try {
            await this.auth.signOut();
            return true;
        } catch (error) {
            console.error('Erro no logout:', error);
            throw error;
        }
    }
}

// Criar instância
const authSystem = new AuthSystem();

// Função global de login
window.signInWithGoogle = function() {
    authSystem.signInWithGoogle();
};

// Verificar estado de autenticação
firebase.auth().onAuthStateChanged((user) => {
    if (user && window.location.pathname.includes('index.html')) {
        window.location.href = 'pages/dashboard.html';
    }
});