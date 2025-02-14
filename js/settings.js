// Controle do menu
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

// Sistema de gerenciamento de configurações
class SettingsManager {
    constructor() {
        this.db = firebase.firestore();
        this.storage = firebase.storage();
        this.currentUser = null;
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
        // Preview da logo
        document.getElementById('teamLogo').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('logoPreview').src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });

        // Formulário de informações do time
        document.getElementById('teamInfoForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTeamInfo();
        });

        // Configurações de notificações
        document.getElementById('emailNotifications').addEventListener('change', () => this.saveNotificationSettings());
        document.getElementById('matchReminders').addEventListener('change', () => this.saveNotificationSettings());
        document.getElementById('publicProfile').addEventListener('change', () => this.savePrivacySettings());
        document.getElementById('showStats').addEventListener('change', () => this.savePrivacySettings());

        // Máscara para telefone
        document.getElementById('phone').addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 11) {
                value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
                value = value.replace(/(\d)(\d{4})$/, '$1-$2');
                e.target.value = value;
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
                
                // Preencher formulário
                document.getElementById('teamName').value = data.name || '';
                document.getElementById('sport').value = data.sport || 'futsal';
                document.getElementById('managerName').value = data.managerName || '';
                document.getElementById('phone').value = data.phone || '';
                document.getElementById('address').value = data.address || '';
                document.getElementById('primaryColor').value = data.primaryColor || '#FF6B00';
                document.getElementById('secondaryColor').value = data.secondaryColor || '#000000';
                
                if (data.logoUrl) {
                    document.getElementById('logoPreview').src = data.logoUrl;
                }

                // Carregar configurações
                document.getElementById('emailNotifications').checked = data.settings?.emailNotifications ?? true;
                document.getElementById('matchReminders').checked = data.settings?.matchReminders ?? true;
                document.getElementById('publicProfile').checked = data.settings?.publicProfile ?? false;
                document.getElementById('showStats').checked = data.settings?.showStats ?? false;
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            this.showAlert('Erro ao carregar dados do time', 'error');
        }
    }

    async saveTeamInfo() {
        try {
            const teamData = {
                name: document.getElementById('teamName').value,
                sport: document.getElementById('sport').value,
                managerName: document.getElementById('managerName').value,
                phone: document.getElementById('phone').value,
                address: document.getElementById('address').value,
                primaryColor: document.getElementById('primaryColor').value,
                secondaryColor: document.getElementById('secondaryColor').value,
                updatedAt: new Date()
            };

            // Upload da logo se houver
            const logoInput = document.getElementById('teamLogo');
            if (logoInput.files.length > 0) {
                const file = logoInput.files[0];
                const logoUrl = await this.uploadLogo(file);
                teamData.logoUrl = logoUrl;
            }

            await this.db.collection('teams')
                .doc(this.currentUser.uid)
                .update(teamData);

            this.showAlert('Alterações salvas com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao salvar alterações:', error);
            this.showAlert('Erro ao salvar alterações', 'error');
        }
    }

    async uploadLogo(file) {
        try {
            const fileRef = this.storage.ref()
                .child(`team-logos/${this.currentUser.uid}/${file.name}`);
            await fileRef.put(file);
            return await fileRef.getDownloadURL();
        } catch (error) {
            console.error('Erro ao fazer upload da logo:', error);
            throw error;
        }
    }

    async saveNotificationSettings() {
        try {
            const settings = {
                emailNotifications: document.getElementById('emailNotifications').checked,
                matchReminders: document.getElementById('matchReminders').checked
            };

            await this.db.collection('teams')
                .doc(this.currentUser.uid)
                .update({
                    'settings.emailNotifications': settings.emailNotifications,
                    'settings.matchReminders': settings.matchReminders
                });

            this.showAlert('Configurações de notificações atualizadas!', 'success');
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            this.showAlert('Erro ao salvar configurações', 'error');
        }
    }

    async savePrivacySettings() {
        try {
            const settings = {
                publicProfile: document.getElementById('publicProfile').checked,
                showStats: document.getElementById('showStats').checked
            };

            await this.db.collection('teams')
                .doc(this.currentUser.uid)
                .update({
                    'settings.publicProfile': settings.publicProfile,
                    'settings.showStats': settings.showStats
                });

            this.showAlert('Configurações de privacidade atualizadas!', 'success');
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            this.showAlert('Erro ao salvar configurações', 'error');
        }
    }

    async resetTeamData() {
        if (!confirm('Tem certeza que deseja resetar todos os dados do time? Esta ação não pode ser desfeita.')) {
            return;
        }

        try {
            const batch = this.db.batch();

            // Excluir jogadores
            const playersSnapshot = await this.db.collection('players')
                .where('teamId', '==', this.currentUser.uid)
                .get();

            playersSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            // Excluir partidas
            const matchesSnapshot = await this.db.collection('matches')
                .where('teamId', '==', this.currentUser.uid)
                .get();

            matchesSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            // Excluir transações
            const financialSnapshot = await this.db.collection('financial')
                .where('teamId', '==', this.currentUser.uid)
                .get();

            financialSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            this.showAlert('Dados do time resetados com sucesso!', 'success');
            setTimeout(() => window.location.reload(), 2000);

        } catch (error) {
            console.error('Erro ao resetar dados:', error);
            this.showAlert('Erro ao resetar dados', 'error');
        }
    }

    async deleteAccount() {
        if (!confirm('Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.')) {
            return;
        }

        try {
            // Excluir dados do time
            await this.resetTeamData();

            // Excluir documento do time
            await this.db.collection('teams')
                .doc(this.currentUser.uid)
                .delete();

            // Excluir usuário
            await this.currentUser.delete();
            window.location.href = '../index.html';

        } catch (error) {
            console.error('Erro ao excluir conta:', error);
            this.showAlert('Erro ao excluir conta', 'error');
        }
    }

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        
        document.body.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 3000);
    }
}

// Inicializar gerenciador
const settingsManager = new SettingsManager();

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