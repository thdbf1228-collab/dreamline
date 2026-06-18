@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: light;
}

html,
body,
#root {
  height: 100%;
}

body {
  margin: 0;
  background: #f6f7f9;
  color: #0f172a;
  font-family: 'Pretendard', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* 숫자는 표 형태로 정렬되게 */
.tnum {
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

*:focus-visible {
  outline: 2px solid #1d4ed8;
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
    animation: none !important;
  }
}
