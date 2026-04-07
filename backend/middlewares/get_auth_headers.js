async function getAuthHeaders() {
    const response = await fetch('http://192.168.1.30:8002/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'synapse@adm.com',
            password: '12345678'
        })
    });
    if (!response.ok) {
        throw new Error('Falha ao autenticar admin');
    }
    const data = await response.json();
    if (!data.access_token) {
        throw new Error('Token não recebido');
    }
    return {
        'Authorization': `Bearer ${data.access_token}`,
        'X-Request-Source': 'admin',
    };
}

export default getAuthHeaders;