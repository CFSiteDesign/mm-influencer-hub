DELETE FROM public.status_log WHERE applicant_id IN (SELECT id FROM public.applicants WHERE creator_id = 'CH065');
DELETE FROM public.creator_codes WHERE creator_id = 'CH065' OR applicant_id IN (SELECT id FROM public.applicants WHERE creator_id = 'CH065');
DELETE FROM public.applicants WHERE creator_id = 'CH065';
SELECT setval('creator_id_seq', 64);