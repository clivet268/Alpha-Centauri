-- A ready-to-log-in journal editor with a fully populated dashboard.
--
--   Login:  example2@gmail.com  /  password
--   Journal: "Example Journal" (jr_example2), also viewable at /editor/dashboard?journalId=jr_example2
--
-- Self-contained: needs only schema.sql, not seed-dashboard.sql. Safe to re-run: it removes
-- its own rows first (fixed ids rb_ex01-03, jr_example2, is_ex*, pp_ex*, as_ex*), plus any
-- account registered with example2@gmail.com and its journal.
--
--   docker compose exec -T db psql -U raser -d raser -v ON_ERROR_STOP=1 < backend/scripts/seed-example2.sql
BEGIN;

-- ---------------------------------------------------------------------------
-- Cleanup
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE ex_journals ON COMMIT DROP AS
  SELECT journal_id, editor_id FROM journal
  WHERE journal_id = 'jr_example2'
     OR rubric_id IN ('rb_ex01', 'rb_ex02', 'rb_ex03')
     OR editor_id IN (SELECT account_id FROM account WHERE email = 'example2@gmail.com');

DELETE FROM assignment WHERE paper_id IN (
  SELECT p.paper_id FROM paper p JOIN issue i ON i.issue_id = p.issue_id
  WHERE i.journal_id IN (SELECT journal_id FROM ex_journals));
DELETE FROM paper WHERE issue_id IN (
  SELECT issue_id FROM issue WHERE journal_id IN (SELECT journal_id FROM ex_journals));
DELETE FROM issue   WHERE journal_id IN (SELECT journal_id FROM ex_journals);
DELETE FROM journal WHERE journal_id IN (SELECT journal_id FROM ex_journals);
DELETE FROM rubric  WHERE rubric_id IN ('rb_ex01', 'rb_ex02', 'rb_ex03');   -- questions cascade
DELETE FROM account WHERE email IN ('example2@gmail.com', 'ex-designer@lab.org')
                       OR account_id IN (SELECT editor_id FROM ex_journals);

-- ---------------------------------------------------------------------------
-- Accounts. The editor's password is "password", stored as a real scrypt hash
-- (same format backend/src/shared/password.ts produces), so Login accepts it.
-- ---------------------------------------------------------------------------
INSERT INTO account (account_id, email, password_hash, role) VALUES
  ('ac_exdesigner', 'ex-designer@lab.org', 'not-a-real-hash', 'RubricDesigner'),
  ('ac_example2',   'example2@gmail.com',  'scrypt$XKyk9mzU6ou0Qzc/sugj4g==$ytMErkZ7mdDzU4+ZctN7uO3jS2BfrA5zh7y+K9j1iHZiAYt2alYgZLv5FewALNHyr9fd8nQ2ZSiIYGjcojO9RA==', 'JournalEditor');

-- ---------------------------------------------------------------------------
-- Rubric chain: v1 (Deprecated) -> v2 (Deprecated) -> v3 (Published).
-- Inserted newest first because each deprecated rubric points at its replacement.
-- ---------------------------------------------------------------------------
INSERT INTO rubric (rubric_id, designer_id, name, state, publish_date, low_threshold, high_threshold)
VALUES ('rb_ex03', 'ac_exdesigner', 'Reproducibility Rubric v3', 'Published', '2026-09-30', 40, 55);

INSERT INTO rubric (rubric_id, designer_id, name, state, publish_date, low_threshold, high_threshold,
                    replacement_rubric_id, deprecated_at)
VALUES ('rb_ex02', 'ac_exdesigner', 'Reproducibility Rubric v2', 'Deprecated', '2026-06-15', 38, 52,
        'rb_ex03', '2026-09-30 12:00:00+00');

INSERT INTO rubric (rubric_id, designer_id, name, state, publish_date, low_threshold, high_threshold,
                    replacement_rubric_id, deprecated_at)
VALUES ('rb_ex01', 'ac_exdesigner', 'Reproducibility Rubric v1', 'Deprecated', '2026-03-01', 35, 50,
        'rb_ex02', '2026-06-15 12:00:00+00');

-- 14 questions per rubric, spread over the 5 sections (max score 70).
-- n -> section ((n-1) % 5) + 1, position ((n-1) / 5) + 1.
CREATE TEMP TABLE ex_questions (n int, text text) ON COMMIT DROP;
INSERT INTO ex_questions VALUES
  (1,  'Does the paper clearly state its research question?'),
  (2,  'Are all materials and suppliers identified?'),
  (3,  'Is the method described in enough detail to reproduce it?'),
  (4,  'Is the risk of bias assessed and discussed?'),
  (5,  'Is a data availability statement provided?'),
  (6,  'Is key relevant literature cited?'),
  (7,  'Are reagent or software versions recorded?'),
  (8,  'Are parameter values and settings reported?'),
  (9,  'Are the statistical tests appropriate for the data?'),
  (10, 'Does reporting follow a recognised checklist?'),
  (11, 'Is the contribution positioned against prior work?'),
  (12, 'Are the sources of samples or data documented?'),
  (13, 'Could an independent lab repeat the procedure from the text alone?'),
  (14, 'Are effect sizes and confidence intervals reported?');

