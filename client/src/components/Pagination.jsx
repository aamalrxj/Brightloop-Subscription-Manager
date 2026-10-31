export default function Pagination({ page, pages, total, onPage }) {
  if (!total) return null;
  return (
    <div className="pager">
      <span className="muted">{total.toLocaleString()} results</span>
      <div>
        <button className="btn small" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <span className="muted"> Page {page} of {pages} </span>
        <button className="btn small" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}