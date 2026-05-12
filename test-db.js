const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const [
    { count: apiCalls },
    { count: uniqueWallets },
    { data: runs },
    { count: waitlistCount }
  ] = await Promise.all([
    supabase.from('mpp_sessions').select('*', { count: 'exact', head: true }),
    supabase.from('employees').select('*', { count: 'exact', head: true }).not('wallet_address', 'is', null),
    supabase.from('payroll_runs').select('total_amount').eq('status', 'finalized'),
    supabase.from('waitlist_subscribers').select('*', { count: 'exact', head: true })
  ]);

  const volumeSettled = runs?.reduce((acc, run) => acc + (run.total_amount || 0), 0) || 0;
  
  const githubRes = await fetch('https://api.github.com/repos/winsznx/remlo').catch(() => null);
  let githubStars = 0;
  if (githubRes?.ok) {
    const ghData = await githubRes.json();
    githubStars = ghData.stargazers_count || 0;
  }
  
  console.log('apiCalls:', apiCalls);
  console.log('uniqueWallets:', uniqueWallets);
  console.log('runs count:', runs?.length);
  console.log('volumeSettled:', volumeSettled);
  console.log('waitlistCount:', waitlistCount);
  console.log('githubStars:', githubStars);
}

test();
