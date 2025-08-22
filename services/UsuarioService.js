const { expect } = require('@playwright/test')

export class UsuarioService {
    constructor(request) {
        this.request = request;
    }

    async cadastrarUsuario(url, nome, email, password, administrador, status, mensagem, campo) {
        const response = await this.request.post(`${url}/usuarios`, {
            headers: {'Content-Type': 'application/json',
                      'Accept': 'application/json'},
            data: {
                nome: nome,
                email: email,
                password: password,
                administrador: administrador
            }
        });
        if (status == 201) {
            expect(response.ok()).toBeTruthy()
            const responseBody = await response.json();
            expect(responseBody).toHaveProperty('message', mensagem)
            const userId = responseBody._id
            expect(userId).toBeDefined()
            return { response, userId }
        } else  {
            expect(response.status()).toBe(status)
            const responseBody = await response.json();
            expect(responseBody).toHaveProperty(campo, mensagem)
        }
    }
    
    async deletarUsuario(url, userId, mensagemEsperada) {
        const response = await this.request.delete(`${url}/usuarios/${userId}`, {
            headers: {
                'Accept': 'application/json'
            }
        });
        expect(response.ok()).toBeTruthy();
        const responseBody = await response.json();
        expect(responseBody).toHaveProperty('message', mensagemEsperada);
        return response;
    }

    async loginUsuario(url, email, password) {
        const response = await this.request.post(`${url}/login`, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            data: {
                email: email,
                password: password
            }
        });
        return response
    }
}
