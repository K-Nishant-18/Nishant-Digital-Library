import LibraryDashboard from '@/components/library-dashboard';
import { getLibraryData } from '@/lib/actions';
import { assertAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await assertAuth();
  const data = await getLibraryData();
  return <LibraryDashboard data={data} />;
}
