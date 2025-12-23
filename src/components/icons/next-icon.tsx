
const NextIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 180 180"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M162.13 158.423C169.593 148.435 174 136.1 174 122.75C174 88.5 146.25 60.75 112 60.75C100.933 60.75 90.6277 63.655 81.769 68.7512L153.25 153.251C156.401 155.08 159.387 156.772 162.13 158.423ZM15.8698 21.5768C8.40698 31.5653 4 43.8997 4 57.25C4 91.5 31.75 119.25 66 119.25C77.0672 119.25 87.3723 116.345 96.231 111.249L24.75 26.7488C21.5986 24.9202 18.6133 23.2282 15.8698 21.5768Z"
      fill="currentColor"
    />
    <path
      d="M112 119.25L30 21.5L25 25.5L107 123.25L112 119.25Z"
      fill="url(#next_paint0_linear)"
    />
    <defs>
      <linearGradient
        id="next_paint0_linear"
        x1="109"
        y1="116"
        x2="144"
        y2="160.5"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="white" />
        <stop offset="1" stopColor="white" stopOpacity="0" />
      </linearGradient>
    </defs>
  </svg>
);

export default NextIcon;
