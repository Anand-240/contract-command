/** One place for chart colours so every chart reads as the same system. */
export const CHART = {
  grid: '#e4e7ec',
  axis: '#79828f',
  brand: '#2a4a73',
  brandMuted: '#7794b8',
  positive: '#2f6e4f',
  caution: '#b48334',
  critical: '#9a3b34',
  neutral: '#c3cad4',
  tooltip: {
    border: '1px solid #e4e7ec',
    borderRadius: '6px',
    fontSize: '12.5px',
    boxShadow: '0 4px 6px rgba(27,36,48,.06), 0 20px 48px rgba(27,36,48,.14)',
    padding: '8px 10px',
  },
  axisTick: { fontSize: 11.5, fill: '#79828f' },
} as const;
