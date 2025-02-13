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
  
  // Provedor do Google
  const googleProvider = new firebase.auth.GoogleAuthProvider();
  
  // Referências aos elementos do DOM
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const googleBtn = document.getElementById('googleLogin');
  const registerLink = document.getElementById('register');
  
  // Login com Email/Senha
  loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = emailInput.value;
      const password = passwordInput.value;
  
      try {
          const userCredential = await auth.signInWithEmailAndPassword(email, password);
          window.location.href = 'pages/dashboard.html';
      } catch (error) {
          alert('Erro no login: ' + error.message);
      }
  });
  
  // Login com Google
  async function signInWithGoogle() {
      const provider = new firebase.auth.GoogleAuthProvider();
      try {
          // Forçar seleção de conta
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
          
          window.location.href = window.location.pathname.includes('index.html') ? 
              'pages/dashboard.html' : '../pages/dashboard.html';
      } catch (error) {
          console.error('Erro no login com Google:', error);
          if (error.code === 'auth/operation-not-supported-in-this-environment') {
              alert('Por favor, acesse através de um servidor web (http/https)');
          } else {
              alert('Erro ao fazer login com Google: ' + error.message);
          }
      }
  }
  
  // Navegação para página de registro
  registerLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = 'pages/register.html';
  });
  
  // Verificar estado de autenticação
  auth.onAuthStateChanged((user) => {
      if (user && window.location.pathname.includes('index.html')) {
          window.location.href = 'pages/dashboard.html';
      } else if (!user && !window.location.pathname.includes('index.html')) {
          window.location.href = '../index.html';
      }
  });