require('dotenv').config();
const express = require('express');
const { createClient } = require('@libsql/client');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Conexão com o banco do Turso na nuvem
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

// Inicialização da tabela no banco
async function initDb() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS orcamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente TEXT NOT NULL,
        categoria TEXT NOT NULL,
        descricao TEXT NOT NULL,
        quantidade INTEGER NOT NULL,
        largura REAL,
        altura REAL,
        custo_materiais REAL NOT NULL,
        preco_cobrado REAL NOT NULL,
        data DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Banco de dados no Turso sincronizado e pronto!');
  } catch (err) {
    console.error('❌ Erro ao conectar/inicializar o Turso:', err.message);
  }
}

initDb();

// Rota: Salvar orçamento
app.post('/api/orcamentos', async (req, res) => {
  const { cliente, categoria, descricao, quantidade, largura, altura, custo_materiais, preco_cobrado } = req.body;
  try {
    const result = await db.execute({
      sql: `INSERT INTO orcamentos (cliente, categoria, descricao, quantidade, largura, altura, custo_materiais, preco_cobrado) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [cliente, categoria, descricao, quantidade, largura || null, altura || null, custo_materiais, preco_cobrado]
    });
    res.json({ success: true, id: Number(result.lastInsertRowid) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota: Buscar orçamentos similares
app.get('/api/orcamentos/similares', async (req, res) => {
  const { categoria, descricao } = req.query;
  try {
    const result = await db.execute({
      sql: `SELECT * FROM orcamentos 
            WHERE categoria = ? AND descricao LIKE ? 
            ORDER BY id DESC LIMIT 5`,
      args: [categoria, `%${descricao}%`]
    });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});