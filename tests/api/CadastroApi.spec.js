const { test } = require('@playwright/test')
const { UsuarioService } = require('../../services/UsuarioService.js')
const { SubmitHome } = require('../../resources/SubmitHome.js')

let submitHome, usuarioService

test.beforeEach(async ({ page, request }) => {
  submitHome = new SubmitHome(page)
  usuarioService = new UsuarioService(request)
})

test('Cadastro de usuário administrador com sucesso', async ({ request }) => {
    const { nome, email, password } = await submitHome.gerarDadosFaker()
    const { userId } = await usuarioService.cadastrarUsuario('https://serverest.dev', nome, email, password, 'true', 201, 'Cadastro realizado com sucesso')
    await usuarioService.deletarUsuario('https://serverest.dev', userId, 'Registro excluído com sucesso')
})

test('Cadastro de usuário comum com sucesso', async ({ request }) => {
    const { nome, email, password } = await submitHome.gerarDadosFaker()
    const { userId } = await usuarioService.cadastrarUsuario('https://serverest.dev', nome, email, password, 'false', 201, 'Cadastro realizado com sucesso')
    await usuarioService.deletarUsuario('https://serverest.dev', userId, 'Registro excluído com sucesso')
})

test('Cadastro de usuário comum sem o nome', async ({ request }) => {
    const { email, password } = await submitHome.gerarDadosFaker()
    await usuarioService.cadastrarUsuario('https://serverest.dev', '', email, password, 'false', 400 , 'nome não pode ficar em branco', 'nome')
})

test('Cadastro de usuário com email já utilizado', async ({ request }) => {
    const { nome, email, password } = await submitHome.gerarDadosFaker()
    const { userId } = await usuarioService.cadastrarUsuario('https://serverest.dev', nome, email, password, 'false', 201, 'Cadastro realizado com sucesso')
    await usuarioService.cadastrarUsuario('https://serverest.dev', nome, email, password, 'false', 400, 'Este email já está sendo usado', 'message')
    await usuarioService.deletarUsuario('https://serverest.dev', userId, 'Registro excluído com sucesso')
})

test('Cadastro de usuário sem senha', async ({ request }) => {
    const { nome, email } = await submitHome.gerarDadosFaker()
    await usuarioService.cadastrarUsuario('https://serverest.dev', nome, email, '', 'false', 400, 'password não pode ficar em branco', 'password')
})

test('Cadastro de usuário sem email', async ({ request }) => {
    const { nome, password } = await submitHome.gerarDadosFaker()
    await usuarioService.cadastrarUsuario('https://serverest.dev', nome, '', password, 'false', 400, 'email não pode ficar em branco', 'email')
})