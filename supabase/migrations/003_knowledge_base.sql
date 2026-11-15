-- TikaTrack v12.0 - Knowledge Base Schema

-- ============================================
-- KNOWLEDGE SOURCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_bn TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN (
    'who',
    'dghs',
    'epi',
    'unicef',
    'medical_literature',
    'government',
    'educational'
  )),
  official_url TEXT,
  description TEXT,
  description_bn TEXT,
  authority_level TEXT DEFAULT 'secondary' CHECK (authority_level IN (
    'primary',
    'secondary',
    'tertiary'
  )),
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'bn', 'both')),
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- KNOWLEDGE ARTICLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  
  -- Content
  title TEXT NOT NULL,
  title_bn TEXT,
  content TEXT NOT NULL,
  content_bn TEXT,
  
  -- Classification
  topic TEXT NOT NULL CHECK (topic IN (
    'vaccine_info',
    'schedule',
    'side_effects',
    'contraindications',
    'disease_info',
    'centre_info',
    'general_guidance',
    'safety'
  )),
  vaccine_ids TEXT[],
  age_groups TEXT[],
  
  -- Metadata
  original_url TEXT,
  publication_date DATE,
  last_verified DATE,
  content_version INTEGER DEFAULT 1,
  
  -- Status
  review_status TEXT DEFAULT 'pending' CHECK (review_status IN (
    'pending',
    'under_review',
    'approved',
    'outdated',
    'removed'
  )),
  reviewed_by UUID REFERENCES user_profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  
  -- Quality
  confidence_score DECIMAL(3,2) DEFAULT 0.5,
  citation_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- KNOWLEDGE CHUNKS TABLE (for RAG)
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES knowledge_articles(id) ON DELETE CASCADE,
  
  -- Chunk content
  chunk_text TEXT NOT NULL,
  chunk_text_bn TEXT,
  chunk_index INTEGER NOT NULL,
  
  -- Embedding (stored as JSON for simplicity, in production use pgvector)
  embedding JSONB,
  
  -- Metadata
  token_count INTEGER,
  char_count INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CHAT CONVERSATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Conversation metadata
  title TEXT,
  context JSONB DEFAULT '{}',
  
  -- Personalization
  family_id UUID REFERENCES families(id),
  child_id UUID REFERENCES child_profiles(id),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CHAT MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  
  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  content_bn TEXT,
  
  -- RAG metadata
  retrieved_chunks UUID[] DEFAULT '{}',
  sources_used UUID[] DEFAULT '{}',
  citations JSONB DEFAULT '[]',
  
  -- Quality metrics
  confidence_score DECIMAL(3,2),
  response_time_ms INTEGER,
  
  -- Feedback
  user_feedback TEXT CHECK (user_feedback IN ('helpful', 'not_helpful', NULL)),
  feedback_comment TEXT,
  
  -- Safety
  safety_flags TEXT[] DEFAULT '{}',
  requires_medical_attention BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CHAT SUGGESTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS chat_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Suggestion content
  question TEXT NOT NULL,
  question_bn TEXT,
  category TEXT CHECK (category IN (
    'age_specific',
    'vaccine_specific',
    'schedule',
    'safety',
    'centre',
    'general'
  )),
  
  -- Context
  vaccine_ids TEXT[],
  age_groups TEXT[],
  
  -- Usage
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_source ON knowledge_articles(source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_topic ON knowledge_articles(topic);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_status ON knowledge_articles(review_status);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_vaccine ON knowledge_articles USING GIN(vaccine_ids);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_article ON knowledge_chunks(article_id);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_active ON chat_conversations(is_active);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_suggestions_category ON chat_suggestions(category);
CREATE INDEX IF NOT EXISTS idx_chat_suggestions_active ON chat_suggestions(is_active);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_suggestions ENABLE ROW LEVEL SECURITY;

-- Knowledge sources: Public read, admin write
CREATE POLICY "Public can view approved sources"
  ON knowledge_sources FOR SELECT
  USING (is_approved = TRUE);

CREATE POLICY "Admins can manage sources"
  ON knowledge_sources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Knowledge articles: Public read for approved, admin write
CREATE POLICY "Public can view approved articles"
  ON knowledge_articles FOR SELECT
  USING (review_status = 'approved');

CREATE POLICY "Admins can manage articles"
  ON knowledge_articles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Knowledge chunks: Read with articles
CREATE POLICY "Public can view chunks of approved articles"
  ON knowledge_chunks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM knowledge_articles
      WHERE knowledge_articles.id = knowledge_chunks.article_id
      AND knowledge_articles.review_status = 'approved'
    )
  );

