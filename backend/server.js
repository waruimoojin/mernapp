const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/Auth');
const noteRoutes = require('./routes/notes');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ MongoDB connecté'))
.catch(err => console.error('❌ Erreur de connexion à MongoDB:', err));
// Routes simples pour tester
app.get('/', (req, res) => {
  res.send('API est en marche 🚀');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Serveur lancé sur le port ${PORT}`));
