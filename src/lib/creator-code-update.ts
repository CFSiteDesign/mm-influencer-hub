import { supabase } from '@/lib/supabase';
import { codeExists } from '@/lib/code-gen';

export type CreatorCodeRow = {
  id: string;
  code: string;
  applicant_id?: string | null;
  creator_id?: string | null;
  creator_name?: string | null;
  creator_email?: string | null;
  allin_eligible?: boolean | null;
};

export function normalizeCode(input: string) {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export async function updateCreatorCode(
  row: CreatorCodeRow,
  rawCode: string,
  opts: { sendEmails?: boolean } = {}
): Promise<{ code: string; warnings: string[] }> {
  const code = normalizeCode(rawCode);
  const warnings: string[] = [];

  if (code.length < 3) throw new Error('Code must be at least 3 characters (letters and numbers only)');
  if (code === row.code.toUpperCase()) throw new Error('That is already the current code');
  if (await codeExists(code)) throw new Error(`${code} is already used by another creator`);

  const oldCode = row.code;

  const { error: dbErr } = await supabase
    .from('creator_codes')
    .update({ code, method: 'manual' })
    .eq('id', row.id);
  if (dbErr) throw new Error(dbErr.message);

  // Verify the row actually changed (RLS can silently no-op)
  const { data: check } = await supabase.from('creator_codes').select('code').eq('id', row.id).single();
  if (check?.code !== code) throw new Error('Code was not saved — permission denied');

  if (row.applicant_id) {
    const { error } = await supabase
      .from('applicants')
      .update({ creator_code: code })
      .eq('id', row.applicant_id);
    if (error) warnings.push('Applicant record not updated');
  }

  // Revenue dashboard sync
  try {
    const { data, error } = await supabase.functions.invoke('sync-creator-code-change', {
      body: { old_code: oldCode, new_code: code, name: row.creator_name, creator_id: row.creator_id },
    });
    if (error || !data?.ok) warnings.push('Revenue dashboard did not confirm the code change');
  } catch {
    warnings.push('Revenue dashboard sync failed');
  }

  // ALL IN Trips: move eligibility from the old code to the new one
  if (row.allin_eligible) {
    try {
      await supabase.functions.invoke('sync-allin-eligibility', {
        body: { code: oldCode, eligible: false, name: row.creator_name, email: row.creator_email, creator_id: row.creator_id },
      });
      const { data } = await supabase.functions.invoke('sync-allin-eligibility', {
        body: { code, eligible: true, name: row.creator_name, email: row.creator_email, creator_id: row.creator_id },
      });
      if (!data?.ok) warnings.push('ALL IN Trips site not updated');
    } catch {
      warnings.push('ALL IN Trips sync failed');
    }
  }

  if (opts.sendEmails) {
    try {
      const { error } = await supabase.functions.invoke('send-approval-email', {
        body: {
          applicantName: row.creator_name,
          creatorCode: code,
          codeMethod: `manual update (was ${oldCode})`,
          email: row.creator_email,
          primarySocial: '',
          creatorId: row.creator_id,
          skipWelcome: true,
        },
      });
      if (error) warnings.push('Code creation email failed to send');
    } catch {
      warnings.push('Code creation email failed to send');
    }
  }

  return { code, warnings };
}
