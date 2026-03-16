-- Phase 1: Add AI narrative columns to review_records
ALTER TABLE review_records ADD COLUMN recap_narrative TEXT DEFAULT NULL;
ALTER TABLE review_records ADD COLUMN overview_narrative TEXT DEFAULT NULL;
ALTER TABLE review_records ADD COLUMN ai_generation_used INTEGER NOT NULL DEFAULT 0; -- 0=false, 1=true
