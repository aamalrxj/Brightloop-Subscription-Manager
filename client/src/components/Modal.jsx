export default function Modal({ title, onClose, children, wide }) {
  return (
    <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={wide ? { maxWidth: 760 } : undefined}>
        <div className="modal-head"><h2>{title}</h2><button className="btn ghost small" onClick={onClose}>Close</button></div>
        {children}
      </div>
    </div>
  );
}