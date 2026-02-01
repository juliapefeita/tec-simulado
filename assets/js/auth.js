const authForm = document.getElementById('auth-form');
const toggleBtn = document.getElementById('toggle-auth');
const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');
const message = document.getElementById('message');

let isLogin = true;

// Check if running via file:// protocol
if (window.location.protocol === 'file:') {
    alert("ERRO: Você abriu o arquivo direto da pasta!\n\nVocê PRECISA acessar pelo XAMPP via: http://localhost/aplicativo/index.html");
    message.style.color = 'red';
    message.textContent = 'ERRO: Acesse via http://localhost, não abra o arquivo direto!';
    submitBtn.disabled = true;
}

toggleBtn.addEventListener('click', () => {
    isLogin = !isLogin;
    if (isLogin) {
        formTitle.textContent = 'Entrar';
        submitBtn.textContent = 'Entrar';
        toggleBtn.textContent = 'Criar conta';
    } else {
        formTitle.textContent = 'Cadastrar';
        submitBtn.textContent = 'Cadastrar';
        toggleBtn.textContent = 'Voltar para Login';
    }
    message.textContent = '';
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const endpoint = isLogin ? 'api/login.php' : 'api/register.php';

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            if (isLogin) {
                window.location.href = 'dashboard.html';
            } else {
                message.style.color = 'green';
                message.textContent = 'Cadastro realizado! Faça login agora.';
                // Auto switch to login
                toggleBtn.click();
            }
        } else {
            message.style.color = 'red';
            message.textContent = data.message;
        }
    } catch (error) {
        message.textContent = 'Erro ao conectar com o servidor.';
    }
});
