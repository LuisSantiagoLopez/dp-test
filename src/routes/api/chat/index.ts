// routes/chat/index.ts
import chatRouter from './chat';
import express from 'express';
const router = express.Router();

router.use('/', chatRouter);

export default router;