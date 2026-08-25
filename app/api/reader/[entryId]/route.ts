import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { entryId } = await params;
  const file = await prisma.bookFile.findUnique({ where: { libraryEntryId: entryId } });
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const contentType =
    file.format === 'pdf' ? 'application/pdf' : 'application/epub+zip';

  return new Response(new Uint8Array(file.data), {
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(file.sizeBytes ?? file.data.length),
      'Content-Disposition': `inline; filename="${encodeURIComponent(file.fileName ?? `book.${file.format}`)}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
