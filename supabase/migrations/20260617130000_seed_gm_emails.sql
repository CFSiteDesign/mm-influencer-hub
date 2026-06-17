-- Phase 1 — populate property → General Manager email mapping.
-- Source: "GM List.xlsx" (GMs sheet). Primary GM only — support / HM / second
-- contacts intentionally excluded. Johan is GM for both Koh Rong and Koh Sdach.
-- Hoi An's interim GM Nick is normalised to the @madmonkeyhostels.com domain.
-- Ha Giang has no GM in the source, so its gm_email is left NULL (no CC).

UPDATE public.properties AS p SET
  gm_name  = v.gm_name,
  gm_email = v.gm_email
FROM (VALUES
  ('Phnom Penh',     'Adrian',           'adrian@madmonkeyhostels.com'),
  ('Siem Reap',      'Kassy',            'kassy@madmonkeyhostels.com'),
  ('Koh Rong',       'Johan',            'johan@madmonkeyhostels.com'),
  ('Koh Sdach',      'Johan',            'johan@madmonkeyhostels.com'),
  ('Gili Trawangan', 'Rade',             'rade@madmonkeyhostels.com'),
  ('Kuta Lombok',    'Kyle Waters',      'kylewalters@madmonkeyhostels.com'),
  ('Nusa Lembongan', 'Gladys',           'gladys@madmonkeyhostels.com'),
  ('Uluwatu',        'Josh Goon',        'josh@madmonkeyhostels.com'),
  ('Luang Prabang',  'Louis Partington', 'louis@madmonkeyhostels.com'),
  ('Vang Vieng',     'Tom',              'tom.william@madmonkeyhostels.com'),
  ('Dumaguete',      'Sean',             'seanpaolo@madmonkeyhostels.com'),
  ('Nacpan Beach',   'Anthony',          'anthony@madmonkeyhostels.com'),
  ('Manila',         'Dan Esposito',     'dan@madmonkeyhostels.com'),
  ('Panglao',        'Jayson',           'jayson@madmonkeyhostels.com'),
  ('Siargao',        'Alex',             'alexpinfold@madmonkeyhostels.com'),
  ('Siquijor',       NULL,               'steven@madmonkeyhostels.com'),
  ('Bangkok',        'Connor',           'connor@madmonkeyhostels.com'),
  ('Chiang Mai',     'Froggy',           'doonyathat@madmonkeyhostels.com'),
  ('Pai',            'Pin',              'rittinan@madmonkeyhostels.com'),
  ('Phuket',         'Kurt',             'kurt@madmonkeyhostels.com'),
  ('Hanoi',          'Chris Gibson',     'chris@madmonkeyhostels.com'),
  ('Hoi An',         'Nick (interim)',   'nick@madmonkeyhostels.com')
) AS v(location, gm_name, gm_email)
WHERE p.location = v.location;
