type Props = { start: string; end: string; earliest: string; latest: string; view?: string };

export function DateRangeForm({ start, end, earliest, latest, view }: Props) {
  return (
    <form action="/">
      {view && <input type="hidden" name="view" value={view} />}
      <label>
        From <input type="date" name="start" defaultValue={start} min={earliest} max={latest} required />
      </label>
      <label>
        To <input type="date" name="end" defaultValue={end} min={earliest} max={latest} required />
      </label>
      <button type="submit">Apply</button>
    </form>
  );
}
