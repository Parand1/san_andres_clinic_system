-- Script para crear tabla de Tarifario y Servicios v2 (Precios corregidos)
-- Ejecutar en la base de datos 'clinic_db'

BEGIN;

-- Tabla para el tarifario de servicios
CREATE TABLE IF NOT EXISTS tarifario (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'Consulta', -- 'Consulta', 'Procedimiento', 'Insumo', 'Otro'
    especialidad_id INTEGER REFERENCES especialidades(id) ON DELETE SET NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insertar datos iniciales (Seed Data) con precios específicos
INSERT INTO tarifario (nombre, precio, tipo, especialidad_id)
VALUES 
-- Consultas
('Consulta Medicina General', 20.00, 'Consulta', (SELECT id FROM especialidades WHERE nombre = 'Medicina General')),
('Consulta Ginecología', 25.00, 'Consulta', (SELECT id FROM especialidades WHERE nombre = 'Ginecologia')),
('Consulta Pediatría', 30.00, 'Consulta', (SELECT id FROM especialidades WHERE nombre = 'Pediatria')),
('Consulta Psicología (Primera vez)', 30.00, 'Consulta', (SELECT id FROM especialidades WHERE nombre = 'Psicologia')),
('Consulta Psicología (Subsecuente)', 20.00, 'Consulta', (SELECT id FROM especialidades WHERE nombre = 'Psicologia')),
('Consulta Traumatología', 30.00, 'Consulta', (SELECT id FROM especialidades WHERE nombre = 'Traumatologia')),
('Consulta Cardiología', 30.00, 'Consulta', (SELECT id FROM especialidades WHERE nombre = 'Cardiologia')),
('Consulta Odontología', 20.00, 'Consulta', (SELECT id FROM especialidades WHERE nombre = 'Odontologia')),

-- Procedimientos Generales y Enfermería
('Glicemia', 2.00, 'Procedimiento', NULL),
('Inyección Intramuscular', 2.00, 'Procedimiento', NULL),
('Inyección Intravenosa', 5.00, 'Procedimiento', NULL),
('Toma de Presión Arterial', 1.00, 'Procedimiento', NULL),
('Nebulización', 2.00, 'Procedimiento', NULL),
('Peso y Talla', 1.00, 'Procedimiento', NULL),
('Sutura', 30.00, 'Procedimiento', NULL),
('Lavado de Oído', 30.00, 'Procedimiento', NULL),
('Cambio de Sonda Vesical', 15.00, 'Procedimiento', NULL),

-- Procedimientos Especializados
('Papanicolaou', 13.00, 'Procedimiento', (SELECT id FROM especialidades WHERE nombre = 'Ginecologia')),
('Electrocardiograma', 25.00, 'Procedimiento', (SELECT id FROM especialidades WHERE nombre = 'Cardiologia')),

-- Sueros / Tratamientos
('Suero Multivitaminas', 35.00, 'Procedimiento', NULL),
('Suero Megadosis Vitamina C', 30.00, 'Procedimiento', NULL),
('Suero Calcio + Vitamina B', 20.00, 'Procedimiento', NULL),

-- Odontología (Precios base de ejemplo, se pueden editar)
('Limpieza Dental (Profilaxis)', 30.00, 'Procedimiento', (SELECT id FROM especialidades WHERE nombre = 'Odontologia'))

ON CONFLICT DO NOTHING;

COMMIT;
