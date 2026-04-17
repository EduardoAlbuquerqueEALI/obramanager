-- Migration 0006: replace sales statuses on unidades with construction statuses
-- Old: available, sold, reserved, delivered
-- New: pendente, em_andamento, concluida, entregue

-- 1. Create new enum
CREATE TYPE unidade_construction_status AS ENUM (
  'pendente',
  'em_andamento',
  'concluida',
  'entregue'
);

-- 2. Drop the default (which references old enum)
ALTER TABLE unidades ALTER COLUMN status DROP DEFAULT;

-- 3. Migrate column to new enum (mapping old → new)
ALTER TABLE unidades
  ALTER COLUMN status TYPE unidade_construction_status
  USING (
    CASE status::text
      WHEN 'available'  THEN 'pendente'
      WHEN 'sold'       THEN 'em_andamento'
      WHEN 'reserved'   THEN 'em_andamento'
      WHEN 'delivered'  THEN 'entregue'
      ELSE 'pendente'
    END
  )::unidade_construction_status;

-- 4. Set new default
ALTER TABLE unidades ALTER COLUMN status SET DEFAULT 'pendente';

-- 5. Drop old enum
DROP TYPE unidade_status;
