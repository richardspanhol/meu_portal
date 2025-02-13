// Função para converter imagem em base64
function getBase64Image(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Atualizar o formulário de adicionar jogador
document.getElementById('addPlayerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const playerData = {
        name: document.getElementById('playerName').value,
        number: document.getElementById('playerNumber').value,
        position: document.getElementById('playerPosition').value,
        createdAt: new Date()
    };

    // Se houver uma imagem selecionada
    const photoInput = document.getElementById('playerPhoto');
    if (photoInput.files.length > 0) {
        try {
            const base64Image = await getBase64Image(photoInput.files[0]);
            playerData.photo = base64Image;
        } catch (error) {
            console.error('Erro ao processar imagem:', error);
        }
    }

    try {
        await db.collection('players').add(playerData);
        closeAddPlayerModal();
        loadPlayers();
    } catch (error) {
        console.error('Erro ao adicionar jogador:', error);
        alert('Erro ao adicionar jogador');
    }
});

function createPlayerCard(player, playerId) {
    const div = document.createElement('div');
    div.className = 'player-card';
    div.innerHTML = `
        <div class="player-photo">
            ${player.photo ? 
                `<img src="${player.photo}" alt="${player.name}">` : 
                `<div class="no-photo">
                    <i class="fas fa-user"></i>
                </div>`
            }
        </div>
        <h3>${player.name}</h3>
        <p>Número: ${player.number}</p>
        <p>Posição: ${player.position}</p>
        <button onclick="editPlayer('${playerId}')">Editar</button>
    `;
    return div;
}