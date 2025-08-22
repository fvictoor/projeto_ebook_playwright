const { test, expect } = require('@playwright/test')
const { SubmitHome } = require('../../resources/SubmitHome.js')
const { LoginPage } = require('../../resources/Login.js')
const { UsuarioService } = require('../../services/UsuarioService.js')

let submitHome, loginPage, usuarioService
test.beforeEach(async ({ page, request }) => {
  submitHome = new SubmitHome(page)
  loginPage = new LoginPage(page)
  usuarioService = new UsuarioService(request)
})

test('Login com usuário comum sucesso', async ({ page, request }) => {
  await submitHome.visit()
  const { nome, email, password } = await submitHome.gerarDadosFaker()
  const { response, userId } = await usuarioService.cadastrarUsuario('https://serverest.dev', nome, email, password, 'false', 201, 'Cadastro realizado com sucesso')
  await loginPage.preencherLogin(email, password)
  await loginPage.submeterLogin()
  await loginPage.verificarLogin(false, nome)
  await usuarioService.deletarUsuario('https://serverest.dev', userId, 'Registro excluído com sucesso')
})

test('Login com usuário administrador sucesso', async ({ page }) => {
  await submitHome.visit()
  const { nome, email, password } = await submitHome.gerarDadosFaker()
  const { response, userId } = await usuarioService.cadastrarUsuario('https://serverest.dev', nome, email, password, 'true', 201, 'Cadastro realizado com sucesso')
  await loginPage.preencherLogin(email, password)
  await loginPage.submeterLogin()
  await loginPage.verificarLogin(true, nome)
  await usuarioService.deletarUsuario('https://serverest.dev', userId, 'Registro excluído com sucesso')
})

test('Não deve logar com senha incorreta', async ({ page }) => {
  await submitHome.visit()
  await loginPage.preencherLogin('teste@teste.com', 'teste.com')
  await loginPage.submeterLogin()
  await submitHome.verificarMensagem('Email e/ou senha inválidos', false)
})

test('Não deve logar com senha em branco', async ({ page }) => {
  await submitHome.visit()
  await loginPage.preencherLogin('teste@teste.com', '')
  await loginPage.submeterLogin()
  await submitHome.verificarMensagem('Password é obrigatório', false)
})

test('Não deve logar com email em branco', async ({ page }) => {
  await submitHome.visit()
  await loginPage.preencherLogin('', '123456')
  await loginPage.submeterLogin()
  await submitHome.verificarMensagem('Email é obrigatório', false)
})

test('Não deve logar com senha e email em branco', async ({ page }) => {
  await submitHome.visit()
  await loginPage.preencherLogin('', '')
  await loginPage.submeterLogin()
  await submitHome.verificarMensagem('Email é obrigatório', false)
  await submitHome.verificarMensagem('Password é obrigatório', false)
})

test('Não deve logar com email inválido', async ({ page }) => {
  await submitHome.visit()
  await loginPage.preencherLogin('teste@teste', '123456')
  await loginPage.submeterLogin()
  await submitHome.verificarMensagem('Email deve ser um email válido', false)
})