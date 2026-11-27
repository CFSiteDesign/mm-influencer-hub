import { describe, expect, it } from 'vitest';
import { parseEmailList } from '@/components/FinanceBccCard';

describe('parseEmailList (Finance BCC editor)', () => {
  it('takes one address per line, commas or spaces, and drops repeats', () => {
    expect(parseEmailList('a@x.com\nb@x.com, c@x.com  A@X.com\n\n')).toEqual({ emails: ['a@x.com', 'b@x.com', 'c@x.com'], bad: [] });
  });
  it('reports anything that is not an address', () => {
    expect(parseEmailList('a@x.com\nHendra\nfinance@')).toEqual({ emails: ['a@x.com'], bad: ['Hendra', 'finance@'] });
  });
  it('an empty box means nobody is BCC\'d', () => {
    expect(parseEmailList('  \n ')).toEqual({ emails: [], bad: [] });
  });
});
