import { Request, Response, NextFunction } from 'express';

export function validateChatRequest(req: Request, res: Response, next: NextFunction) {
    const { message, phoneNumber } = req.body;
    if (!message || !phoneNumber) {
        return res.status(422).json({ error: 'El mensaje y el número de teléfono son obligatorios' });
    }
    next();
}