INSERT INTO question (question_id, rubric_id, section, position, text, explanations)
SELECT 'q_' || r.rubric_id || '_' || q.n, r.rubric_id,
       ((q.n - 1) % 5) + 1, ((q.n - 1) / 5) + 1, q.text,
       '{"5":"Fully met, with clear evidence","4":"Largely met, minor gaps","3":"Partly met","2":"Barely met","1":"Not met"}'::jsonb
FROM (VALUES ('rb_ex01'), ('rb_ex02'), ('rb_ex03')) AS r(rubric_id)
CROSS JOIN ex_questions q;

-- ---------------------------------------------------------------------------
-- Journal, registered against the OLDEST rubric so the dashboard shows the whole chain
-- ---------------------------------------------------------------------------
INSERT INTO journal (journal_id, editor_id, rubric_id, name)
VALUES ('jr_example2', 'ac_example2', 'rb_ex01', 'Example Journal');

-- Issues (newest first on the dashboard)
INSERT INTO issue (issue_id, journal_id, volume, number) VALUES
  ('is_ex01', 'jr_example2', 12, 3),
  ('is_ex02', 'jr_example2', 12, 2),
  ('is_ex03', 'jr_example2', 12, 1),
  ('is_ex04', 'jr_example2', 11, 12);

INSERT INTO paper (paper_id, issue_id, title, reference) VALUES
  ('pp_ex01', 'is_ex01', 'Effects of Sample Size on Reproducibility',   'https://doi.org/10.1000/ex.101'),
  ('pp_ex02', 'is_ex01', 'A Survey of Statistical Reporting Practices', 'https://doi.org/10.1000/ex.102'),
  ('pp_ex03', 'is_ex01', 'Materials Sourcing in Open Science',          'https://doi.org/10.1000/ex.103'),
  ('pp_ex04', 'is_ex02', 'Bias Risk in Observational Studies',          'https://doi.org/10.1000/ex.104'),
  ('pp_ex05', 'is_ex02', 'Methodology Gaps in Replication Studies',     'https://doi.org/10.1000/ex.105'),
  ('pp_ex06', 'is_ex03', 'Open Data Practices in Clinical Trials',      'https://doi.org/10.1000/ex.106'),
  ('pp_ex07', 'is_ex04', 'Preregistration and Reporting Transparency',  'https://doi.org/10.1000/ex.107');

-- Assignments: every status (Assigned, UrlIssued, InProgress, Completed) and every
-- quality class (High >= 55, Moderate 40-54, Low < 40).
-- Assigned has no token/PIN yet; every other status has both; Completed also has a score.
INSERT INTO assignment (assignment_id, paper_id, reviewer_email, deadline, status,
                        review_token, pin_hash, completed_at, total_score, quality) VALUES
  ('as_ex01', 'pp_ex01', 'alice@uni.edu',  current_date - 3,  'Completed',
   substr(md5('as_ex01'), 1, 12), 'not-a-real-hash', now() - interval '2 days', 58, 'High'),
  ('as_ex02', 'pp_ex01', 'bob@uni.edu',    current_date + 7,  'InProgress',
   substr(md5('as_ex02'), 1, 12), 'not-a-real-hash', NULL, NULL, NULL),
  ('as_ex03', 'pp_ex02', 'carol@uni.edu',  current_date + 14, 'Assigned',
   NULL, NULL, NULL, NULL, NULL),
  ('as_ex04', 'pp_ex02', 'dave@uni.edu',   current_date + 10, 'UrlIssued',
   substr(md5('as_ex04'), 1, 12), 'not-a-real-hash', NULL, NULL, NULL),
  ('as_ex05', 'pp_ex03', 'erin@uni.edu',   current_date - 5,  'Completed',
   substr(md5('as_ex05'), 1, 12), 'not-a-real-hash', now() - interval '4 days', 47, 'Moderate'),
  ('as_ex06', 'pp_ex04', 'frank@uni.edu',  current_date - 1,  'Completed',
   substr(md5('as_ex06'), 1, 12), 'not-a-real-hash', now() - interval '1 day', 31, 'Low'),
  ('as_ex07', 'pp_ex04', 'gina@uni.edu',   current_date + 5,  'InProgress',
   substr(md5('as_ex07'), 1, 12), 'not-a-real-hash', NULL, NULL, NULL),
  ('as_ex08', 'pp_ex05', 'henry@uni.edu',  current_date + 21, 'Assigned',
   NULL, NULL, NULL, NULL, NULL),
  ('as_ex09', 'pp_ex06', 'irene@uni.edu',  current_date - 20, 'Completed',
   substr(md5('as_ex09'), 1, 12), 'not-a-real-hash', now() - interval '19 days', 56, 'High'),
  ('as_ex10', 'pp_ex07', 'jack@uni.edu',   current_date - 40, 'Completed',
   substr(md5('as_ex10'), 1, 12), 'not-a-real-hash', now() - interval '38 days', 44, 'Moderate');

COMMIT;
