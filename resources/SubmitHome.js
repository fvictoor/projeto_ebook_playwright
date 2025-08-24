const { expect } = require('@playwright/test')
const { faker } = require('@faker-js/faker')

export class SubmitHome {
    constructor(page) {
        this.page = page;
    }

    async visit() {
        await this.page.goto('https://front.serverest.dev/login')
        await expect(this.page).toHaveTitle(/Front - ServeRest/)
        await this.page.waitForLoadState('networkidle')

    }

    async clicarCadastrar() {
        await this.page.locator('a[data-testid="cadastrar"]').click()
    }

    async preencherFormulario(nome, email, password) {
        await this.page.locator('input[name="nome"]').fill(nome)
        await this.page.locator('input[name="email"]').fill(email)
        await this.page.locator('input[name="password"]').fill(password)
    }

    async submeterFormulario() {
        await this.page.getByTestId('cadastrar').click()
    }

    async verificarMensagem(mensagem, sucesso) {
        if (sucesso) {
            const linkLocator = this.page.getByRole('link', { name: mensagem })
            await expect(linkLocator).toBeVisible()
        } else {
            const alertLocator = this.page.getByRole('alert').getByText(mensagem, { exact: true })
            await expect(alertLocator).toHaveText(mensagem);
        }
    }

    async gerarDadosFaker(opcoes = { nome: true, email: true, password: true }) {
        const nome = opcoes.nome ? faker.person.fullName() : ""
        const email = opcoes.email ? faker.internet.email() : ""
        const password = opcoes.password ? faker.internet.password() : ""
        return { nome, email, password }
    }

    async toggleCheckbox(shouldBeChecked = true) {
        const checkbox = this.page.locator('input[data-testid="checkbox"]')
        const isChecked = await checkbox.isChecked()

        if (shouldBeChecked && !isChecked) {
            await checkbox.check()

        } else if (!shouldBeChecked && isChecked) {
            await checkbox.uncheck()
        }
    }
}
