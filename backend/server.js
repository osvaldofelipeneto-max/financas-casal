const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/lancamentos', async (req, res) => {
  try {
    const { mes } = req.query;
    let sql = 'SELECT * FROM lancamentos';
    let params = [];
    if (mes) {
      sql += " WHERE strftime('%Y-%m', data) = ?";
      params.push(mes);
    }
    sql += ' ORDER BY data DESC, criado_em DESC';
    const rows = await db.allAsync(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/lancamentos', async (req, res) => {
  try {
    const { tipo, valor, categoria, descricao, data, usuario } = req.body;
    if (!tipo || !valor || !categoria || !data || !usuario)
      return res.status(400).json({ error: 'Campos obrigatórios: tipo, valor, categoria, data, usuario' });
    const result = await db.runAsync(
      `INSERT INTO lancamentos (tipo, valor, categoria, descricao, data, usuario) VALUES (?, ?, ?, ?, ?, ?)`,
      [tipo, valor, categoria, descricao || '', data, usuario]
    );
    const novo = await db.getAsync('SELECT * FROM lancamentos WHERE id = ?', [result.lastID]);
    res.status(201).json(novo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/lancamentos/:id', async (req, res) => {
  try {
    await db.runAsync('DELETE FROM lancamentos WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/contas', async (req, res) => {
  try {
    const rows = await db.allAsync('SELECT * FROM contas WHERE ativo = 1 ORDER BY dia_vencimento');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/contas', async (req, res) => {
  try {
    const { nome, valor, tipo, dia_vencimento, categoria } = req.body;
    if (!nome || !tipo || !dia_vencimento || !categoria)
      return res.status(400).json({ error: 'Campos obrigatórios: nome, tipo, dia_vencimento, categoria' });
    const result = await db.runAsync(
      `INSERT INTO contas (nome, valor, tipo, dia_vencimento, categoria) VALUES (?, ?, ?, ?, ?)`,
      [nome, valor || null, tipo, dia_vencimento, categoria]
    );
    const nova = await db.getAsync('SELECT * FROM contas WHERE id = ?', [result.lastID]);
    res.status(201).json(nova);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/contas/:id', async (req, res) => {
  try {
    const { nome, valor, tipo, dia_vencimento, categoria } = req.body;
    await db.runAsync(
      `UPDATE contas SET nome=?, valor=?, tipo=?, dia_vencimento=?, categoria=? WHERE id=?`,
      [nome, valor || null, tipo, dia_vencimento, categoria, req.params.id]
    );
    const atualizada = await db.getAsync('SELECT * FROM contas WHERE id = ?', [req.params.id]);
    res.json(atualizada);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/contas/:id', async (req, res) => {
  try {
    await db.runAsync('UPDATE contas SET ativo = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/contas-mes', async (req, res) => {
  try {
    const { mes } = req.query;
    if (!mes) return res.status(400).json({ error: 'Parâmetro mes obrigatório' });
    const contas = await db.allAsync('SELECT * FROM contas WHERE ativo = 1');
    for (const conta of contas) {
      await db.runAsync(
        `INSERT OR IGNORE INTO contas_mes (conta_id, mes, valor) VALUES (?, ?, ?)`,
        [conta.id, mes, conta.valor || 0]
      );
    }
    const rows = await db.allAsync(`
      SELECT cm.*, c.nome, c.tipo, c.dia_vencimento, c.categoria
      FROM contas_mes cm
      JOIN contas c ON c.id = cm.conta_id
      WHERE cm.mes = ? AND c.ativo = 1
      ORDER BY c.dia_vencimento
    `, [mes]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/contas-mes/:id/valor', async (req, res) => {
  try {
    await db.runAsync('UPDATE contas_mes SET valor = ? WHERE id = ?', [req.body.valor, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/contas-mes/:id/pagar', async (req, res) => {
  try {
    await db.runAsync(
      `UPDATE contas_mes SET pago = 1, pago_em = datetime('now','localtime'), pago_por = ? WHERE id = ?`,
      [req.body.pago_por || 'Usuário', req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/contas-mes/:id/desmarcar', async (req, res) => {
  try {
    await db.runAsync(
      'UPDATE contas_mes SET pago = 0, pago_em = NULL, pago_por = NULL WHERE id = ?',
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/dashboard', async (req, res) => {
  try {
    const { mes } = req.query;
    if (!mes) return res.status(400).json({ error: 'Parâmetro mes obrigatório' });
    const [entRow, saiRow, contas, porCategoria, ultimosLancamentos] = await Promise.all([
      db.getAsync(`SELECT COALESCE(SUM(valor), 0) as total FROM lancamentos WHERE tipo = 'entrada' AND strftime('%Y-%m', data) = ?`, [mes]),
      db.getAsync(`SELECT COALESCE(SUM(valor), 0) as total FROM lancamentos WHERE tipo = 'saida' AND strftime('%Y-%m', data) = ?`, [mes]),
      db.allAsync(`SELECT cm.*, c.nome, c.tipo, c.dia_vencimento, c.categoria FROM contas_mes cm JOIN contas c ON c.id = cm.conta_id WHERE cm.mes = ? AND c.ativo = 1`, [mes]),
      db.allAsync(`SELECT categoria, SUM(valor) as total FROM lancamentos WHERE tipo = 'saida' AND strftime('%Y-%m', data) = ? GROUP BY categoria ORDER BY total DESC`, [mes]),
      db.allAsync(`SELECT * FROM lancamentos WHERE strftime('%Y-%m', data) = ? ORDER BY data DESC, criado_em DESC LIMIT 5`, [mes]),
    ]);
    const entradas = entRow.total;
    const saidas = saiRow.total;
    const totalContasPagas = contas.filter(c => c.pago).reduce((s, c) => s + c.valor, 0);
    const totalContasPendentes = contas.filter(c => !c.pago).reduce((s, c) => s + c.valor, 0);
    const saldoAtual = entradas - saidas - totalContasPagas;
    const saldoProjetado = saldoAtual - totalContasPendentes;
    const diaHoje = new Date().getDate();
    const contasAlerta = contas.filter(c => !c.pago && (c.dia_vencimento - diaHoje) <= 5);
    const totalAlerta = contasAlerta.reduce((s, c) => s + c.valor, 0);
    res.json({ mes, entradas, saidas, saldoAtual, saldoProjetado, totalContasPagas, totalContasPendentes, contasAlerta, totalAlerta, porCategoria, ultimosLancamentos, contas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ API Finanças do Casal rodando na porta ${PORT}`);
});