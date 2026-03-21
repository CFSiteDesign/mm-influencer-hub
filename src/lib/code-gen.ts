import { supabase } from '@/lib/supabase';

export function stripAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function stripNonAlpha(str: string): string {
  return str.replace(/[^a-zA-Z]/g, "");
}

export function titleCase(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function parseName(fullName: string): { firstName: string; initial: string } {
  const parts = fullName.trim().replace(/\s+/g, " ").split(" ");
  const firstName = titleCase(stripNonAlpha(stripAccents(parts[0])).slice(0, 15));
  let initial: string;
  if (parts.length > 1) {
    const surname = stripNonAlpha(stripAccents(parts[parts.length - 1]));
    initial = surname ? surname.charAt(0).toUpperCase() : firstName.charAt(0);
  } else {
    initial = firstName ? firstName.charAt(0) : "";
  }
  return { firstName, initial };
}

export async function codeExists(code: string): Promise<boolean> {
  const { data } = await supabase
    .from("creator_codes")
    .select("code")
    .ilike("code", code)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export async function generateCreatorCode(
  fullName: string
): Promise<{ code: string | null; method: string }> {
  const { firstName, initial } = parseName(fullName);
  if (!firstName) return { code: null, method: "manual" };

  // Tier 1: FirstName10
  const tier1 = firstName + "10";
  if (!(await codeExists(tier1))) {
    return { code: tier1, method: "first_name" };
  }

  // Tier 2: FirstName + Initial + 10
  const tier2 = firstName + initial + "10";
  if (!(await codeExists(tier2))) {
    return { code: tier2, method: "first_name_initial" };
  }

  // Tier 3: Increment 11–99
  for (let i = 11; i <= 99; i++) {
    const candidate = firstName + initial + i;
    if (!(await codeExists(candidate))) {
      return { code: candidate, method: "first_name_initial_inc" };
    }
  }

  return { code: null, method: "manual" };
}
