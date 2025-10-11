-- Migration 010: Backend Integration Tables
-- Adds tables for background jobs, mask keyframes, and preview caching

-- ============================================
-- BACKGROUND JOBS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  error TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_background_jobs_project ON background_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_background_jobs_user ON background_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_background_jobs_status ON background_jobs(status);
CREATE INDEX IF NOT EXISTS idx_background_jobs_type ON background_jobs(type);
CREATE INDEX IF NOT EXISTS idx_background_jobs_created ON background_jobs(created_at DESC);

-- ============================================
-- MASK KEYFRAMES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS mask_keyframes (
  id SERIAL PRIMARY KEY,
  mask_id UUID NOT NULL REFERENCES masks(id) ON DELETE CASCADE,
  time DECIMAL(10, 3) NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}',
  easing VARCHAR(20) NOT NULL DEFAULT 'linear',
  bezier_points DECIMAL(5, 3)[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(mask_id, time)
);

CREATE INDEX IF NOT EXISTS idx_mask_keyframes_mask ON mask_keyframes(mask_id);
CREATE INDEX IF NOT EXISTS idx_mask_keyframes_time ON mask_keyframes(mask_id, time);

-- ============================================
-- PREVIEW CACHE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS preview_cache (
  id SERIAL PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  timestamp DECIMAL(10, 3) NOT NULL,
  preview_type VARCHAR(50) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  format VARCHAR(10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(project_id, timestamp, preview_type)
);

CREATE INDEX IF NOT EXISTS idx_preview_cache_project ON preview_cache(project_id);
CREATE INDEX IF NOT EXISTS idx_preview_cache_expires ON preview_cache(expires_at);

-- ============================================
-- AI SERVICE LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS ai_service_logs (
  id SERIAL PRIMARY KEY,
  service_name VARCHAR(100) NOT NULL,
  operation VARCHAR(100) NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  user_id TEXT,
  request_data JSONB,
  response_data JSONB,
  status VARCHAR(20) NOT NULL,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_service_logs_service ON ai_service_logs(service_name);
CREATE INDEX IF NOT EXISTS idx_ai_service_logs_project ON ai_service_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_service_logs_user ON ai_service_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_service_logs_created ON ai_service_logs(created_at DESC);

-- ============================================
-- RENDER QUEUE TABLE
-- ============================================

DROP TABLE IF EXISTS render_queue CASCADE;
CREATE TABLE render_queue (
  id SERIAL PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  preset_id UUID REFERENCES export_presets(id) ON DELETE SET NULL,
  output_path TEXT NOT NULL,
  render_options JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  output_file_size INTEGER,
  output_duration DECIMAL(10, 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_render_queue_project ON render_queue(project_id);
CREATE INDEX IF NOT EXISTS idx_render_queue_user ON render_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_render_queue_status ON render_queue(status);
CREATE INDEX IF NOT EXISTS idx_render_queue_priority ON render_queue(priority DESC, created_at ASC);

-- ============================================
-- CAPTION EXPORT HISTORY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS caption_exports (
  id SERIAL PRIMARY KEY,
  caption_id UUID NOT NULL REFERENCES auto_captions(id) ON DELETE CASCADE,
  format VARCHAR(10) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_caption_exports_caption ON caption_exports(caption_id);
CREATE INDEX IF NOT EXISTS idx_caption_exports_format ON caption_exports(format);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp on background_jobs
CREATE OR REPLACE FUNCTION update_background_jobs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_background_jobs_timestamp ON background_jobs;
CREATE TRIGGER trigger_update_background_jobs_timestamp
BEFORE UPDATE ON background_jobs
FOR EACH ROW
EXECUTE FUNCTION update_background_jobs_timestamp();

-- Update updated_at timestamp on mask_keyframes
CREATE OR REPLACE FUNCTION update_mask_keyframes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_mask_keyframes_timestamp ON mask_keyframes;
CREATE TRIGGER trigger_update_mask_keyframes_timestamp
BEFORE UPDATE ON mask_keyframes
FOR EACH ROW
EXECUTE FUNCTION update_mask_keyframes_timestamp();

-- Update updated_at timestamp on render_queue
CREATE OR REPLACE FUNCTION update_render_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_render_queue_timestamp ON render_queue;
CREATE TRIGGER trigger_update_render_queue_timestamp
BEFORE UPDATE ON render_queue
FOR EACH ROW
EXECUTE FUNCTION update_render_queue_timestamp();

-- Auto-cleanup expired preview cache
CREATE OR REPLACE FUNCTION cleanup_expired_previews()
RETURNS void AS $$
BEGIN
  DELETE FROM preview_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS
-- ============================================

-- Active jobs view
CREATE OR REPLACE VIEW active_jobs AS
SELECT
  bj.id,
  bj.type,
  bj.status,
  bj.progress,
  bj.project_id,
  p.name AS project_name,
  bj.user_id,
  bj.created_at,
  bj.started_at,
  EXTRACT(EPOCH FROM (NOW() - bj.started_at)) AS running_seconds
FROM background_jobs bj
LEFT JOIN projects p ON bj.project_id = p.id
WHERE bj.status IN ('pending', 'processing')
ORDER BY bj.created_at ASC;

-- Job statistics view
CREATE OR REPLACE VIEW job_statistics AS
SELECT
  type,
  status,
  COUNT(*) AS count,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) AS avg_duration_seconds,
  MIN(EXTRACT(EPOCH FROM (completed_at - started_at))) AS min_duration_seconds,
  MAX(EXTRACT(EPOCH FROM (completed_at - started_at))) AS max_duration_seconds
FROM background_jobs
WHERE completed_at IS NOT NULL
GROUP BY type, status;

-- AI service health view
CREATE OR REPLACE VIEW ai_service_health AS
SELECT
  service_name,
  COUNT(*) AS total_requests,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS successful_requests,
  SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS failed_requests,
  AVG(duration_ms) AS avg_duration_ms,
  MAX(created_at) AS last_request_at
FROM ai_service_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY service_name;

-- Render queue status view
CREATE OR REPLACE VIEW render_queue_status AS
SELECT
  status,
  COUNT(*) AS count,
  AVG(progress) AS avg_progress,
  MIN(created_at) AS oldest_job,
  MAX(created_at) AS newest_job
FROM render_queue
WHERE status IN ('queued', 'rendering')
GROUP BY status;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Get next job from queue
CREATE OR REPLACE FUNCTION get_next_job()
RETURNS TABLE (
  id UUID,
  type VARCHAR(50),
  project_id UUID,
  user_id TEXT,
  data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT bj.id, bj.type, bj.project_id, bj.user_id, bj.data
  FROM background_jobs bj
  WHERE bj.status = 'pending'
  ORDER BY bj.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
END;
$$ LANGUAGE plpgsql;

-- Cancel all jobs for a project
CREATE OR REPLACE FUNCTION cancel_project_jobs(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  cancelled_count INTEGER;
BEGIN
  UPDATE background_jobs
  SET status = 'cancelled', completed_at = NOW()
  WHERE project_id = p_project_id
    AND status IN ('pending', 'processing');
  
  GET DIAGNOSTICS cancelled_count = ROW_COUNT;
  RETURN cancelled_count;
END;
$$ LANGUAGE plpgsql;

-- Get job progress
CREATE OR REPLACE FUNCTION get_job_progress(p_job_id UUID)
RETURNS TABLE (
  status VARCHAR(20),
  progress INTEGER,
  message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT bj.status, bj.progress, bj.error AS message
  FROM background_jobs bj
  WHERE bj.id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old jobs
CREATE OR REPLACE FUNCTION cleanup_old_jobs(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM background_jobs
  WHERE status IN ('completed', 'failed', 'cancelled')
    AND completed_at < NOW() - (days_old || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE background_jobs IS 'Queue for long-running background tasks';
COMMENT ON TABLE mask_keyframes IS 'Keyframe animation data for masks';
COMMENT ON TABLE preview_cache IS 'Cache for generated preview images';
COMMENT ON TABLE ai_service_logs IS 'Logs for AI service API calls';
COMMENT ON TABLE render_queue IS 'Queue for video rendering jobs';
COMMENT ON TABLE caption_exports IS 'History of caption exports';

COMMENT ON COLUMN background_jobs.type IS 'Type of job: auto-caption, background-removal, scene-detection, etc.';
COMMENT ON COLUMN background_jobs.status IS 'Job status: pending, processing, completed, failed, cancelled';
COMMENT ON COLUMN background_jobs.progress IS 'Progress percentage (0-100)';

COMMENT ON COLUMN mask_keyframes.easing IS 'Easing function: linear, ease-in, ease-out, ease-in-out, bezier';
COMMENT ON COLUMN mask_keyframes.bezier_points IS 'Bezier control points for custom easing';

COMMENT ON COLUMN preview_cache.preview_type IS 'Type of preview: thumbnail, before-after, mask, etc.';
COMMENT ON COLUMN preview_cache.expires_at IS 'When this preview should be deleted';

-- ============================================
-- INITIAL DATA
-- ============================================

-- None required for this migration

-- ============================================
-- GRANTS
-- ============================================

-- Grant permissions (adjust based on your user setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON background_jobs TO video_editor_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON mask_keyframes TO video_editor_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON preview_cache TO video_editor_app;
-- GRANT SELECT, INSERT ON ai_service_logs TO video_editor_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON render_queue TO video_editor_app;
-- GRANT SELECT, INSERT ON caption_exports TO video_editor_app;