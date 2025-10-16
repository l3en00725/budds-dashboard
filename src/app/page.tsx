import { redirect } from 'next/navigation';

export default async function Home() {
  // Redirect directly to dashboard since Jobber syncs via Pipedream
  redirect('/dashboard');
}
