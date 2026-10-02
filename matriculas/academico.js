import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { setTimeout as esperar } from 'node:timers/promises';
import { lerJson, responder } from './http.js';

export const cursos = ['Sistemas de Informação', 'Administração', 'Pedagogia'];
export const turnos = ['Manhã', 'Tarde', 'Noite'];
const matriculas = new Map();

export function validar(dados) {
  if (!dados || typeof dados !== 'object') return 'Dados inválidos.';
  if (typeof dados.nome !== 'string' || dados.nome.trim().length < 3 || dados.nome.length > 100)
    return 'Informe um nome de 3 a 100 caracteres.';
  if (typeof dados.email !== 'string' || dados.email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email))
    return 'Informe um e-mail válido.';
  if (!cursos.includes(dados.curso)) return 'Selecione um curso válido.';
  if (!turnos.includes(dados.turno)) return 'Selecione um turno válido.';
  return null;
}

export function iniciarAcademico() {
  const servidor = createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/matriculas') {
      return responder(res, 404, { mensagem: 'Rota não encontrada.' });
    }
    try {
      const dados = await lerJson(req);
      const erro = validar(dados);
      if (erro) return responder(res, 400, { mensagem: erro });

      // A demora representa a conferência feita pelo serviço acadêmico.
      await esperar(2000);
      const chave = `${dados.email.trim().toLowerCase()}|${dados.curso}`;
      if (matriculas.has(chave)) {
        return responder(res, 409, { mensagem: 'Este e-mail já está matriculado neste curso.' });
      }
      const matricula = {
        numero: randomUUID().slice(0, 8).toUpperCase(),
        nome: dados.nome.trim(), email: dados.email.trim().toLowerCase(),
        curso: dados.curso, turno: dados.turno
      };
      matriculas.set(chave, matricula);
      responder(res, 201, { mensagem: 'Matrícula concluída.', matricula });
    } catch (erro) {
      responder(res, 400, { mensagem: erro.message });
    }
  });
  servidor.listen(3001, '127.0.0.1');
  return servidor;
}
