import LibraryDashboard from '@/components/library-dashboard';
import { getLibraryData } from '@/lib/actions';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const data = await getLibraryData();
  return <LibraryDashboard data={data} />;
}
