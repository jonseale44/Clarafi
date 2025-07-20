-- Blog/Article System Tables

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  author_name TEXT DEFAULT 'Clarafi Team',
  featured_image TEXT,
  meta_title TEXT,
  meta_description TEXT,
  keywords TEXT[],
  target_audience TEXT,
  reading_time INTEGER,
  view_count INTEGER DEFAULT 0,
  published_at TIMESTAMP,
  scheduled_for TIMESTAMP,
  generated_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  reviewed_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Article revisions table
CREATE TABLE IF NOT EXISTS article_revisions (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  revision_note TEXT,
  revision_type TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Article comments table
CREATE TABLE IF NOT EXISTS article_comments (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  content TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT false,
  parent_id INTEGER REFERENCES article_comments(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Article generation queue table
CREATE TABLE IF NOT EXISTS article_generation_queue (
  id SERIAL PRIMARY KEY,
  topic TEXT,
  category TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  keywords TEXT[],
  competitor_mentions TEXT[],
  research_sources JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  generated_article_id INTEGER REFERENCES articles(id),
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- Newsletter subscribers table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  subscribed_at TIMESTAMP DEFAULT NOW(),
  unsubscribed_at TIMESTAMP,
  preferences JSONB,
  source TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
CREATE INDEX IF NOT EXISTS idx_article_comments_article_id ON article_comments(article_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_approved ON article_comments(is_approved);
CREATE INDEX IF NOT EXISTS idx_article_revisions_article_id ON article_revisions(article_id);
CREATE INDEX IF NOT EXISTS idx_generation_queue_status ON article_generation_queue(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);