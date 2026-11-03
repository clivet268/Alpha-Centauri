-- Fills the journal you registered ("Test Journal") with data for every dashboard field.
-- Re-runnable: it clears that journal's issues/papers/assignments first.
-- If you registered under a different journal name, change it in the SELECT below.
--
--   docker compose exec -T db psql -U raser -d raser -v ON_ERROR_STOP=1 < backend/scripts/seed-test-journal.sql
BEGIN;

DO $$
DECLARE
  jid  text;
  iss  text;
  pap  text;
BEGIN
  SELECT journal_id INTO jid
  FROM journal WHERE name = 'Test Journal'
  ORDER BY created_at DESC LIMIT 1;
  IF jid IS NULL THEN
    RAISE EXCEPTION 'No journal named "Test Journal" found. Register it in the UI first.';
  END IF;

  -- Clean slate for this journal (this also removes anything the seed trigger added).
  DELETE FROM assignment WHERE paper_id IN (
    SELECT p.paper_id FROM paper p JOIN issue i ON i.issue_id = p.issue_id
    WHERE i.journal_id = jid);
  DELETE FROM paper WHERE issue_id IN (SELECT issue_id FROM issue WHERE journal_id = jid);
  DELETE FROM issue WHERE journal_id = jid;

  -- Point the journal at the Deprecated rubric so the rubric list shows the replacement
  -- chain: rb_8c1e (Deprecated, ReplacementId = rb_93d2) -> rb_93d2 (Published, 14 questions).
  UPDATE journal SET rubric_id = 'rb_8c1e' WHERE journal_id = jid;

  -- 12 issues (volume 12, numbers 1..12): page size is 10, so you get a page 2.
  -- Listed newest first, so 12/12 is the top row and is selected by default.
  FOR n IN 1..12 LOOP
    INSERT INTO issue (journal_id, volume, number) VALUES (jid, 12, n);
  END LOOP;

  -- Issue 12/12: three papers covering every assignment status.
  SELECT issue_id INTO iss FROM issue WHERE journal_id = jid AND volume = 12 AND number = 12;

  INSERT INTO paper (issue_id, title, reference)
  VALUES (iss, 'Effects of Sample Size on Reproducibility', 'https://doi.org/10.1000/a1')
  RETURNING paper_id INTO pap;
  INSERT INTO assignment (paper_id, reviewer_email, deadline, status,
                          review_token, pin_hash, completed_at, total_score, quality)
  VALUES
    (pap, 'alice@uni.edu', current_date - 3, 'Completed',
     substr(md5(random()::text), 1, 12), 'not-a-real-hash', now() - interval '2 days', 58, 'High'),
    (pap, 'bob@uni.edu',   current_date + 7, 'InProgress',
     substr(md5(random()::text), 1, 12), 'not-a-real-hash', NULL, NULL, NULL);

  INSERT INTO paper (issue_id, title, reference)
  VALUES (iss, 'A Survey of Statistical Reporting Practices', 'https://doi.org/10.1000/b2')
  RETURNING paper_id INTO pap;
  INSERT INTO assignment (paper_id, reviewer_email, deadline, status,
                          review_token, pin_hash, completed_at, total_score, quality)
  VALUES
    (pap, 'carol@uni.edu', current_date + 14, 'Assigned',
     NULL, NULL, NULL, NULL, NULL),
    (pap, 'dave@uni.edu',  current_date + 10, 'UrlIssued',
     substr(md5(random()::text), 1, 12), 'not-a-real-hash', NULL, NULL, NULL);

  -- A paper with no reviewers yet
  INSERT INTO paper (issue_id, title, reference)
  VALUES (iss, 'Materials Sourcing in Open Science', 'https://doi.org/10.1000/c3');

  -- Issue 12/11: one paper with a completed, moderate-quality review
  SELECT issue_id INTO iss FROM issue WHERE journal_id = jid AND volume = 12 AND number = 11;
  INSERT INTO paper (issue_id, title, reference)
  VALUES (iss, 'Bias Risk in Observational Studies', 'https://doi.org/10.1000/d4')
  RETURNING paper_id INTO pap;
  INSERT INTO assignment (paper_id, reviewer_email, deadline, status,
                          review_token, pin_hash, completed_at, total_score, quality)
  VALUES
    (pap, 'erin@uni.edu', current_date - 10, 'Completed',
     substr(md5(random()::text), 1, 12), 'not-a-real-hash', now() - interval '9 days', 47, 'Moderate');

  -- Issue 12/10: one paper with a low-quality completed review and one in progress
  SELECT issue_id INTO iss FROM issue WHERE journal_id = jid AND volume = 12 AND number = 10;
  INSERT INTO paper (issue_id, title, reference)
  VALUES (iss, 'Methodology Gaps in Replication Studies', 'https://doi.org/10.1000/e5')
  RETURNING paper_id INTO pap;
  INSERT INTO assignment (paper_id, reviewer_email, deadline, status,
                          review_token, pin_hash, completed_at, total_score, quality)
  VALUES
    (pap, 'frank@uni.edu', current_date - 1, 'Completed',
     substr(md5(random()::text), 1, 12), 'not-a-real-hash', now() - interval '1 day', 31, 'Low'),
    (pap, 'gina@uni.edu',  current_date + 5, 'InProgress',
     substr(md5(random()::text), 1, 12), 'not-a-real-hash', NULL, NULL, NULL);
END $$;

COMMIT;
