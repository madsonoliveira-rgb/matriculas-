import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { iniciarAcademico, validar } from './academico.js';
import { lerJson, responder } from './http.js';

const fila = [];
const pedidos = new Map();
let processando = false;

async function solicitarMatricula(dados) {
  const resposta = await fetch('http://127.0.0.1:3001/matriculas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
    signal: AbortSignal.timeout(10000)
  });
  return { status: resposta.status, dados: await resposta.json() };
}

async function processarFila() {
  if (processando) return;
  processando = true;
  while (fila.length) {
    const { protocolo, dados } = fila.shift();
    const pedido = pedidos.get(protocolo);
    pedido.estado = 'processando';
    try {
      const resultado = await solicitarMatricula(dados);
      pedido.estado = resultado.status === 201 ? 'concluida' : 'falhou';
      pedido.resultado = resultado.dados;
    } catch {
      pedido.estado = 'falhou';
      pedido.resultado = { mensagem: 'Não foi possível acessar o serviço acadêmico.' };
    }
  }
  processando = false;
}

const arquivos = {
  '/': ['index.html', 'text/html'],
  '/estilo.css': ['estilo.css', 'text/css'],
  '/app.js': ['app.js', 'text/javascript'],
  '/fluxogramas': ['fluxogramas.html', 'text/html'],
  '/fluxogramas/sincrono.svg': ['fluxogramas/sincrono.svg', 'image/svg+xml'],
  '/fluxogramas/assincrono.svg': ['fluxogramas/assincrono.svg', 'image/svg+xml']
};

const servidor = createServer(async (req, res) => {
  try {
    const caminho = new URL(req.url, 'http://localhost').pathname;
    if (req.method === 'POST' && ['/api/sincrono', '/api/assincrono'].includes(caminho)) {
      let dados;
      try { dados = await lerJson(req); }
      catch (erro) { return responder(res, 400, { mensagem: erro.message }); }
      const erro = validar(dados);
      if (erro) return responder(res, 400, { mensagem: erro });

      if (caminho === '/api/sincrono') {
        // A resposta ao aluno depende da resposta final do outro serviço.
        const resultado = await solicitarMatricula(dados);
        return responder(res, resultado.status, resultado.dados);
      }

      // O pedido é aceito agora; a matrícula será concluída pelo consumidor.
      const protocolo = randomUUID();
      pedidos.set(protocolo, { protocolo, estado: 'na fila' });
      fila.push({ protocolo, dados });
      responder(res, 202, { protocolo, estado: 'na fila' });
      setImmediate(processarFila);
      return;
    }

    if (req.method === 'GET' && caminho.startsWith('/api/pedidos/')) {
      const pedido = pedidos.get(caminho.split('/').pop());
      return responder(res, pedido ? 200 : 404, pedido || { mensagem: 'Protocolo não encontrado.' });
    }
    if (req.method === 'GET' && arquivos[caminho]) {
      const [arquivo, tipo] = arquivos[caminho];
      const conteudo = await readFile(new URL(`./public/${arquivo}`, import.meta.url));
      res.writeHead(200, { 'Content-Type': `${tipo}; charset=utf-8` });
      return res.end(conteudo);
    }
    responder(res, 404, { mensagem: 'Rota não encontrada.' });
  } catch {
    responder(res, 503, { mensagem: 'Serviço indisponível. Tente novamente.' });
  }
});

const academico = iniciarAcademico();
for (const servico of [servidor, academico]) {
  servico.on('error', (erro) => {
    console.error('Não foi possível iniciar. Confira se as portas 3000 e 3001 estão livres.', erro.message);
    process.exit(1);
  });
}
servidor.listen(3000, '127.0.0.1', () => console.log('Abra http://localhost:3000'));
