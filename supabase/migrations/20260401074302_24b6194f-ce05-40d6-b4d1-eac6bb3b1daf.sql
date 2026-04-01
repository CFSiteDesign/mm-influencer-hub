
DELETE FROM public.status_log WHERE applicant_id = '22300cfb-09d9-491b-a934-68a40b260cd0';
DELETE FROM public.creator_codes WHERE applicant_id = '22300cfb-09d9-491b-a934-68a40b260cd0';
DELETE FROM public.applicants WHERE id = '22300cfb-09d9-491b-a934-68a40b260cd0';
SELECT setval('creator_id_seq', 64);
