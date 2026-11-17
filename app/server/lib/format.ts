// Display formatting for the dashboard. null is shown as a dash.

export const usd = (v: number | null) =>
  v === null ? '—' : `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const int = (v: number | null) => (v === null ? '—' : v.toLocaleString('en-US'));

export const pct = (v: number | null) => (v === null ? '—' : `${v.toFixed(2)}%`);

/** CSS class for profit/loss colouring. */
export const tone = (v: number | null) => (v === null || v === 0 ? '' : v > 0 ? 'up' : 'down');