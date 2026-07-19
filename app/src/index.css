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

/* 모바일에서 어떤 요소든 화면 밖으로 못 밀어내게 (가로 스크롤 차단) */
html,
body {
  max-width: 100%;
  overflow-x: hidden;
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

/* 카드 관리자 메모 — 영업사원 주목용 반짝임 */
@keyframes memoFlash {
  0%, 100% { background: #FEF9C3; color: #854D0E; box-shadow: 0 0 0 0 rgba(234, 179, 8, 0); transform: scale(1); }
  50% { background: #FDE047; color: #713F12; box-shadow: 0 0 0 4px rgba(234, 179, 8, 0.55); transform: scale(1.015); }
}
.memo-flash { animation: memoFlash 1.15s ease-in-out infinite; }

/* 드릴다운 모달 — 가로 스크롤바 항상 보이게 */
.drill-scroll { scrollbar-width: auto; scrollbar-gutter: stable; }
.drill-scroll::-webkit-scrollbar { width: 12px; height: 14px; }
.drill-scroll::-webkit-scrollbar-track { background: #EEF1F6; border-radius: 8px; }
.drill-scroll::-webkit-scrollbar-thumb { background: #9AA6B8; border-radius: 8px; border: 3px solid #EEF1F6; }
.drill-scroll::-webkit-scrollbar-thumb:hover { background: #6B7A90; }
