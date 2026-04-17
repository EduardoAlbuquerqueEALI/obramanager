ALTER TYPE solicitacao_status ADD VALUE IF NOT EXISTS 'em_cotacao';
ALTER TYPE solicitacao_status ADD VALUE IF NOT EXISTS 'entregue';
ALTER TABLE solicitacoes_compra ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb;
