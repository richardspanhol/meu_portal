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

// Referências aos elementos do DOM
const teamSetupForm = document.getElementById('teamSetupForm');
const logoInput = document.getElementById('teamLogo');
const logoPreview = document.getElementById('logoPreview');

// Preview da logo
logoInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            logoPreview.innerHTML = `<img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover;">`;
        };
        reader.readAsDataURL(file);
    }
});

// Formatação do WhatsApp
document.getElementById('whatsapp').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 11);
});

// Salvar configuração do time
teamSetupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const user = auth.currentUser;
    if (!user) return;

    try {
        const teamData = {
            name: document.getElementById('teamName').value,
            president: document.getElementById('presidentName').value,
            whatsapp: document.getElementById('whatsapp').value,
            homeField: document.getElementById('homeField').value,
            type: document.getElementById('teamType').value,
            colors: {
                primary: document.getElementById('primaryColor').value,
                secondary: document.getElementById('secondaryColor').value
            },
            createdAt: new Date(),
            userId: user.uid
        };

        // Se houver logo, converter para base64
        if (logoInput.files.length > 0) {
            const base64Logo = await getBase64Image(logoInput.files[0]);
            teamData.logo = base64Logo;
        }

        // Salvar dados do time
        await db.collection('teams').add(teamData);

        // Atualizar status do usuário
        await db.collection('users').doc(user.uid).update({
            hasTeam: true,
            teamConfigured: true
        });

        window.location.href = 'dashboard.html';
    } catch (error) {
        console.error('Erro ao configurar time:', error);
        alert('Erro ao salvar configurações do time');
    }
});

// Função auxiliar para converter imagem em base64
function getBase64Image(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Verificar se usuário já tem time configurado
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = '../index.html';
        return;
    }

    const userDoc = await db.collection('users').doc(user.uid).get();
    if (userDoc.exists && userDoc.data().teamConfigured) {
        window.location.href = 'dashboard.html';
    }
}); 