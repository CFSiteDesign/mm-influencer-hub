import { supabase } from '@/lib/supabase';

export async function generateCreatorCode(fullName: string): Promise<{ code: string | null; method: string }> {
  const firstName = fullName.trim().split(' ')[0].toUpperCase();
  const lastName = fullName.trim().split(' ').slice(-1)[0]?.toUpperCase() || '';

  // Tier 1: First name only
  const tier1 = firstName;
  const { data: existing1 } = await supabase
    .from('creator_codes')
    .select('id')
    .eq('code', tier1)
    .single();

  if (!existing1) {
    return { code: tier1, method: 'first_name' };
  }

  // Tier 2: First name + last initial
  if (lastName) {
    const tier2 = `${firstName}${lastName[0]}`;
    const { data: existing2 } = await supabase
      .from('creator_codes')
      .select('id')
      .eq('code', tier2)
      .single();

    if (!existing2) {
      return { code: tier2, method: 'first_name_initial' };
    }
  }

  // Tier 3: First name + incrementing number
  for (let i = 1; i <= 99; i++) {
    const tier3 = `${firstName}${i}`;
    const { data: existing3 } = await supabase
      .from('creator_codes')
      .select('id')
      .eq('code', tier3)
      .single();

    if (!existing3) {
      return { code: tier3, method: 'first_name_initial_inc' };
    }
  }

  return { code: null, method: 'exhausted' };
}
