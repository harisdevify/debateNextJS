// Subtle page entrance on every navigation (Apple-like, non-janky).
// Kept transform+opacity only for GPU compositing.
export default function Template({ children }) {
  return <div className="page-enter">{children}</div>;
}
