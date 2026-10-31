import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { crud } from '../controllers/crud.js';
import Tax from '../models/Tax.js';
import Product from '../models/Product.js';
import Plan from '../models/Plan.js';
import Discount from '../models/Discount.js';
import QuotationTemplate from '../models/QuotationTemplate.js';

const id = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const date = z.coerce.date();

const templateSchema = z.object({
  name: z.string().min(1), plan: id, validityDays: z.number().int().min(1).optional(),
  lines: z.array(z.object({ product: id, variant: id.optional(), qty: z.number().int().min(1) })).min(1),
});

const taxSchema = z.object({
  name: z.string().min(1), rate: z.number().min(0).max(100), active: z.boolean().optional(),
});

const productSchema = z.object({
  name: z.string().min(1), type: z.string().min(1),
  salesPrice: z.number().min(0), costPrice: z.number().min(0),
  notes: z.string().optional(), tax: id.optional(),
  variants: z.array(z.object({
    attribute: z.string().min(1), value: z.string().min(1), extraPrice: z.number().default(0),
  })).optional(),
});


const planSchema = z.object({
  name: z.string().min(1),
  price: z.number().min(0),
  tax: id.nullable().optional(),
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  minQty: z.number().int().min(1).optional(),
  availableFrom: date,
  availableTo: date,
  autoClose: z.boolean().optional(),
  closable: z.boolean().optional(),
  pausable: z.boolean().optional(),
  renewable: z.boolean().optional(),
});


const discountSchema = z.object({
  name: z.string().min(1), type: z.enum(['fixed', 'percent']), value: z.number().min(0),
  minPurchase: z.number().min(0).optional(), minQty: z.number().min(0).optional(),
  startDate: date, endDate: date, usageLimit: z.number().int().min(1).nullable().optional(),
  appliesTo: z.enum(['product', 'subscription']), products: z.array(id).optional(),
});

const mount = (router, path, ctrl) => {
  router.get(path, requireRole('admin', 'staff'), ctrl.list);
  router.get(`${path}/:id`, requireRole('admin', 'staff'), ctrl.get);
  router.post(path, requireRole('admin'), ctrl.create);
  router.patch(`${path}/:id`, requireRole('admin'), ctrl.update);
  router.delete(`${path}/:id`, requireRole('admin'), ctrl.remove);
};

const router = Router();
router.use(requireAuth);
mount(router, '/taxes', crud(Tax, taxSchema));
mount(router, '/products', crud(Product, productSchema, { populate: 'tax' }));
mount(router, '/plans', crud(Plan, planSchema, { populate: 'tax' }));
mount(router, '/discounts', crud(Discount, discountSchema, { populate: 'products' }));
mount(router, '/templates', crud(QuotationTemplate, templateSchema, { populate: 'plan lines.product' }));

export default router;