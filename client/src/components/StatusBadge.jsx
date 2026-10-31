export default function StatusBadge({ status }) {
  return <span className={`badge ${status.replace(/ /g, '')}`}>{status}</span>;
}