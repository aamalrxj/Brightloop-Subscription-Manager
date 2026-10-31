import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { wrap } from '../utils/http.js';
import { getSummary } from '../services/reportService.js';

const router = Router();
router.use(requireAuth, requireRole('admin', 'staff'));

const date = z.string().refine(s => !isNaN(Date.parse(s)), 'Invalid date').optional();
const schema = z.object({ from: date, to: date, customer: z.string().regex(/^[a-f\d]{24}$/i).optional() });
const endOfDay = s => (s.length === 10 ? new Date(new Date(s).getTime() + 864e5 - 1) : new Date(s));

router.get('/summary', wrap(async (req, res) => {
  const q = schema.parse(req.query);
  res.json(await getSummary({
    from: q.from && new Date(q.from), to: q.to && endOfDay(q.to), customer: q.customer,
  }));
}));

export default router;