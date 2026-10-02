const formulario = document.querySelector('#formulario');
const enviar = document.querySelector('#enviar');
const explicacao = document.querySelector('#explicacao');

formulario.addEventListener('change', () => {
  explicacao.textContent = formulario.elements.modo.value === 'sincrono'
    ? 'A confirmação chega após o processamento da matrícula.'
    : 'Você recebe um protocolo e pode continuar enquanto a matrícula é processada.';
});

function atualizar(cartao, texto, estado = '') {
  cartao.querySelector('.situacao').textContent = texto;
  cartao.dataset.estado = estado;
}

function finalizar(cartao, resultado, sucesso) {
  const texto = sucesso
    ? `Matrícula ${resultado.matricula.numero} concluída. Turno: ${resultado.matricula.turno}.`
    : resultado.mensagem;
  atualizar(cartao, texto, sucesso ? 'concluida' : 'falhou');
}

async function acompanhar(protocolo, cartao) {
  try {
    const resposta = await fetch(`/api/pedidos/${protocolo}`);
    const pedido = await resposta.json();
    if (!resposta.ok) throw new Error(pedido.mensagem);
    if (['concluida', 'falhou'].includes(pedido.estado)) {
      finalizar(cartao, pedido.resultado, pedido.estado === 'concluida');
      return;
    }
    atualizar(cartao, `Solicitação ${pedido.estado}. Você pode enviar outra matrícula.`);
    setTimeout(() => acompanhar(protocolo, cartao), 700);
  } catch (erro) {
    atualizar(cartao, `${erro.message} Não foi possível consultar o resultado.`, 'falhou');
  }
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const { modo, ...dados } = Object.fromEntries(new FormData(formulario));
  const cartao = document.createElement('article');
  cartao.className = 'pedido';
  const titulo = document.createElement('h3');
  titulo.textContent = `${dados.nome} · ${dados.curso}`;
  const tipo = document.createElement('p');
  tipo.className = 'ajuda';
  tipo.textContent = modo === 'sincrono' ? 'Fluxo síncrono' : 'Fluxo assíncrono';
  const situacao = document.createElement('p');
  situacao.className = 'situacao';
  cartao.append(titulo, tipo, situacao);
  document.querySelector('#pedidos').prepend(cartao);
  document.querySelector('#vazio').hidden = true;
  enviar.disabled = true;
  atualizar(cartao, modo === 'sincrono' ? 'Aguardando a confirmação do serviço acadêmico…' : 'Enviando solicitação…');
  try {
    const resposta = await fetch(`/api/${modo}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados)
    });
    const resultado = await resposta.json();
    if (!resposta.ok) throw new Error(resultado.mensagem);
    if (modo === 'assincrono') {
      const protocolo = document.createElement('p');
      protocolo.className = 'protocolo';
      protocolo.textContent = `Protocolo: ${resultado.protocolo}`;
      cartao.append(protocolo);
      acompanhar(resultado.protocolo, cartao);
    } else {
      finalizar(cartao, resultado, true);
    }
  } catch (erro) {
    atualizar(cartao, erro.message || 'Falha ao enviar a solicitação.', 'falhou');
  } finally {
    enviar.disabled = false;
  }
});
