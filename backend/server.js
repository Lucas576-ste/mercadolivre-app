require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./src/config/database');

const authRoutes = require('./src/routes/auth.routes');
const anuncioRoutes = require('./src/routes/anuncio.routes');
const categoriaRoutes = require('./src/routes/categoria.routes');

const app = express();

// Middlewares globais
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());

// Rotas
app.use('/auth', authRoutes);
app.use('/anuncios', anuncioRoutes);
app.use('/categorias', categoriaRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
});
