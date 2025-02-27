import express, { Request, Response } from 'express';
import { validateChatRequest } from './validation';
import { chatHandler } from '../../../api/chat';
import { authenticateToken } from '../../../middlewares/authMiddleware';

const router = express.Router();

router.post('/', authenticateToken, validateChatRequest, async (req: Request, res: Response) => {
    const { message, phoneNumber } = req.body;
    const response = await chatHandler(message, phoneNumber);

    if (response.code === 200) {
        return res.status(200).json({
            status: 'success',
            response: response.response
        });
    }
    return res.status(500).json({ 
        status: 'error',
        error: response.response 
    });
});

export default router;