const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'financas.db');
const db = new Database(DB_PATH);

// Habilita WAL mode para performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Cria tabelas
db.exec(`
  CREATE TABLE IF NOT EXISTS lancamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'saida')),
    valor REAL NOT NULL,
    categoria TEXT NOT NULL,
    descricao TEXT,
    data TEXT NOT NULL,
    usuario TEXT NOT NULL,
    criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS contas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    valor REAL,
    tipo TEXT NOT NULL CHECK(tipo IN ('fixo', 'variavel')),
    dia_vencimento INTEGER NOT NULL,
    categoria TEXT NOT NULL,
    ativo INTEGER NOT NULL DEFAULT 1,
    criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS contas_mes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conta_id INTEGER NOT NULL,
    mes TEXT NOT NULL,
    valor REAL NOT NULL,
    pago INTEGER NOT NULL DEFAULT 0,
    pago_em TEXT,
    pago_por TEXT,
    FOREIGN KEY (conta_id) REFERENCES contas(id),
    UNIQUE(conta_id, mes)
  );
`);

module.exports = db;
