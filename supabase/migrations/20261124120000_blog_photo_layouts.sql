-- Blog photo layouts (Kay approved the mock-up 2026-11-24, local/design/blog-layout-mockup.html) plus a video / reel.
-- Additive: every column has a default or is nullable, so the current site keeps working. Safe to run more than once.
-- Run after 20261122000000_portfolio_blog_link.sql. Applied to production with Kay's OK on 2026-11-24.
-- Grants: public.blogs has table-level grants (20261028000000_grants_baseline.sql); anon reads the new columns of
-- published rows through the existing RLS policy. No new policy needed.
--
-- photo_layout   'A' = header photo (one, full width under the title), 'B' = middle pair (two, side by side mid-article),
--                'none' = text only. Existing posts get 'A' and show their cover image as the header (Kay, 2026-11-24).
-- layout_photos  The A / B photos, in order: [{ "url", "alt", "caption" }] (A uses the first; empty = the cover image).
-- slideshow      Photo row ("Mga larawan"): [{ "url", "alt", "caption" }]. Caption required to publish; alt may be empty
--                when the caption describes the photo.
-- video_*        An MP4 / WebM in our Storage, a poster still (WebP from the media library) and a transcript.
--
-- Rollback (removes every post's layout choice, photos and video links; files stay in Storage):
--   alter table public.blogs
--     drop column if exists photo_layout, drop column if exists layout_photos, drop column if exists slideshow,
--     drop column if exists video_url, drop column if exists video_poster_url, drop column if exists video_transcript;

alter table public.blogs
	add column if not exists photo_layout text not null default 'A' check (photo_layout in ('A', 'B', 'none')),
	add column if not exists layout_photos jsonb not null default '[]'::jsonb
		check (jsonb_typeof(layout_photos) = 'array' and jsonb_array_length(layout_photos) <= 2),
	add column if not exists slideshow jsonb not null default '[]'::jsonb
		check (jsonb_typeof(slideshow) = 'array' and jsonb_array_length(slideshow) <= 40),
	add column if not exists video_url text check (char_length(video_url) <= 1000),
	add column if not exists video_poster_url text check (char_length(video_poster_url) <= 1000),
	add column if not exists video_transcript text check (char_length(video_transcript) <= 5000);

notify pgrst, 'reload schema';
