const API_BASE_URL = 'http://192.168.1.4:8000';

async function get_auth_headers() {
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Request-Source': 'admin',
        },
        body: JSON.stringify({
            email: 'synapse@adm.com',
            password: '12345678',
        }),
    });

    const loginData = await loginResponse.json();

    if (!loginResponse.ok || !loginData?.access_token) {
        throw new Error(`Falha ao autenticar: ${loginData?.detail || loginResponse.status}`);
    }

    return {
        'Content-Type': 'application/json',
        'X-Request-Source': 'admin',
        Authorization: `Bearer ${loginData.access_token}`,
    };
}




async function testCreateUser() {
    const headers = await get_auth_headers();

    if(headers) {
        console.log("Autenticação bem-sucedida. Headers de autenticação obtidos.");
    } else {
        console.error("Falha na autenticação. Não foi possível obter os headers de autenticação.");
        return;
    }



    const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            nome: 'usuario teste',
            email: 'email@testeeeeeeeeeeeeeeeee.com',
            senha: 'senha123',
            ativo: true,
            role: 'user',
        }),
    });

    const data = await response.json();
    console.log('Create User Response:', data);
}

async function testDeleteUser() {
    
}







function rodarTestes() {
    console.log("=============================================== INICIANDO TESTES ===============================================");
    testCreateUser();
    }

rodarTestes();