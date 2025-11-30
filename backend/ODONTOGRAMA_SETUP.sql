-- =================================================================
-- SCRIPT DE CONFIGURACIÓN DEL ODONTOGRAMA (EJECUTAR EN POSTGRESQL)
-- =================================================================

BEGIN;

-- 1. Crear tabla principal de registros de odontograma
CREATE TABLE IF NOT EXISTS odontograma_registros (
    id SERIAL PRIMARY KEY,
    atencion_id INTEGER NOT NULL REFERENCES atenciones(id) ON DELETE CASCADE,
    fecha_registro TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    observaciones_generales TEXT,
    
    -- Auditoría
    created_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL,
    updated_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Crear tabla de detalles por diente (usando JSONB para las superficies)
CREATE TABLE IF NOT EXISTS odontograma_dientes (
    id SERIAL PRIMARY KEY,
    odontograma_registro_id INTEGER NOT NULL REFERENCES odontograma_registros(id) ON DELETE CASCADE,
    
    numero_diente VARCHAR(5) NOT NULL, -- Ej: '11', '48', '85'
    tipo_diente VARCHAR(20) NOT NULL,  -- 'permanente' o 'deciduo'
    estado_general VARCHAR(50),        -- 'sano', 'ausente', 'caries', etc.
    
    -- Aquí se guardan las caries/restauraciones por cara: { "occlusal": ["caries"], "distal": ["restauracion"] }
    condiciones_superficies JSONB, 
    
    observaciones_diente TEXT,
    
    -- Evitar duplicados del mismo diente en un mismo registro
    UNIQUE (odontograma_registro_id, numero_diente)
);

-- 3. Crear índices para mejorar la velocidad de carga del historial
CREATE INDEX IF NOT EXISTS idx_odontograma_atencion ON odontograma_registros(atencion_id);
CREATE INDEX IF NOT EXISTS idx_odontograma_dientes_registro ON odontograma_dientes(odontograma_registro_id);

COMMIT;
