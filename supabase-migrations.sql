-- Rodar no Supabase SQL Editor (em ordem)

-- 1. Cardápio nos venues
ALTER TABLE venues ADD COLUMN IF NOT EXISTS menu JSONB;

-- 2. Curtidas nos posts
CREATE TABLE IF NOT EXISTS post_likes (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes visíveis para todos" ON post_likes FOR SELECT USING (true);
CREATE POLICY "Usuário gerencia próprios likes" ON post_likes FOR ALL USING (auth.uid() = user_id);

-- 3. Comentários nos posts
CREATE TABLE IF NOT EXISTS post_comments (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comentários visíveis para todos" ON post_comments FOR SELECT USING (true);
CREATE POLICY "Usuário insere próprios comentários" ON post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário deleta próprios comentários" ON post_comments FOR DELETE USING (auth.uid() = user_id);

-- Exemplo de cardápio para testar (trocar o id pelo id real do venue):
-- UPDATE venues SET menu = '[
--   {"name": "Heineken Long Neck", "price": "R$15", "category": "Bebidas"},
--   {"name": "Caipirinha", "price": "R$18", "category": "Drinks"},
--   {"name": "Porcão de Frango", "price": "R$28", "category": "Petiscos"}
-- ]'::jsonb WHERE id = 1;
