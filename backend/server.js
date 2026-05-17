const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─────────────────────────────────────────────
// LANÇAMENTOS
// ─────────────────────────────────────────────

// Listar lançamentos (com filtro de mês opcional)
app.get('/lancamentos', (req, res) => {
  try {
    const { mes } = req.query; // formato: YYYY-MM
    let query = 'SELECT * FROM lancamentos';
    let params = [];

    if (mes) {
      query += " WHERE strftime('%Y-%m', data) = ?";
      params.push(mes);
    }

    query += ' ORDER BY data DESC, criado_em DESC';
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Criar lançamento
app.post('/lancamentos', (req, res) => {
  try {
    const { tipo, valor, categoria, descricao, data, usuario } = req.body;

    if (!tipo || !valor || !categoria || !data || !usuario) {
      return res.status(400).json({ error: 'Campos obrigatórios: tipo, valor, categoria, data, usuario' });
    }

    const stmt = db.prepare(`
      INSERT INTO lancamentos (tipo, valor, categoria, descricao, data, usuario)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(tipo, valor, categoria, descricao || '', data, usuario);
    const novo = db.prepare('SELECT * FROM lancamentos WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(novo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deletar lançamento
app.delete('/lancamentos/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM lancamentos WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// CONTAS A PAGAR
// ─────────────────────────────────────────────

// Listar contas ativas
app.get('/contas', (req, res) => {
  try {
    const contas = db.prepare('SELECT * FROM contas WHERE ativo = 1 ORDER BY dia_vencimento').all();
    res.json(contas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Criar conta recorrente
app.post('/contas', (req, res) => {
  try {
    const { nome, valor, tipo, dia_vencimento, categoria } = req.body;

    if (!nome || !tipo || !dia_vencimento || !categoria) {
      return res.status(400).json({ error: 'Campos obrigatórios: nome, tipo, dia_vencimento, categoria' });
    }

    const stmt = db.prepare(`
      INSERT INTO contas (nome, valor, tipo, dia_vencimento, categoria)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(nome, valor || null, tipo, dia_vencimento, categoria);
    const nova = db.prepare('SELECT * FROM contas WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(nova);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar conta
app.put('/contas/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { nome, valor, tipo, dia_vencimento, categoria } = req.body;

    db.prepare(`
      UPDATE contas SET nome=?, valor=?, tipo=?, dia_vencimento=?, categoria=?
      WHERE id=?
    `).run(nome, valor || null, tipo, dia_vencimento, categoria, id);

    const atualizada = db.prepare('SELECT * FROM contas WHERE id = ?').get(id);
    res.json(atualizada);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deletar conta
app.delete('/contas/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE contas SET ativo = 0 WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// CONTAS DO MÊS (ocorrências mensais)
// ─────────────────────────────────────────────

// Listar contas de um mês específico (gera automaticamente se não existirem)
app.get('/contas-mes', (req, res) => {
  try {
    const { mes } = req.query; // formato: YYYY-MM
    if (!mes) return res.status(400).json({ error: 'Parâmetro mes obrigatório' });

    const contas = db.prepare('SELECT * FROM contas WHERE ativo = 1').all();

    // Garante que todas as contas ativas têm registro neste mês
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO contas_mes (conta_id, mes, valor)
      VALUES (?, ?, ?)
    `);

    for (const conta of contas) {
      insertStmt.run(conta.id, mes, conta.valor || 0);
    }

    // Retorna com join
    const rows = db.prepare(`
      SELECT cm.*, c.nome, c.tipo, c.dia_vencimento, c.categoria
      FROM contas_mes cm
      JOIN contas c ON c.id = cm.conta_id
      WHERE cm.mes = ? AND c.ativo = 1
      ORDER BY c.dia_vencimento
    `).all(mes);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar valor variável de uma conta no mês
app.patch('/contas-mes/:id/valor', (req, res) => {
  try {
    const { id } = req.params;
    const { valor } = req.body;

    db.prepare('UPDATE contas_mes SET valor = ? WHERE id = ?').run(valor, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Marcar conta como paga
app.patch('/contas-mes/:id/pagar', (req, res) => {
  try {
    const { id } = req.params;
    const { pago_por } = req.body;

    db.prepare(`
      UPDATE contas_mes SET pago = 1, pago_em = datetime('now','localtime'), pago_por = ?
      WHERE id = ?
    `).run(pago_por || 'Usuário', id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Desmarcar pagamento
app.patch('/contas-mes/:id/desmarcar', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE contas_mes SET pago = 0, pago_em = NULL, pago_por = NULL WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// DASHBOARD — dados agregados
// ─────────────────────────────────────────────
app.get('/dashboard', (req, res) => {
  try {
    const { mes } = req.query;
    if (!mes) return res.status(400).json({ error: 'Parâmetro mes obrigatório' });

    // Entradas e saídas do mês
    const entradas = db.prepare(`
      SELECT COALESCE(SUM(valor), 0) as total
      FROM lancamentos
      WHERE tipo = 'entrada' AND strftime('%Y-%m', data) = ?
    `).get(mes).total;

    const saidas = db.prepare(`
      SELECT COALESCE(SUM(valor), 0) as total
      FROM lancamentos
      WHERE tipo = 'saida' AND strftime('%Y-%m', data) = ?
    `).get(mes).total;

    // Contas do mês
    const contas = db.prepare(`
      SELECT cm.*, c.nome, c.tipo, c.dia_vencimento, c.categoria
      FROM contas_mes cm
      JOIN contas c ON c.id = cm.conta_id
      WHERE cm.mes = ? AND c.ativo = 1
    `).all(mes);

    const totalContasPagas = contas.filter(c => c.pago).reduce((s, c) => s + c.valor, 0);
    const totalContasPendentes = contas.filter(c => !c.pago).reduce((s, c) => s + c.valor, 0);

    // Saldo atual: entradas - saídas - contas pagas
    const saldoAtual = entradas - saidas - totalContasPagas;

    // Saldo projetado: saldoAtual - contas pendentes
    const saldoProjetado = saldoAtual - totalContasPendentes;

    // Alertas: contas vencendo nos próximos 5 dias ou atrasadas
    const hoje = new Date();
    const diaHoje = hoje.getDate();
    const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();

    const contasAlerta = contas.filter(c => {
      if (c.pago) return false;
      const diff = c.dia_vencimento - diaHoje;
      return diff <= 5; // vence em até 5 dias ou já atrasou
    });

    const totalAlerta = contasAlerta.reduce((s, c) => s + c.valor, 0);

    // Gastos por categoria (saídas)
    const porCategoria = db.prepare(`
      SELECT categoria, SUM(valor) as total
      FROM lancamentos
      WHERE tipo = 'saida' AND strftime('%Y-%m', data) = ?
      GROUP BY categoria
      ORDER BY total DESC
    `).all(mes);

    // Últimos 5 lançamentos
    const ultimosLancamentos = db.prepare(`
      SELECT * FROM lancamentos
      WHERE strftime('%Y-%m', data) = ?
      ORDER BY data DESC, criado_em DESC
      LIMIT 5
    `).all(mes);

    res.json({
      mes,
      entradas,
      saidas,
      saldoAtual,
      saldoProjetado,
      totalContasPagas,
      totalContasPendentes,
      contasAlerta,
      totalAlerta,
      porCategoria,
      ultimosLancamentos,
      contas,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ API Finanças do Casal rodando na porta ${PORT}`);
});
