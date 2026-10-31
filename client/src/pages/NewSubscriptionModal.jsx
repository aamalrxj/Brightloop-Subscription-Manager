
import { useState } from 'react';
import api from '../api';
import { useFetch } from '../hooks/useFetch';
import Modal from '../components/Modal';
import CustomerPicker from '../components/CustomerPicker';
import { isoDay, money } from '../utils/format';

const list = path => () => api.get(path, {
  params: { limit: 50, active: true },
});

export default function NewSubscriptionModal({ onClose, onCreated }) {
  const templates = useFetch(list('/templates'));
  const plans = useFetch(list('/plans'));
  const products = useFetch(list('/products'));

  const [customer, setCustomer] = useState(null);
  const [mode, setMode] = useState('template');
  const [templateId, setTemplateId] = useState('');
  const [planId, setPlanId] = useState('');
  const [lines, setLines] = useState([
    { product: '', variant: '', qty: 1 },
  ]);
  const [startDate, setStartDate] = useState(isoDay(new Date()));
  const [terms, setTerms] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const tpl = templates.data?.items.find(t => t._id === templateId);
  const prods = products.data?.items ?? [];
  const availablePlans = plans.data?.items ?? [];

  const templatePlanId = tpl?.plan?._id || tpl?.plan;
  const templatePlan = availablePlans.find(
    plan => plan._id === templatePlanId
  );

  const manualPlan = availablePlans.find(
    plan => plan._id === planId
  );

  const selectedPlan = mode === 'template'
    ? templatePlan
    : manualPlan;

  const taxRate = selectedPlan?.tax?.active
    ? Number(selectedPlan.tax.rate || 0)
    : 0;


const basePackagePrice = Number(selectedPlan?.price || 0);

const pricingLines = mode === 'template'
  ? (tpl?.lines || [])
  : lines;

const variantSurcharges = pricingLines.reduce((sum, line) => {
  const product = typeof line.product === 'object'
    ? line.product
    : prods.find(item => item._id === line.product);

  if (!product || !line.variant) return sum;

  const variant = product.variants?.find(
    item => item._id === line.variant ||
      String(item._id) === String(line.variant)
  );

  return sum + (
    Number(variant?.extraPrice || 0) * Number(line.qty || 0)
  );
}, 0);

const packagePrice = basePackagePrice + variantSurcharges;

const taxAmount = Math.round(
  (packagePrice * taxRate / 100 + Number.EPSILON) * 100
) / 100;

const packageTotal = packagePrice + taxAmount;


  const setLine = (index, patch) => {
    setLines(current => current.map((line, i) =>
      i === index ? { ...line, ...patch } : line
    ));
  };

  const submit = async e => {
    e.preventDefault();
    setError('');

    if (!customer) {
      setError('Choose a customer');
      return;
    }

    const body = {
      customer: customer._id,
      startDate,
      paymentTermDays: Number(terms) || 0,
    };

    if (mode === 'template') {
      if (!templateId) {
        setError('Choose a quotation template');
        return;
      }

      body.template = templateId;
    } else {
      if (!planId) {
        setError('Choose a plan');
        return;
      }

      if (lines.some(line => !line.product)) {
        setError('Every line needs a product');
        return;
      }

      if (lines.some(line =>
        !Number.isInteger(Number(line.qty)) || Number(line.qty) < 1
      )) {
        setError('Product quantities must be whole numbers of at least 1');
        return;
      }

      body.plan = planId;
      body.lines = lines.map(line => ({
        product: line.product,
        variant: line.variant || undefined,
        qty: Number(line.qty),
      }));
    }

    setBusy(true);

    try {
      onCreated(await api.post('/subscriptions', body));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal title="New subscription" onClose={onClose} wide>
      <form onSubmit={submit}>
        <label>
          Customer
          <CustomerPicker value={customer} onChange={setCustomer} />
        </label>

        <div className="chips" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={`btn small ${mode === 'template' ? 'primary' : ''}`}
            onClick={() => setMode('template')}
          >
            From template
          </button>

          <button
            type="button"
            className={`btn small ${mode === 'manual' ? 'primary' : ''}`}
            onClick={() => setMode('manual')}
          >
            Manual
          </button>
        </div>

        {mode === 'template' ? (
          <>
            <label>
              Quotation template
              <select
                value={templateId}
                onChange={e => setTemplateId(e.target.value)}
              >
                <option value="">Select a template</option>
                {templates.data?.items.map(template => (
                  <option key={template._id} value={template._id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>

            {templates.data && !templates.data.items.length && (
              <p className="hint">
                No templates yet. Use Manual, or create one under Templates.
              </p>
            )}

            {tpl && (
              <div className="card preview">
                <strong>{tpl.plan?.name || templatePlan?.name}</strong>
                <span className="muted">
                  {templatePlan?.period || tpl.plan?.period},
                  {' '}valid {tpl.validityDays} days
                </span>

                <p className="hint">Included products</p>
                <ul>
                  {tpl.lines.map((line, index) => (
                    <li key={index}>
                      {line.qty} × {line.product?.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <>
            <label>
              Plan
              <select
                value={planId}
                onChange={e => setPlanId(e.target.value)}
              >
                <option value="">Select a plan</option>
                {availablePlans.map(plan => (
                  <option key={plan._id} value={plan._id}>
                    {plan.name} ({plan.period})
                  </option>
                ))}
              </select>
            </label>

            <div className="lines">
              <div className="muted" style={{ marginBottom: 6 }}>
                Included products
              </div>

              {lines.map((line, index) => {
                const product = prods.find(
                  item => item._id === line.product
                );

                return (
                  <div className="line-row" key={index}>
                    <select
                      value={line.product}
                      onChange={e => setLine(index, {
                        product: e.target.value,
                        variant: '',
                      })}
                    >
                      <option value="">Product</option>
                      {prods.map(item => (
                        <option key={item._id} value={item._id}>
                          {item.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={line.variant}
                      disabled={!product?.variants.length}
                      onChange={e => setLine(index, {
                        variant: e.target.value,
                      })}
                    >
                      <option value="">
                        {product?.variants.length ? 'No variant' : '-'}
                      </option>

                      {product?.variants.map(variant => (
                        <option key={variant._id} value={variant._id}>
                          {variant.attribute}: {variant.value}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={line.qty}
                      onChange={e => setLine(index, {
                        qty: e.target.value,
                      })}
                    />

                    <button
                      type="button"
                      className="btn ghost small"
                      disabled={lines.length === 1}
                      onClick={() => setLines(current =>
                        current.filter((_, i) => i !== index)
                      )}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                className="btn small"
                onClick={() => setLines(current => [
                  ...current,
                  { product: '', variant: '', qty: 1 },
                ])}
              >
                Add line
              </button>
            </div>
          </>
        )}

        {selectedPlan && (
          <div className="card preview" style={{ marginTop: 14 }}>
            <strong>Subscription package pricing</strong>

            <div className="totals">
              <div>
                <span>Base plan price</span>
                <span>{money(basePackagePrice)}</span>
                </div>

                <div>
                <span>Variant surcharges</span>
                <span>{money(variantSurcharges)}</span>
                </div>

                <div>
                <strong>Package subtotal</strong>
                <strong>{money(packagePrice)}</strong>
                </div>

              <div>
                <span>
                  Tax {taxRate > 0
                    ? `(${selectedPlan.tax.name} - ${taxRate}%)`
                    : ''}
                </span>
                <span>{money(taxAmount)}</span>
              </div>

              <div className="grand">
                <span>Total per {selectedPlan.period}</span>
                <span>{money(packageTotal)}</span>
              </div>
            </div>

            <p className="hint">
            I  Included product base prices are covered by the plan.
            Selected variant surcharges are added to the package price.
            Tax applies to the complete package, and eligible subscription
            discounts are applied when invoices are generated.
            </p>
          </div>
        )}

        <div className="two">
          <label>
            Start date
            <input
              type="date"
              required
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </label>

          <label>
            Payment terms (days to pay)
            <input
              type="number"
              min="0"
              value={terms}
              onChange={e => setTerms(e.target.value)}
            />
          </label>
        </div>

        {error && <div className="error">{error}</div>}

        <button className="btn primary block" disabled={busy}>
          {busy ? 'Creating...' : 'Create subscription'}
        </button>
      </form>
    </Modal>
  );
}
