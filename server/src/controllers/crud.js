const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const notFound = () => Object.assign(new Error('Not found'), { status: 404 });

export const crud = (Model, schema, { populate = '', search = ['name'] } = {}) => ({
  list: wrap(async (req, res) => {
    const page = Math.max(+req.query.page || 1, 1);
    const limit = Math.min(+req.query.limit || 20, 50);
    const filter = {};
    if (req.query.active !== undefined) filter.active = req.query.active === 'true';
    if (req.query.q)
      filter.$or = search.map(f => ({ [f]: new RegExp(escapeRe(req.query.q), 'i') }));
    const [items, total] = await Promise.all([
      Model.find(filter).populate(populate).sort('-createdAt')
        .skip((page - 1) * limit).limit(limit).lean(),
      Model.countDocuments(filter),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  }),

  get: wrap(async (req, res) => {
    const doc = await Model.findById(req.params.id).populate(populate).lean();
    if (!doc) throw notFound();
    res.json(doc);
  }),

  create: wrap(async (req, res) => {
    const data = schema.parse(req.body);
    res.status(201).json(await Model.create(data));
  }),

  update: wrap(async (req, res) => {
    const data = schema.partial().parse(req.body);
    const doc = await Model.findById(req.params.id);
    if (!doc) throw notFound();
    doc.set(data);
    await doc.save();          // runs validators, including date checks
    res.json(doc);
  }),

  // soft delete so old subscriptions and invoices keep their references
  remove: wrap(async (req, res) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    if (!doc) throw notFound();
    res.json({ ok: true });
  }),
});