class DatabaseService {
    constructor() {
        this.db = firebase.firestore();
    }

    // Métodos para jogadores
    async addPlayer(teamId, playerData) {
        try {
            await this.db.collection('teams').doc(teamId).collection('players').add(playerData);
        } catch (error) {
            console.error('Erro ao adicionar jogador:', error);
            throw error;
        }
    }

    // Métodos para súmula
    async createMatch(matchData) {
        try {
            await this.db.collection('matches').add(matchData);
        } catch (error) {
            console.error('Erro ao criar partida:', error);
            throw error;
        }
    }

    // Métodos para financeiro
    async addFinancialRecord(teamId, recordData) {
        try {
            await this.db.collection('teams').doc(teamId).collection('financial').add(recordData);
        } catch (error) {
            console.error('Erro ao adicionar registro financeiro:', error);
            throw error;
        }
    }
}