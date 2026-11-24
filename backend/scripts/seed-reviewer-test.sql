-- Test data for the reviewer endpoints (/review/access, /review/answer).
-- Safe to re-run: it deletes its own rows (fixed ids prefixed *_test) first.
-- Load:  docker compose exec -T db psql -U raser -d raser -v ON_ERROR_STOP=1 < backend/scripts/seed-reviewer-test.sql
--
-- Rubric: 10 questions (2 per section), thresholds low=20 / high=40, so max score is 50.
--
--   RubricURL token  PIN      State       Purpose
--   rvProg000001     042817   InProgress  4 of 10 answers already saved
--   rvFresh00001     135790   UrlIssued   fresh link: first access flips it to InProgress
--   rvDone000001     246810   Completed   read-only view + ASCII report (score 36 = Moderate)
--   rvWdrn000001     111111   (withdrawn paper) must answer 404 "Review link is no longer valid."
--
-- Editor login (journal/login): editor-test@example.org / password123
--
-- Also (only if seed-example2.sql was loaded): gives two of its dashboard reviewers a usable link,
-- because that seed stores 'not-a-real-hash' as the PIN, which can never be entered.
--   exTokenBob01     222222   as_ex02 (InProgress, no answers yet)
--   exTokenDave1     333333   as_ex04 (UrlIssued)

BEGIN;

DELETE FROM answer     WHERE assignment_id IN ('as_testprog','as_testfresh','as_testdone','as_testwdr');
DELETE FROM assignment WHERE assignment_id IN ('as_testprog','as_testfresh','as_testdone','as_testwdr');
DELETE FROM paper      WHERE paper_id IN ('pp_test01','pp_testwdr');
DELETE FROM issue      WHERE issue_id = 'is_test01';
DELETE FROM journal    WHERE journal_id = 'jr_test01';
DELETE FROM question   WHERE rubric_id = 'rb_test01';
DELETE FROM rubric     WHERE rubric_id = 'rb_test01';
DELETE FROM account    WHERE account_id IN ('ac_testdes','ac_testedit');

INSERT INTO account (account_id, email, password_hash, role) VALUES
  ('ac_testdes',  'designer-test@example.org', 'scrypt$7aMnMUuJO7aKjOS0tFO65Q==$/slvA9Zu3/9UfTFgsiHry+uDdZZFwetDYuapTzXiUmurnR5T8bLv7tDIsdVdvnY2Vzuwm0c9wsPpjDQkilDiXw==', 'RubricDesigner'),
  ('ac_testedit', 'editor-test@example.org',   'scrypt$7aMnMUuJO7aKjOS0tFO65Q==$/slvA9Zu3/9UfTFgsiHry+uDdZZFwetDYuapTzXiUmurnR5T8bLv7tDIsdVdvnY2Vzuwm0c9wsPpjDQkilDiXw==', 'JournalEditor');

INSERT INTO rubric (rubric_id, designer_id, name, state, publish_date, low_threshold, high_threshold)
VALUES ('rb_test01', 'ac_testdes', 'Reviewer test rubric', 'Published', current_date, 20, 40);

INSERT INTO question (question_id, rubric_id, section, position, text, explanations) VALUES
  ('q_test01', 'rb_test01', 1, 1, 'Test criterion 1 (section 1)', '{"5":"Fully met","4":"Mostly met","3":"Partly met","2":"Barely met","1":"Not met"}'::jsonb),
  ('q_test02', 'rb_test01', 1, 2, 'Test criterion 2 (section 1)', '{"5":"Fully met","4":"Mostly met","3":"Partly met","2":"Barely met","1":"Not met"}'::jsonb),
  ('q_test03', 'rb_test01', 2, 1, 'Test criterion 3 (section 2)', '{"5":"Fully met","4":"Mostly met","3":"Partly met","2":"Barely met","1":"Not met"}'::jsonb),
  ('q_test04', 'rb_test01', 2, 2, 'Test criterion 4 (section 2)', '{"5":"Fully met","4":"Mostly met","3":"Partly met","2":"Barely met","1":"Not met"}'::jsonb),
  ('q_test05', 'rb_test01', 3, 1, 'Test criterion 5 (section 3)', '{"5":"Fully met","4":"Mostly met","3":"Partly met","2":"Barely met","1":"Not met"}'::jsonb),
  ('q_test06', 'rb_test01', 3, 2, 'Test criterion 6 (section 3)', '{"5":"Fully met","4":"Mostly met","3":"Partly met","2":"Barely met","1":"Not met"}'::jsonb),
  ('q_test07', 'rb_test01', 4, 1, 'Test criterion 7 (section 4)', '{"5":"Fully met","4":"Mostly met","3":"Partly met","2":"Barely met","1":"Not met"}'::jsonb),
  ('q_test08', 'rb_test01', 4, 2, 'Test criterion 8 (section 4)', '{"5":"Fully met","4":"Mostly met","3":"Partly met","2":"Barely met","1":"Not met"}'::jsonb),
  ('q_test09', 'rb_test01', 5, 1, 'Test criterion 9 (section 5)', '{"5":"Fully met","4":"Mostly met","3":"Partly met","2":"Barely met","1":"Not met"}'::jsonb),
  ('q_test10', 'rb_test01', 5, 2, 'Test criterion 10 (section 5)', '{"5":"Fully met","4":"Mostly met","3":"Partly met","2":"Barely met","1":"Not met"}'::jsonb);

