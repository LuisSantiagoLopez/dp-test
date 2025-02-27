// middlewares/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import * as dotenv from 'dotenv';

dotenv.config(); // Carga las variables de entorno desde .env

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('Token:', token);
    console.log('Bearer token:', process.env.BEARER_TOKEN);

    if (!token) {
        return res.status(404).json({ error: ':( Recurso no encontrado.' });
    }

    if (token === process.env.BEARER_TOKEN) { // Compara con el token del .env
        next(); // Token válido, continúa con la solicitud
    } else {
        return res.status(404).json({ error: ':( Recurso no encontrado o sin comprobar.' });
    }
}