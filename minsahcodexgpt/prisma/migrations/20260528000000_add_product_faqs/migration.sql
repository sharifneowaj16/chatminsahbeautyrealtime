-- Add faqs JSON field to Product table
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "faqs" JSONB;

-- Comment: faqs field stores array of {question, answer} objects
-- Example: [{"question": "...", "answer": "..."}, ...]
