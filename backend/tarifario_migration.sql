-- Script para crear tabla de Tarifario y Servicios
-- Ejecutar en la base de datos 'clinic_db'

BEGIN;

-- Tabla para el tarifario de servicios
CREATE TABLE IF NOT EXISTS tarifario (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'Consulta', -- 'Consulta', 'Procedimiento', 'Otro'
    especialidad_id INTEGER REFERENCES especialidades(id) ON DELETE SET NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insertar datos iniciales (Seed Data)
INSERT INTO tarifario (nombre, precio, tipo, especialidad_id)
VALUES 
('Consulta Medicina General', 20.00, 'Consulta', (SELECT id FROM especialidades WHERE nombre = 'Medicina General')),
('Consulta Ginecología', 25.00, 'Consulta', (SELECT id FROM especialidades WHERE nombre = 'Ginecologia')),
('Consulta Psicología (Primera vez)', 30.00, 'Consulta', (SELECT id FROM especialidades WHERE nombre = 'Psicologia')),
('Consulta Psicología (Subsecuente)', 20.00, 'Consulta', (SELECT id FROM especialidades WHERE nombre = 'Psicologia')),
('Consulta Pediatría', 25.00, 'Consulta', (SELECT id FROM especialidades WHERE nombre = 'Pediatria')),
('Consulta Odontología', 20.00, 'Consulta', (SELECT id FROM especialidades WHERE nombre = 'Odontologia')),
('Consulta Cardiología', 35.00, 'Consulta', (SELECT id FROM especialidades WHERE nombre = 'Cardiologia')),
('Limpieza Dental (Profilaxis)', 30.00, 'Procedimiento', (SELECT id FROM especialidades WHERE nombre = 'Odontologia')),
('Electrocardiograma', 15.00, 'Procedimiento', (SELECT id FROM especialidades WHERE nombre = 'Cardiologia'))
ON CONFLICT DO NOTHING;

COMMIT;
