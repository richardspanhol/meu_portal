// Variáveis de controle
let editingTransactionId = null;

// Categorias predefinidas
const categories = {
    income: [
        'Mensalidade',
        'Patrocínio',
        'Venda de Uniforme',
        'Evento',
        'Outros'
    ],
    expense: [
        'Aluguel de Campo',
        'Material Esportivo',
        'Uniforme',
        'Arbitragem',
        'Transporte',
        'Outros'
    ]
};

// Controle do menu
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

// Sistema de gerenciamento financeiro
class FinancialManager {
    constructor() {
        this.db = firebase.firestore();
        this.currentUser = null;
        this.editingTransactionId = null;
        
        // Definir categorias
        this.categories = {
            income: ['Mensalidade', 'Patrocínio', 'Evento', 'Doação', 'Outros'],
            expense: ['Material Esportivo', 'Aluguel', 'Transporte', 'Alimentação', 'Manutenção', 'Outros']
        };
        
        this.init();
    }

    async init() {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                this.initializeElements();
                this.loadTransactions();
                this.setupEventListeners();
                this.updateBalance();
            } else {
                window.location.href = '../index.html';
            }
        });
    }

    initializeElements() {
        // Inicializar elementos do resumo
        const summaryElements = ['totalIncome', 'totalExpenses', 'balance'];
        summaryElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = this.formatCurrency(0);
            }
        });
    }

    setupEventListeners() {
        // Formulário de transação
        const form = document.getElementById('transactionForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveTransaction();
            });
        }

        // Filtros
        const monthFilter = document.getElementById('monthFilter');
        const typeFilter = document.getElementById('typeFilter');
        
        if (monthFilter) {
            monthFilter.addEventListener('change', () => this.filterTransactions());
        }
        if (typeFilter) {
            typeFilter.addEventListener('change', () => this.filterTransactions());
        }

        // Atualizar categorias quando mudar o tipo
        document.getElementById('type').addEventListener('change', () => this.updateCategories());
    }

    async loadTransactions() {
        // Carregar todas as transações inicialmente
        await this.filterTransactions();
    }

    async saveTransaction() {
        try {
            const transactionData = {
                description: document.getElementById('description').value,
                amount: parseFloat(document.getElementById('amount').value),
                type: document.getElementById('type').value,
                category: document.getElementById('category').value,
                date: new Date(document.getElementById('date').value),
                teamId: this.currentUser.uid,
                createdAt: new Date()
            };

            // Adicionar jogador se for mensalidade
            if (transactionData.type === 'income' && transactionData.category === 'Mensalidade') {
                const playerSelect = document.getElementById('playerSelect');
                if (playerSelect) {
                    transactionData.playerId = playerSelect.value;
                    
                    // Adicionar nome do jogador na descrição se estiver vazia
                    if (!transactionData.description) {
                        const playerName = playerSelect.options[playerSelect.selectedIndex].text;
                        transactionData.description = `Mensalidade - ${playerName}`;
                    }
                }
            }

            if (this.editingTransactionId) {
                await this.db.collection('financial')
                    .doc(this.editingTransactionId)
                    .update(transactionData);
                this.showAlert('Transação atualizada com sucesso!', 'success');
            } else {
                await this.db.collection('financial').add(transactionData);
                this.showAlert('Transação adicionada com sucesso!', 'success');
            }

            this.closeModal();
            this.loadTransactions();
            this.updateBalance();

        } catch (error) {
            console.error('Erro ao salvar transação:', error);
            this.showAlert('Erro ao salvar transação: ' + error.message, 'error');
        }
    }

    async deleteTransaction(id) {
        if (confirm('Tem certeza que deseja excluir esta transação?')) {
            try {
                await this.db.collection('financial').doc(id).delete();
                this.showAlert('Transação excluída com sucesso!', 'success');
                this.loadTransactions();
                this.updateBalance();
            } catch (error) {
                console.error('Erro ao excluir transação:', error);
                this.showAlert('Erro ao excluir transação', 'error');
            }
        }
    }

    // Métodos auxiliares
    createTransactionRow(transaction, id) {
        const row = document.createElement('tr');
        const date = new Date(transaction.date).toLocaleDateString('pt-BR');
        
        row.innerHTML = `
            <td>${date}</td>
            <td>${transaction.description}</td>
            <td>${transaction.category}</td>
            <td class="${transaction.type === 'income' ? 'income' : 'expense'}">
                R$ ${transaction.amount.toFixed(2)}
            </td>
            <td>
                <button onclick="financialManager.editTransaction('${id}')" class="btn-icon">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="financialManager.deleteTransaction('${id}')" class="btn-icon delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        return row;
    }

    populateMonthFilter() {
        const select = document.getElementById('monthFilter');
        select.innerHTML = `
            <option value="all">Todos os meses</option>
            <option value="24">Últimos 24 meses</option>
            <option value="12">Últimos 12 meses</option>
            <option value="6">Últimos 6 meses</option>
            <option value="3">Últimos 3 meses</option>
            <option value="1">Último mês</option>
        `;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        
        document.body.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 3000);
    }

    async updateBalance() {
        try {
            const balanceElement = document.getElementById('balance');
            if (!balanceElement) return;

            const snapshot = await this.db.collection('financial')
                .where('teamId', '==', this.currentUser.uid)
                .get();

            let totalIncome = 0;
            let totalExpenses = 0;

            snapshot.forEach(doc => {
                const transaction = doc.data();
                const amount = parseFloat(transaction.amount) || 0;
                
                if (transaction.type === 'income') {
                    totalIncome += amount;
                } else {
                    totalExpenses += amount;
                }
            });

            const balance = totalIncome - totalExpenses;
            this.updateSummary(totalIncome, totalExpenses);

        } catch (error) {
            console.error('Erro ao atualizar saldo:', error);
            this.showAlert('Erro ao atualizar saldo', 'error');
        }
    }

    updateSummary(income, expenses) {
        const elements = {
            totalIncome: document.getElementById('totalIncome'),
            totalExpenses: document.getElementById('totalExpenses'),
            balance: document.getElementById('balance')
        };

        if (elements.totalIncome) {
            elements.totalIncome.textContent = this.formatCurrency(income);
        }
        if (elements.totalExpenses) {
            elements.totalExpenses.textContent = this.formatCurrency(expenses);
        }
        if (elements.balance) {
            elements.balance.textContent = this.formatCurrency(income - expenses);
        }
    }

    async updateCategories() {
        const typeSelect = document.getElementById('type');
        const categorySelect = document.getElementById('category');
        
        if (!typeSelect || !categorySelect) return;

        const type = typeSelect.value;
        const options = this.categories[type] || [];
        
        categorySelect.innerHTML = `
            <option value="">Selecione a categoria</option>
            ${options.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
        `;

        // Após atualizar as categorias, verificar se precisa mostrar o campo de jogador
        this.togglePlayerField();
    }

    async togglePlayerField() {
        try {
            const type = document.getElementById('type').value;
            const category = document.getElementById('category').value;
            const playerFieldContainer = document.getElementById('playerFieldContainer');
            
            // Remove o campo existente se houver
            if (playerFieldContainer) {
                playerFieldContainer.remove();
            }

            // Adiciona o campo de jogador apenas se for mensalidade
            if (type === 'income' && category === 'Mensalidade') {
                const formGroup = document.createElement('div');
                formGroup.id = 'playerFieldContainer';
                formGroup.className = 'form-group';
                
                // Buscar jogadores do time
                const players = await this.loadTeamPlayers();
                
                if (players.length === 0) {
                    this.showAlert('Nenhum jogador cadastrado. Cadastre jogadores primeiro.', 'warning');
                    return;
                }

                formGroup.innerHTML = `
                    <label for="playerSelect"><i class="fas fa-user"></i> Jogador</label>
                    <select id="playerSelect" required>
                        <option value="">Selecione o jogador</option>
                        ${players.map(player => `
                            <option value="${player.id}">${player.name}</option>
                        `).join('')}
                    </select>
                `;

                // Inserir após o campo de categoria
                const categoryGroup = document.getElementById('category').closest('.form-row');
                if (categoryGroup) {
                    categoryGroup.insertAdjacentElement('afterend', formGroup);
                }
            }
        } catch (error) {
            console.error('Erro ao configurar campo de jogador:', error);
            this.showAlert('Erro ao carregar lista de jogadores', 'error');
        }
    }

    async loadTeamPlayers() {
        try {
            // Simplificar a consulta para evitar necessidade de índice composto
            const snapshot = await this.db.collection('players')
                .where('teamId', '==', this.currentUser.uid)
                .get();

            // Ordenar os resultados no lado do cliente
            const players = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Ordenar por nome
            return players.sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
            console.error('Erro ao carregar jogadores:', error);
            this.showAlert('Erro ao carregar lista de jogadores', 'error');
            return [];
        }
    }

    async filterTransactions() {
        try {
            const monthFilter = document.getElementById('monthFilter');
            const typeFilter = document.getElementById('typeFilter');
            const transactionsTable = document.querySelector('table tbody');

            if (!monthFilter || !typeFilter || !transactionsTable) {
                console.error('Elementos de filtro não encontrados');
                return;
            }

            let query = this.db.collection('financial')
                .where('teamId', '==', this.currentUser.uid)
                .orderBy('date', 'desc');

            // Aplicar filtro de período
            if (monthFilter.value !== 'all') {
                const months = parseInt(monthFilter.value);
                const today = new Date();
                const startDate = new Date(today.getFullYear(), today.getMonth() - months, today.getDate());
                query = query.where('date', '>=', startDate);
            }

            // Aplicar filtro de tipo
            if (typeFilter.value !== 'all') {
                query = query.where('type', '==', typeFilter.value);
            }

            const snapshot = await query.get();
            transactionsTable.innerHTML = '';
            
            let totalIncome = 0;
            let totalExpenses = 0;

            snapshot.forEach(doc => {
                const transaction = doc.data();
                const row = this.createTransactionRow(transaction, doc.id);
                transactionsTable.appendChild(row);

                const amount = parseFloat(transaction.amount) || 0;
                if (transaction.type === 'income') {
                    totalIncome += amount;
                } else {
                    totalExpenses += amount;
                }
            });

            // Atualizar resumo
            this.updateSummary(totalIncome, totalExpenses);

        } catch (error) {
            console.error('Erro ao filtrar transações:', error);
            this.showAlert('Erro ao filtrar transações: ' + error.message, 'error');
        }
    }

    openModal(transactionId = null) {
        this.editingTransactionId = transactionId;
        const modal = document.getElementById('transactionModal');
        const title = document.getElementById('modalTitle');
        
        if (transactionId) {
            title.textContent = 'Editar Transação';
            this.loadTransactionData(transactionId);
        } else {
            title.textContent = 'Nova Transação';
            document.getElementById('transactionForm').reset();
            this.setDefaultDate();
        }
        
        this.updateCategories();
        modal.style.display = 'block';
    }

    closeModal() {
        const modal = document.getElementById('transactionModal');
        if (modal) {
            modal.style.display = 'none';
            document.getElementById('transactionForm').reset();
            this.editingTransactionId = null;
        }
    }

    setDefaultDate() {
        const dateInput = document.getElementById('date');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
        }
    }

    async loadTransactionData(id) {
        try {
            const doc = await this.db.collection('financial').doc(id).get();
            if (doc.exists) {
                const transaction = doc.data();
                document.getElementById('description').value = transaction.description;
                document.getElementById('amount').value = transaction.amount;
                document.getElementById('type').value = transaction.type;
                document.getElementById('date').value = new Date(transaction.date).toISOString().split('T')[0];
                await this.updateCategories();
                document.getElementById('category').value = transaction.category;
            }
        } catch (error) {
            console.error('Erro ao carregar dados da transação:', error);
            this.showAlert('Erro ao carregar dados da transação', 'error');
        }
    }
}

// Inicializar gerenciador
const financialManager = new FinancialManager();