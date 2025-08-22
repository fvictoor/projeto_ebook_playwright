const { test, expect } = require('@playwright/test')
const { SubmitHome } = require('../../resources/SubmitHome.js')
const { UsuarioService } = require('../../services/UsuarioService.js')

let submitHome, usuarioService
test.beforeEach(async ({ page, request }) => {
  submitHome = new SubmitHome(page)
  usuarioService = new UsuarioService(request)
})

test('Cadastro de usuário comum com sucesso', async ({ page }) => {
  await submitHome.visit()
  await submitHome.clicarCadastrar()
  const { nome, email, password } = await submitHome.gerarDadosFaker()
  await submitHome.preencherFormulario(nome, email, password)
  await submitHome.toggleCheckbox(false)
  await submitHome.submeterFormulario()
  await submitHome.verificarMensagem('Cadastro realizado com sucesso', true)
})

test('Cadastro de usuário administrador com sucesso', async ({ page }) => {
  await submitHome.visit()
  await submitHome.clicarCadastrar()
  const { nome, email, password } = await submitHome.gerarDadosFaker()
  await submitHome.preencherFormulario(nome, email, password)
  await submitHome.toggleCheckbox(true)
  await submitHome.submeterFormulario()
  await submitHome.verificarMensagem('Cadastro realizado com sucesso', true)
})

test('Cadastro de usuário sem nome', async ({ page }) => {
  await submitHome.visit()
  await submitHome.clicarCadastrar()
  const { nome, email, password } = await submitHome.gerarDadosFaker({ nome: false, email: true , password: true })
  await submitHome.preencherFormulario(nome, email, password)
  await submitHome.submeterFormulario()
  await submitHome.verificarMensagem('Nome é obrigatório', false)
})

test('Cadastro de usuário sem nome e sem email', async ({ page }) => {
  await submitHome.visit()
  await submitHome.clicarCadastrar()
  const { nome, email, password } = await submitHome.gerarDadosFaker({ nome: false, email: false, password: true })
  await submitHome.preencherFormulario(nome, email, password)
  await submitHome.submeterFormulario()
  await submitHome.verificarMensagem('Nome é obrigatório', false)
  await submitHome.verificarMensagem('Email é obrigatório', false)
})

test('Cadastro de usuário sem nome, sem email e sem senha', async ({ page }) => {
  await submitHome.visit()
  await submitHome.clicarCadastrar()
  const { nome, email, password } = await submitHome.gerarDadosFaker({ nome: false, email: false, password: false })
  await submitHome.preencherFormulario(nome, email, password)
  await submitHome.submeterFormulario()
  await submitHome.verificarMensagem('Nome é obrigatório', false)
  await submitHome.verificarMensagem('Email é obrigatório', false)
  await submitHome.verificarMensagem('Password é obrigatório', false)
})

test('Cadastro de usuário com o mesmo email já cadastrado', async ({ page }) => {
  await submitHome.visit()
  await submitHome.clicarCadastrar()
  const { nome, email, password } = await submitHome.gerarDadosFaker()
  const { response, userId } = await usuarioService.cadastrarUsuario('https://serverest.dev', nome, email, password, 'false', 201, 'Cadastro realizado com sucesso')
  await submitHome.preencherFormulario(nome, email, password)
  await submitHome.submeterFormulario()
  await submitHome.verificarMensagem('Este email já está sendo usado', false)
  await usuarioService.deletarUsuario('https://serverest.dev', userId, 'Registro excluído com sucesso')
})