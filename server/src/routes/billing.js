import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { wrap } from '../utils/http.js';
import { runBilling } from '../services/billingService.js';

const router = Router();
router.use(requireAuth, requireRole('admin', 'staff'));

const schema = z.object({
  date: z.coerce.date().optional(),                          // simulate a billing day (great for the demo)
  autoConfirm: z.boolean().optional(),
  subscription: z.string().regex(/^[a-f\d]{24}$/i).optional(), // bill just one subscription
});

router.post('/run', wrap(async (req, res) => {
  const { date, autoConfirm, subscription } = schema.parse(req.body);
  res.json(await runBilling({ asOf: date, autoConfirm, subscription }));
}));

export default router;