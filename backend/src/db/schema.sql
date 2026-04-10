-- UserCredentials: authentication info
CREATE TABLE IF NOT EXISTS user_credentials (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  role        VARCHAR(20)  NOT NULL CHECK (role IN ('user', 'staff', 'administrator')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- UserProfile: user details
CREATE TABLE IF NOT EXISTS user_profiles (
  id          UUID PRIMARY KEY REFERENCES user_credentials(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  service_id  VARCHAR(50),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Service
CREATE TABLE IF NOT EXISTS services (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(100) NOT NULL,
  description       TEXT         NOT NULL,
  expected_duration INTEGER      NOT NULL CHECK (expected_duration BETWEEN 1 AND 480),
  priority          VARCHAR(10)  NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  is_open           BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Queue: one active queue per service
CREATE TABLE IF NOT EXISTS queues (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id  UUID        NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  status      VARCHAR(10) NOT NULL CHECK (status IN ('open', 'closed')) DEFAULT 'open',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- QueueEntry: users waiting in a queue
CREATE TABLE IF NOT EXISTS queue_entries (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id    UUID        NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
  service_id  UUID        NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES user_credentials(id) ON DELETE CASCADE,
  position    INTEGER     NOT NULL,
  status      VARCHAR(15) NOT NULL CHECK (status IN ('waiting', 'almost-ready', 'served', 'left')) DEFAULT 'waiting',
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  served_at   TIMESTAMPTZ,
  left_at     TIMESTAMPTZ
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES user_credentials(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  message     TEXT         NOT NULL,
  read        BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- History
CREATE TABLE IF NOT EXISTS history (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES user_credentials(id) ON DELETE CASCADE,
  service_id  UUID        NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  status      VARCHAR(10) NOT NULL CHECK (status IN ('served', 'left')),
  joined_at   TIMESTAMPTZ NOT NULL,
  served_at   TIMESTAMPTZ,
  left_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
