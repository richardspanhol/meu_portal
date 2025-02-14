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
        this.init();
    }

    async init() {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                this.loadTeamData();
                this.setupEventListeners();
                this.loadTransactions();
                this.updateFinancialSummary();
                this.populateMonthFilter();
            } else {
                window.location.href = '../index.html';
            }
        });
    }

    setupEventListeners() {
        // Formulário de transação
        document.getElementById('transactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTransaction();
        });

        // Filtros
        document.getElementById('monthFilter').addEventListener('change', () => this.filterTransactions());
        document.getElementById('typeFilter').addEventListener('change', () => this.filterTransactions());

        // Atualizar categorias quando mudar o tipo
        document.getElementById('type').addEventListener('change', () => this.updateCategories());
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

    async loadTransactions() {
        try {
            const monthFilter = document.getElementById('monthFilter').value;
            const typeFilter = document.getElementById('typeFilter').value;

            let query = this.db.collection('financial')
                .where('teamId', '==', this.currentUser.uid)
                .orderBy('date', 'desc');

            if (monthFilter) {
                const startDate = new Date(monthFilter + '-01');
                const endDate = new Date(monthFilter + '-31');
                query = query.where('date', '>=', startDate)
                           .where('date', '<=', endDate);
            }

            if (typeFilter) {
                query = query.where('type', '==', typeFilter);
            }

            const snapshot = await query.get();
            const transactionsList = document.getElementById('transactionsList');
            transactionsList.innerHTML = '';

            snapshot.forEach(doc => {
                const transaction = doc.data();
                const row = this.createTransactionRow(transaction, doc.id);
                transactionsList.appendChild(row);
            });

        } catch (error) {
            console.error('Erro ao carregar transações:', error);
            this.showAlert('Erro ao carregar transações', 'error');
        }
    }

    async updateFinancialSummary() {
        try {
            const snapshot = await this.db.collection('financial')
                .where('teamId', '==', this.currentUser.uid)
                .get();

            let income = 0;
            let expense = 0;

            snapshot.forEach(doc => {
                const transaction = doc.data();
                if (transaction.type === 'income') {
                    income += transaction.amount;
                } else {
                    expense += transaction.amount;
                }
            });

            const balance = income - expense;

            document.getElementById('totalIncome').textContent = this.formatCurrency(income);
            document.getElementById('totalExpense').textContent = this.formatCurrency(expense);
            document.getElementById('balance').textContent = this.formatCurrency(balance);

        } catch (error) {
            console.error('Erro ao atualizar resumo:', error);
            this.showAlert('Erro ao atualizar resumo financeiro', 'error');
        }
    }

    async saveTransaction() {
        try {
            const transactionData = {
                description: document.getElementById('description').value,
                amount: parseFloat(document.getElementById('amount').value),
                type: document.getElementById('type').value,
                category: document.getElementById('category').value,
                date: document.getElementById('date').value,
                teamId: this.currentUser.uid,
                createdAt: new Date()
            };

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
            this.updateFinancialSummary();

        } catch (error) {
            console.error('Erro ao salvar transação:', error);
            this.showAlert('Erro ao salvar transação', 'error');
        }
    }

    async deleteTransaction(id) {
        if (confirm('Tem certeza que deseja excluir esta transação?')) {
            try {
                await this.db.collection('financial').doc(id).delete();
                this.showAlert('Transação excluída com sucesso!', 'success');
                this.loadTransactions();
                this.updateFinancialSummary();
            } catch (error) {
                console.error('Erro ao excluir transação:', error);
                this.showAlert('Erro ao excluir transação', 'error');
            }
        }
    }

    // Métodos auxiliares
    createTransactionRow(transaction, id) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${this.formatDate(transaction.date)}</td>
            <td>${transaction.description}</td>
            <td>${transaction.category}</td>
            <td class="transaction-amount ${transaction.type}">
                ${this.formatCurrency(transaction.amount)}
            </td>
            <td class="transaction-actions">
                <button onclick="financialManager.editTransaction('${id}')" class="btn-icon">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="financialManager.deleteTransaction('${id}')" class="btn-icon delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        return tr;
    }

    populateMonthFilter() {
        const select = document.getElementById('monthFilter');
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();

        for (let i = 0; i < 12; i++) {
            const date = new Date(currentYear, currentMonth - i, 1);
            const value = date.toISOString().slice(0, 7);
            const text = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            
            const option = document.createElement('option');
            option.value = value;
            option.textContent = text;
            select.appendChild(option);
        }
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
}

// Inicializar gerenciador
const financialManager = new FinancialManager();

// Funções do modal
function openTransactionModal(transactionId = null) {
    editingTransactionId = transactionId;
    const modal = document.getElementById('transactionModal');
    const title = document.getElementById('modalTitle');
    
    if (transactionId) {
        title.textContent = 'Editar Transação';
        loadTransactionData(transactionId);
    } else {
        title.textContent = 'Nova Transação';
        document.getElementById('transactionForm').reset();
        setDefaultDate();
        updateCategories();
    }
    
    modal.style.display = 'block';
}

function closeTransactionModal() {
    document.getElementById('transactionModal').style.display = 'none';
    document.getElementById('transactionForm').reset();
    editingTransactionId = null;
}

// Configurar data padrão
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
}

// Atualizar categorias baseado no tipo
function updateCategories() {
    const type = document.getElementById('type').value;
    const categorySelect = document.getElementById('category');
    const options = categories[type];
    
    categorySelect.innerHTML = '<option value="">Selecione a categoria</option>' +
        options.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

// Filtrar transações
function filterTransactions() {
    financialManager.loadTransactions();
}

async function loadTransactionData(id) {
    try {
        const doc = await firebase.firestore()
            .collection('financial')
            .doc(id)
            .get();

        if (doc.exists) {
            const transaction = doc.data();
            document.getElementById('description').value = transaction.description;
            document.getElementById('amount').value = transaction.amount;
            document.getElementById('type').value = transaction.type;
            document.getElementById('date').value = transaction.date;
            updateCategories();
            document.getElementById('category').value = transaction.category;
        }
    } catch (error) {
        console.error('Erro ao carregar dados da transação:', error);
        showAlert('Erro ao carregar dados da transação', 'error');
    }
}