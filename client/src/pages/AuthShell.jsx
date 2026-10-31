export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand big">Brightloop</div>
        <h2>{title}</h2>
        {subtitle && <p className="muted">{subtitle}</p>}
        {children}
        {footer && <p className="auth-foot">{footer}</p>}
      </div>
    </div>
  );
}