
const TSIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect width="100" height="100" fill="currentColor" />
    <path
      d="M20 30h40v12h-14v28h-12V42H20V30zM58 54h12c1 0 2 0 2 2 0 1 0 2-2 2H58c-2 0-2-1-2-2 0-2 1-2 2-2zM58 42h20c2 0 2 1 2 2 0 2-1 2-2 2H58c-2 0-2-1-2-2 0-1 1-2 2-2zM58 30h22c2 0 2 1 2 2 0 2-1 2-2 2H58c-2 0-2-1-2-2 0-1 1-2 2-2z"
      fill="white"
    />
  </svg>
);

export default TSIcon;
