-- Rodar no Supabase SQL Editor

-- Adiciona coluna de cardápio na tabela venues
ALTER TABLE venues ADD COLUMN IF NOT EXISTS menu JSONB;

-- Exemplo de cardápio para testar:
-- UPDATE venues SET menu = '[
--   {"name": "Heineken Long Neck", "price": "R$15", "category": "Bebidas"},
--   {"name": "Caipirinha", "price": "R$18", "category": "Drinks"},
--   {"name": "Porcão de Frango", "price": "R$28", "category": "Petiscos"}
-- ]' WHERE id = 1;
