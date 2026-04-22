-- V28 Migration: Add Legal Versioning System

-- Add accepted_legal_version column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS accepted_legal_version INTEGER DEFAULT 1;

-- If you have any existing users who you want to force to accept the new terms, you can reset them:
-- UPDATE public.profiles SET accepted_legal_version = 1;
