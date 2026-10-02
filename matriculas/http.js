export function responder(res, status, dados) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(dados));
}

export async function lerJson(req) {
  let texto = '';
  for await (const parte of req) {
    texto += parte;
    if (texto.length > 10000) throw new Error('Dados muito grandes.');
  }
  try {
    return JSON.parse(texto);
  } catch {
    throw new Error('Envie um JSON válido.');
  }
}