INSERT INTO journal (journal_id, editor_id, rubric_id, name)
VALUES ('jr_test01', 'ac_testedit', 'rb_test01', 'Test Journal');

INSERT INTO issue (issue_id, journal_id, volume, number) VALUES ('is_test01', 'jr_test01', 12, 3);

INSERT INTO paper (paper_id, issue_id, title, reference, withdrawn_at) VALUES
  ('pp_test01',  'is_test01', 'Sample paper title',        'https://doi.org/10.1000/test', NULL),
  ('pp_testwdr', 'is_test01', 'Withdrawn paper (ignore)',  'https://doi.org/10.1000/gone', now());

INSERT INTO assignment
  (assignment_id, paper_id, reviewer_email, deadline, status, review_token, pin_hash, completed_at, total_score, quality)
VALUES
  ('as_testprog',  'pp_test01',  'rev-progress@example.org',  current_date + 14, 'InProgress', 'rvProg000001', 'scrypt$BmBZc8XAstG7M0HcyOof/g==$lGjVFfWwMErstl2AZd8rqXgnibdSCN3LUq/uuf0CE6Jm5llNAz2Be3xKzkBJkvSa1OdSYueG5OA16KSn9dtTFg==', NULL, NULL, NULL),
  ('as_testfresh', 'pp_test01',  'rev-fresh@example.org',     current_date + 14, 'UrlIssued',  'rvFresh00001', 'scrypt$iNiZRN5pdqWTiqms029B4g==$NmrE7HJSnQbdSl3zcUWSbrim2g8VZBAjp0vdlbMjILsAw4HD5ajj+QSzYXAwvw2F1NtIZcm7dwkMDU9g2GkNLQ==',  NULL, NULL, NULL),
  ('as_testdone',  'pp_test01',  'rev-done@example.org',      current_date + 14, 'Completed',  'rvDone000001', 'scrypt$fmxB9ciP7MFEdPvzD9OqrA==$XS1LZ4PlykvfXcgYOtFDLzINvPBeQ0rmgqZpvLMLTDBpXOeREhNZmGMU1rF86HRSTc1VExeDI2QqnbZ4S6kDMg==',   now() - interval '1 day', 36, 'Moderate'),
  ('as_testwdr',   'pp_testwdr', 'rev-withdrawn@example.org', current_date + 14, 'UrlIssued',  'rvWdrn000001', 'scrypt$ZS5AbapRHhaBpUNvXgT6aw==$Au7INy9n7QUygfIk2RZ7AOpt5aVqyyU83giG5/ksF2UMGttlQx4OK7guWnO6vjvYkHOCb2rhFqfs3BgKTdCxJg==', NULL, NULL, NULL);

INSERT INTO answer (assignment_id, question_id, rating, text) VALUES
  ('as_testdone', 'q_test01', 5, 'Completed-review comment 1.'),
  ('as_testdone', 'q_test02', 4, 'Completed-review comment 2.'),
  ('as_testdone', 'q_test03', 3, 'Completed-review comment 3.'),
  ('as_testdone', 'q_test04', 5, 'Completed-review comment 4.'),
  ('as_testdone', 'q_test05', 2, 'Completed-review comment 5.'),
  ('as_testdone', 'q_test06', 4, 'Completed-review comment 6.'),
  ('as_testdone', 'q_test07', 4, 'Completed-review comment 7.'),
  ('as_testdone', 'q_test08', 3, 'Completed-review comment 8.'),
  ('as_testdone', 'q_test09', 5, 'Completed-review comment 9.'),
  ('as_testdone', 'q_test10', 1, 'Completed-review comment 10.'),
  ('as_testprog', 'q_test01', 5, 'Saved comment 1.'),
  ('as_testprog', 'q_test02', 4, 'Saved comment 2.'),
  ('as_testprog', 'q_test03', 3, 'Saved comment 3.'),
  ('as_testprog', 'q_test04', 5, 'Saved comment 4.');

-- Real links for seed-example2's reviewers (no-op if that seed isn't loaded).
UPDATE assignment SET review_token = 'exTokenBob01', pin_hash = 'scrypt$KFNC6bo+8lfc9oIQotM7Rg==$HTPBUgryXbi+p7H240USCkb7xxfn6lYa1ivqwFzt3nE9hRCKRPtjj9uTPXrIcBgFUztbAmRDaK3yQ16gVySqpg==' WHERE assignment_id = 'as_ex02';
UPDATE assignment SET review_token = 'exTokenDave1', pin_hash = 'scrypt$YBh2dO4HRg/vxDgLNkatlw==$QiffY7c71qTIIIkbnq+Z2vXhPAlczby+prwcoIo9Dgdc7MMecuTRaRuQSawr0KiG7BSEJs+mSBE+Zs0tnwDd0g==' WHERE assignment_id = 'as_ex04';

COMMIT;
