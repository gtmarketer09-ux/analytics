'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function PlayConsoleUpload() {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function upload(formData: FormData) {
    setBusy(true);
    setStatus('Uploading and saving...');
    try {
      const response = await fetch('/api/play-console/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Upload failed.');
      setStatus(result.message);
      router.refresh();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={upload} className="play-upload">
      <input type="file" name="file" accept=".csv,.zip,text/csv,application/zip" required />
      <button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Upload Play report'}</button>
      {status && <span className="muted" role="status">{status}</span>}
    </form>
  );
}
