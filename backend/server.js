require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./src/config/database');

const authRoutes     = require('./src/routes/auth.routes');
const anuncioRoutes  = require('./src/routes/anuncio.routes');
const categoriaRoutes = require('./src/routes/categoria.routes');
const uploadRoutes   = require('./src/routes/upload.routes');
const errorHandler   = require('./src/middleware/errorHandler');

const app = express();

// Middlewares globais
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());

// Rotas
app.use('/auth', authRoutes);
app.use('/anuncios', anuncioRoutes);
app.use('/categorias', categoriaRoutes);
app.use('/upload', uploadRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Tratamento global de erros — deve ser o último middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

connectDB().then(async () => {
  // Migration: garante que todos os documentos existentes têm o campo versao.
  // Necessário para anúncios criados antes do optimistic locking ser adicionado.
  const Anuncio = require('./src/domain/entity/Anuncio');
  const migrados = await Anuncio.updateMany(
    { versao: { $exists: false } },
    { $set: { versao: 0 } }
  );
  if (migrados.modifiedCount > 0) {
    console.log(`[migration] Campo versao adicionado em ${migrados.modifiedCount} anúncio(s).`);
  }

  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
});
