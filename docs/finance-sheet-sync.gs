/**
 * Mad Monkey Creator Hub: Finance BCC sync
 *
 * Lives in the "Regional / Global Master List" Google Sheet. Every time the
 * sheet changes, it sends the Finance tab to the Creator Hub, so booking
 * confirmations are BCC'd to the right regional finance team. It also runs
 * once a day in case a change was missed.
 *
 * One-time setup, by someone who can edit the sheet:
 *   1. In the sheet: Extensions > Apps Script.
 *   2. Replace everything in Code.gs with this file and press Save.
 *   3. Choose "setUp" in the function list at the top and press Run.
 *   4. Approve the permissions Google asks for (read this sheet, connect to
 *      the Creator Hub, run on a schedule).
 * Done. View > Executions shows each sync.
 *
 * The Finance tab needs a header row with "Email" in it. The country is the
 * first column; "Full Name" and "Job Title" are read if present.
 *
 * The copy in the Creator Hub repository has no key. The copy you paste in
 * has it filled in; keep it out of chats and documents.
 */

const HUB_URL = 'https://ravecomtupiyurjezwji.supabase.co/functions/v1/sync-finance-contacts';
const SYNC_KEY = 'PASTE_THE_SYNC_KEY_HERE';
const TAB_NAME = 'Finance';

/** Run once: adds the triggers and does a first sync. */
function setUp() {
  ScriptApp.getProjectTriggers()
    .filter((t) => ['onSheetChange', 'dailySync'].includes(t.getHandlerFunction()))
    .forEach((t) => ScriptApp.deleteTrigger(t));
  const ss = SpreadsheetApp.getActive();
  ScriptApp.newTrigger('onSheetChange').forSpreadsheet(ss).onChange().create();
  ScriptApp.newTrigger('dailySync').timeBased().everyDays(1).atHour(6).create();
  const result = syncFinance(true);
  console.log('Set up. First sync: ' + JSON.stringify(result));
}

/** Any change to the sheet. Only sends when the Finance tab itself changed. */
function onSheetChange() {
  syncFinance(false);
}

/** Once a day, sent even if nothing changed. */
function dailySync() {
  syncFinance(true);
}

/** Run this by hand to send the Finance tab now. */
function syncNow() {
  console.log(JSON.stringify(syncFinance(true)));
}

function syncFinance(force) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { ok: false, error: 'Another sync is running' };
  try {
    const sheet = SpreadsheetApp.getActive().getSheetByName(TAB_NAME);
    if (!sheet) throw new Error('No tab called "' + TAB_NAME + '"');
    const rows = parseFinanceValues(sheet.getDataRange().getDisplayValues());
    const payload = JSON.stringify({ rows: rows });

    const digest = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, payload));
    const props = PropertiesService.getScriptProperties();
    if (!force && props.getProperty('lastSent') === digest) return { ok: true, skipped: 'Finance tab unchanged' };

    const res = UrlFetchApp.fetch(HUB_URL, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-sync-key': SYNC_KEY },
      payload: payload,
      muteHttpExceptions: true,
    });
    let out;
    try { out = JSON.parse(res.getContentText()); } catch (e) { out = { ok: false, error: res.getContentText() }; }
    if (res.getResponseCode() === 200 && out.ok) {
      props.setProperty('lastSent', digest);
      console.log('Synced ' + out.total + ' finance contacts: ' + out.added + ' added, ' + out.removed + ' removed, ' + out.updated + ' updated');
    } else {
      console.error('The Creator Hub did not take the update: ' + (out.error || res.getResponseCode()));
    }
    return out;
  } finally {
    lock.releaseLock();
  }
}

/** The Finance tab as { country, full_name, email, job_title } rows. */
function parseFinanceValues(values) {
  const headerAt = values.findIndex((r) => r.some((c) => String(c).trim().toLowerCase() === 'email'));
  if (headerAt < 0) throw new Error('No "Email" header on the ' + TAB_NAME + ' tab');
  const head = values[headerAt].map((c) => String(c).trim().toLowerCase());
  const emailCol = head.indexOf('email');
  const nameCol = head.indexOf('full name');
  const titleCol = head.indexOf('job title');
  const rows = [];
  let country = '';
  values.slice(headerAt + 1).forEach((r) => {
    // A blank country cell (merged or left empty) belongs to the country above.
    if (String(r[0]).trim()) country = String(r[0]).trim();
    const email = String(r[emailCol] || '').trim();
    if (!email || email.indexOf('@') < 0 || !country) return;
    rows.push({
      country: country,
      full_name: nameCol >= 0 ? String(r[nameCol]).trim() : '',
      email: email,
      job_title: titleCol >= 0 ? String(r[titleCol]).trim() : '',
    });
  });
  return rows;
}
