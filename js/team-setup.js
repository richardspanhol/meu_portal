// Referências aos elementos do DOM
const form = document.getElementById('teamSetupForm');
const logoInput = document.getElementById('logoInput');
const logoPreview = document.getElementById('logoPreview');
const uploadBtn = document.querySelector('.upload-btn');

// Preview da logo (usando URL da FutLiga)
uploadBtn.addEventListener('click', () => {
    // Abrir FutLiga em nova aba
    window.open('https://www.futliga.com.br/Equipes', '_blank');
    
    // Solicitar URL da imagem
    const imageUrl = prompt('Cole aqui a URL da logo do seu time (clique com botão direito na imagem do time e selecione "Copiar endereço da imagem"):');
    if (imageUrl) {
        // Validar se é uma URL de imagem
        if (imageUrl.match(/\.(jpeg|jpg|gif|png)$/) != null) {
            logoPreview.src = imageUrl;
            logoInput.logoUrl = imageUrl; // Guardar a URL para usar depois
        } else {
            alert('Por favor, insira uma URL válida de imagem (terminada em .jpg, .png, .gif ou .jpeg)');
        }
    }
});

// Máscara para telefone
const phoneInput = document.getElementById('phone');
phoneInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
        value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
        value = value.replace(/(\d)(\d{4})$/, '$1-$2');
        e.target.value = value;
    }
});

// Envio do formulário
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            alert('Você precisa estar logado para cadastrar um time.');
            window.location.href = '../index.html';
            return;
        }

        // Dados do time
        const teamData = {
            name: document.getElementById('teamName').value,
            managerName: document.getElementById('managerName').value,
            phone: document.getElementById('phone').value,
            address: document.getElementById('address').value,
            sport: document.getElementById('sport').value,
            primaryColor: document.getElementById('primaryColor').value,
            secondaryColor: document.getElementById('secondaryColor').value,
            logoUrl: logoInput.logoUrl || '../assets/default-team.png',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Validar dados obrigatórios
        if (!teamData.name || !teamData.managerName || !teamData.phone || !teamData.address) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        // Salvar dados do time
        await firebase.firestore().collection('teams').doc(user.uid).set(teamData);

        // Atualizar status do usuário
        await firebase.firestore().collection('users').doc(user.uid).update({
            hasTeam: true,
            teamConfigured: true,
            teamId: user.uid
        });

        alert('Time cadastrado com sucesso!');
        window.location.href = 'dashboard.html';

    } catch (error) {
        console.error('Erro ao configurar time:', error);
        alert('Erro ao cadastrar time: ' + error.message);
    }
});

// Verificar autenticação
firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = '../index.html';
    }
}); 