const { expect } = require('@playwright/test')

export class LoginPage {
    constructor(page) {
        this.page = page
    }
    async preencherLogin(email, password) {
        await this.page.getByRole('heading', { name: 'Login' }).click()
        await this.page.getByTestId('email').fill(email)
        await this.page.getByTestId('senha').fill(password)
        await this.page.getByRole('button', { name: 'Entrar' }).click()
    }

    async submeterLogin() {
        await this.page.getByTestId('entrar').click()
    }

    async verificarLogin(admin=false, nome) {
        if (admin) {
            await expect(this.page.getByText(`Bem Vindo ${nome}`)).toBeVisible()
        } else {
            await expect(this.page.getByText('Serverest Store')).toBeVisible()
        }
    }
}