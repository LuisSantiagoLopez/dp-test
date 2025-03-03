// Importaciones necesarias para el servidor
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import https from 'https';
import * as dotenv from 'dotenv';

import chatRoutes from './routes/api/chat';

async function startServer() {
  const app = express();

  app.use(cors());

  app.use(express.json());

  app.use('/api/chat', chatRoutes);

  const isProduction = process.env.NODE_ENV === 'production';
  const port = process.env.PORT || (isProduction ? 443 : 3000);

  if (isProduction) {
    try {
      const privateKey = fs.readFileSync('/app/key.pem', 'utf8');
      const certificate = fs.readFileSync('/app/cert.pem', 'utf8');
      const credentials = { key: privateKey, cert: certificate };

      const httpsServer = https.createServer(credentials, app);

      httpsServer.listen(port, () => {
        console.log(`Servidor HTTPS ejecutándose`);
      });
    } catch (error) {
      console.error('Error al cargar certificados:', error);
      process.exit(1);
    }
  } else {
    app.listen(port, () => {
      console.log(`Servidor HTTP ejecutándose`);
    });
  }
}

// Ejecutar el servidor y manejar errores de inicio
startServer().catch((error) => {
  console.error('Error al iniciar el servidor:', error);
  process.exit(1);
});