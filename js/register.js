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

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Referências aos elementos do DOM
const registerForm = document.getElementById('registerForm');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');

// Registro de usuário
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = nameInput.value;
    const email = emailInput.value;
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Validar senha
    if (password !== confirmPassword) {
        alert('As senhas não coincidem');
        return;
    }

    try {
        // Criar usuário
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Adicionar informações adicionais ao Firestore
        await db.collection('users').doc(user.uid).set({
            name: name,
            email: email,
            createdAt: new Date(),
            role: 'user'
        });

        // Atualizar o perfil do usuário
        await user.updateProfile({
            displayName: name
        });

        alert('Conta criada com sucesso!');
        window.location.href = '../pages/dashboard.html';
    } catch (error) {
        console.error('Erro no registro:', error);
        alert('Erro ao criar conta: ' + error.message);
    }
});

// Adicionar a função signInWithGoogle
async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        provider.setCustomParameters({
            prompt: 'select_account'
        });
        
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        
        // Verificar se é primeiro login
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            // Criar documento do usuário
            await db.collection('users').doc(user.uid).set({
                name: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                createdAt: new Date(),
                role: 'user'
            });
        }
        
        window.location.href = '../pages/dashboard.html';
    } catch (error) {
        console.error('Erro no registro com Google:', error);
        if (error.code === 'auth/operation-not-supported-in-this-environment') {
            alert('Por favor, acesse através de um servidor web (http/https)');
        } else {
            alert('Erro ao cadastrar com Google: ' + error.message);
        }
    }
} 