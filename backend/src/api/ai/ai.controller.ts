import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { aiService } from './ai.service';

export const generate = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await aiService.generate(req.body);
  res.json({ success: true, data });
});
