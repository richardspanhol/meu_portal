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
function openAddTransactionModal() {
    document.getElementById('addTransactionModal').style.display = 'block';
    document.getElementById('date').valueAsDate = new Date();
}

function closeAddTransactionModal() {
    document.getElementById('addTransactionModal').style.display = 'none';
    document.getElementById('addTransactionForm').reset();
}

// Adicionar Transação
document.getElementById('addTransactionForm').addEventListener('submit', async (e) => {
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
        const transactionData = {
            description: document.getElementById('description').value,
            amount: parseFloat(document.getElementById('amount').value),
            type: document.getElementById('type').value,
            date: document.getElementById('date').value,
            teamId: teamId,
            createdAt: new Date()
        };

        await db.collection('transactions').add(transactionData);
        closeAddTransactionModal();
        loadTransactions();
        updateFinancialSummary();
    } catch (error) {
        console.error('Erro ao adicionar transação:', error);
        alert('Erro ao salvar transação');
    }
});

// Carregar Transações
async function loadTransactions() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const teamSnapshot = await db.collection('teams')
            .where('userId', '==', user.uid)
            .limit(1)
            .get();

        if (!teamSnapshot.empty) {
            const teamId = teamSnapshot.docs[0].id;
            const monthFilter = document.getElementById('monthFilter').value;
            const typeFilter = document.getElementById('typeFilter').value;

            let query = db.collection('transactions')
                .where('teamId', '==', teamId)
                .orderBy('date', 'desc');

            if (monthFilter) {
                const startDate = new Date(monthFilter);
                const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
                query = query.where('date', '>=', startDate).where('date', '<=', endDate);
            }

            if (typeFilter) {
                query = query.where('type', '==', typeFilter);
            }

            const snapshot = await query.get();
            const transactionsList = document.getElementById('transactionsList');
            transactionsList.innerHTML = '';

            snapshot.forEach(doc => {
                const transaction = doc.data();
                const tr = createTransactionRow(transaction, doc.id);
                transactionsList.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar transações:', error);
    }
}

// Atualizar Resumo Financeiro
async function updateFinancialSummary() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const teamSnapshot = await db.collection('teams')
            .where('userId', '==', user.uid)
            .limit(1)
            .get();

        if (!teamSnapshot.empty) {
            const teamId = teamSnapshot.docs[0].id;
            const snapshot = await db.collection('transactions')
                .where('teamId', '==', teamId)
                .get();

            let totalIncome = 0;
            let totalExpense = 0;

            snapshot.forEach(doc => {
                const transaction = doc.data();
                if (transaction.type === 'income') {
                    totalIncome += transaction.amount;
                } else {
                    totalExpense += transaction.amount;
                }
            });

            document.getElementById('totalIncome').textContent = `R$ ${totalIncome.toFixed(2)}`;
            document.getElementById('totalExpense').textContent = `R$ ${totalExpense.toFixed(2)}`;
            document.getElementById('balance').textContent = `R$ ${(totalIncome - totalExpense).toFixed(2)}`;
        }
    } catch (error) {
        console.error('Erro ao atualizar resumo:', error);
    }
}

// Criar linha da transação
function createTransactionRow(transaction, id) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${new Date(transaction.date).toLocaleDateString()}</td>
        <td>${transaction.description}</td>
        <td>${transaction.type === 'income' ? 'Receita' : 'Despesa'}</td>
        <td class="${transaction.type === 'income' ? 'income' : 'expense'}">
            R$ ${transaction.amount.toFixed(2)}
        </td>
        <td>
            <button onclick="editTransaction('${id}')" class="btn-icon">
                <i class="fas fa-edit"></i>
            </button>
            <button onclick="deleteTransaction('${id}')" class="btn-icon delete">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    return tr;
}

// Inicializar filtros e carregar dados
function initializeFilters() {
    const monthFilter = document.getElementById('monthFilter');
    const currentDate = new Date();
    
    for (let i = 0; i < 12; i++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const option = document.createElement('option');
        option.value = date.toISOString().slice(0, 7);
        option.textContent = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        monthFilter.appendChild(option);
    }

    // Adicionar event listeners para os filtros
    monthFilter.addEventListener('change', loadTransactions);
    document.getElementById('typeFilter').addEventListener('change', loadTransactions);
}

// Verificar autenticação e inicializar
auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = '../index.html';
    } else {
        initializeFilters();
        loadTransactions();
        updateFinancialSummary();
    }
});