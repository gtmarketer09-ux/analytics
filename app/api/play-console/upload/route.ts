import { NextResponse } from 'next/server';
import { importPlayConsoleFile } from '../../../server/repositories/playConsole.repository';
import { syncDailyAnalytics } from '../../../server/repositories/dailyAnalytics.repository';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Choose a Google Play CSV or ZIP file.' }, { status: 400 });
    }

    const extension = file.name.toLowerCase();
    if (!extension.endsWith('.csv') && !extension.endsWith('.zip')) {
      return NextResponse.json({ success: false, error: 'Only .csv and .zip files are supported.' }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const savedDates = await importPlayConsoleFile(bytes, file.name);
    await syncDailyAnalytics(savedDates);
    return NextResponse.json({
      success: true,
      savedCount: savedDates.length,
      savedDates,
      message: `Saved ${savedDates.length} Play Console daily reports from the uploaded file.`,
    });
  } catch (error: unknown) {
    console.error('Play Console upload error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
