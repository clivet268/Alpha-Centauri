BEGIN;

CREATE TYPE account_role      AS ENUM ('RubricDesigner', 'JournalEditor');
CREATE TYPE rubric_state      AS ENUM ('Unpublished', 'Published', 'Deprecated');
CREATE TYPE assignment_status AS ENUM ('Assigned', 'UrlIssued', 'InProgress', 'Completed');
CREATE TYPE quality_class     AS ENUM ('High', 'Moderate', 'Low');

CREATE TABLE account (
    account_id    text PRIMARY KEY DEFAULT 'ac_' || replace(gen_random_uuid()::text, '-', ''),
    email         varchar(254) NOT NULL UNIQUE,
    password_hash text         NOT NULL,
    role          account_role NOT NULL,
    created_at    timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE rubric (
    rubric_id             text PRIMARY KEY DEFAULT 'rb_' || replace(gen_random_uuid()::text, '-', ''),
    designer_id           text         NOT NULL REFERENCES account (account_id),
    name                  varchar(200) NOT NULL CHECK (length(trim(name)) > 0),
    state                 rubric_state NOT NULL DEFAULT 'Unpublished',
    publish_date          date,
    low_threshold         integer      CHECK (low_threshold >= 0),
    high_threshold        integer      CHECK (high_threshold >= 0),
    replacement_rubric_id text         REFERENCES rubric (rubric_id),
    deprecated_at         timestamptz,
    created_at            timestamptz  NOT NULL DEFAULT now(),
    updated_at            timestamptz  NOT NULL DEFAULT now(),
    CHECK (low_threshold IS NULL OR high_threshold IS NULL OR low_threshold <= high_threshold),
    CHECK ((state = 'Unpublished') = (publish_date IS NULL)),
    CHECK ((state = 'Deprecated') = (replacement_rubric_id IS NOT NULL)),
    CHECK ((state = 'Deprecated') = (deprecated_at IS NOT NULL))
);
CREATE INDEX rubric_designer_idx  ON rubric (designer_id);
CREATE INDEX rubric_state_idx     ON rubric (state);

CREATE TABLE question (
    question_id  text PRIMARY KEY DEFAULT 'q_' || replace(gen_random_uuid()::text, '-', ''),
    rubric_id    text          NOT NULL REFERENCES rubric (rubric_id) ON DELETE CASCADE,
    section      smallint      NOT NULL CHECK (section BETWEEN 1 AND 5),
    position     integer       NOT NULL,
    text         varchar(2000) NOT NULL CHECK (length(trim(text)) > 0),
    explanations jsonb         NOT NULL,
    updated_at   timestamptz   NOT NULL DEFAULT now(),
    UNIQUE (rubric_id, section, position)
);

CREATE TABLE journal (
    journal_id   text PRIMARY KEY DEFAULT 'jr_' || replace(gen_random_uuid()::text, '-', ''),
    editor_id    text         NOT NULL UNIQUE REFERENCES account (account_id),
    rubric_id    text         NOT NULL REFERENCES rubric (rubric_id),
    name         varchar(200) NOT NULL CHECK (length(trim(name)) > 0),
    withdrawn_at timestamptz,
    created_at   timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX journal_rubric_idx ON journal (rubric_id);

CREATE TABLE issue (
    issue_id   text PRIMARY KEY DEFAULT 'is_' || replace(gen_random_uuid()::text, '-', ''),
    journal_id text     NOT NULL REFERENCES journal (journal_id),
    volume     integer  NOT NULL CHECK (volume >= 1),
    number     smallint NOT NULL CHECK (number BETWEEN 1 AND 12),
    UNIQUE (journal_id, volume, number)
);

CREATE TABLE paper (
    paper_id     text PRIMARY KEY DEFAULT 'pp_' || replace(gen_random_uuid()::text, '-', ''),
    issue_id     text         NOT NULL REFERENCES issue (issue_id) ON DELETE CASCADE,
    title        varchar(500) NOT NULL CHECK (length(trim(title)) > 0),
    reference    varchar(500) NOT NULL,
    withdrawn_at timestamptz,
    closed_at    timestamptz
);
CREATE INDEX paper_issue_idx ON paper (issue_id);

CREATE TABLE assignment (
    assignment_id  text PRIMARY KEY DEFAULT 'as_' || replace(gen_random_uuid()::text, '-', ''),
    paper_id       text              NOT NULL REFERENCES paper (paper_id),
    reviewer_email varchar(254)      NOT NULL,
    deadline       date              NOT NULL,
    status         assignment_status NOT NULL DEFAULT 'Assigned',
    review_token   char(12)          UNIQUE,
    pin_hash       text,
    completed_at   timestamptz,
    total_score    integer           CHECK (total_score >= 0),
    quality        quality_class,
    CHECK ((review_token IS NULL) = (pin_hash IS NULL)),
    CHECK ((status = 'Assigned') = (review_token IS NULL)),
    CHECK ((status = 'Completed') = (completed_at IS NOT NULL)),
    CHECK ((status = 'Completed') = (total_score IS NOT NULL)),
    CHECK ((status = 'Completed') = (quality IS NOT NULL)),
    UNIQUE (paper_id, reviewer_email)
);

CREATE TABLE answer (
    assignment_id text          NOT NULL REFERENCES assignment (assignment_id) ON DELETE CASCADE,
    question_id   text          NOT NULL REFERENCES question (question_id),
    rating        smallint      NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text          varchar(2000) NOT NULL CHECK (length(trim(text)) > 0),
    saved_at      timestamptz   NOT NULL DEFAULT now(),
    PRIMARY KEY (assignment_id, question_id)
);
CREATE INDEX answer_question_idx ON answer (question_id);

COMMIT;
