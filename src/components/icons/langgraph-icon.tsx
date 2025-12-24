
const LangGraphIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="12" cy="7" r="3" stroke="currentColor" strokeWidth="2" />
    <circle cx="6" cy="17" r="3" stroke="currentColor" strokeWidth="2" />
    <circle cx="18" cy="17" r="3" stroke="currentColor" strokeWidth="2" />
    <line x1="10.5" y1="9.5" x2="7.5" y2="14.5" stroke="currentColor" strokeWidth="2" />
    <line x1="13.5" y1="9.5" x2="16.5" y2="14.5" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export default LangGraphIcon;