-- Chat conversations: User owns their conversations
CREATE POLICY "Users can view own conversations"
  ON chat_conversations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own conversations"
  ON chat_conversations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own conversations"
  ON chat_conversations FOR UPDATE
  USING (user_id = auth.uid());

-- Chat messages: User owns messages in their conversations
CREATE POLICY "Users can view messages in own conversations"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND chat_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations"
  ON chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND chat_conversations.user_id = auth.uid()
    )
  );

-- Chat suggestions: Public read
CREATE POLICY "Public can view active suggestions"
  ON chat_suggestions FOR SELECT
  USING (is_active = TRUE);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at
CREATE TRIGGER update_knowledge_sources_updated_at
  BEFORE UPDATE ON knowledge_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_articles_updated_at
  BEFORE UPDATE ON knowledge_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON chat_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to search knowledge articles
CREATE OR REPLACE FUNCTION search_knowledge_articles(
  search_query TEXT,
  topic_filter TEXT DEFAULT NULL,
  vaccine_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  title_bn TEXT,
  content TEXT,
  content_bn TEXT,
  topic TEXT,
  source_name TEXT,
  confidence_score DECIMAL,
  similarity DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ka.id,
    ka.title,
    ka.title_bn,
    ka.content,
    ka.content_bn,
    ka.topic,
    ks.name AS source_name,
    ka.confidence_score,
    -- Simple text similarity (in production, use vector similarity)
    CASE 
      WHEN ka.title ILIKE '%' || search_query || '%' THEN 1.0
      WHEN ka.content ILIKE '%' || search_query || '%' THEN 0.7
      ELSE 0.5
    END AS similarity
  FROM knowledge_articles ka
  JOIN knowledge_sources ks ON ks.id = ka.source_id
  WHERE ka.review_status = 'approved'
    AND ks.is_approved = TRUE
    AND (topic_filter IS NULL OR ka.topic = topic_filter)
    AND (vaccine_filter IS NULL OR vaccine_filter = ANY(ka.vaccine_ids))
  ORDER BY similarity DESC, ka.confidence_score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get conversation context
CREATE OR REPLACE FUNCTION get_conversation_context(conversation_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  context_data JSONB;
BEGIN
  SELECT jsonb_build_object(
    'conversation', jsonb_build_object(
      'id', cc.id,
      'title', cc.title,
      'family_id', cc.family_id,
      'child_id', cc.child_id
    ),
    'family', CASE 
      WHEN cc.family_id IS NOT NULL THEN (
        SELECT jsonb_build_object(
          'id', f.id,
          'name', f.name
        )
        FROM families f
        WHERE f.id = cc.family_id
      )
      ELSE NULL
    END,
    'child', CASE 
      WHEN cc.child_id IS NOT NULL THEN (
        SELECT jsonb_build_object(
          'id', cp.id,
          'name', cp.name,
          'date_of_birth', cp.date_of_birth
        )
        FROM child_profiles cp
        WHERE cp.id = cc.child_id
      )
      ELSE NULL
    END,
    'recent_messages', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'role', cm.role,
          'content', cm.content,
          'content_bn', cm.content_bn,
          'created_at', cm.created_at
        )
        ORDER BY cm.created_at DESC
        LIMIT 10
      )
      FROM chat_messages cm
      WHERE cm.conversation_id = cc.id
    )
  ) INTO context_data
  FROM chat_conversations cc
  WHERE cc.id = conversation_uuid;
  
  RETURN context_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TEXT IS 'TikaBot AI 2.0 knowledge base schema complete. Includes:
- Knowledge sources with approval workflow
- Knowledge articles with versioning and review
- Knowledge chunks for RAG
- Chat conversations with personalization
- Chat messages with citations and feedback
- Chat suggestions for guided conversations';
