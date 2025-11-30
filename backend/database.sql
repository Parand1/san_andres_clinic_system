-- =================================================================
-- ESQUEMA COMPLETO DE LA BASE DE DATOS - CENTRO MÉDICO SAN ANDRÉS
-- =================================================================

-- 1. TIPOS DE DATOS (ENUMs)
-- -----------------------------------------------------------------

-- Rol de usuario
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'profesional', 'secretaria');
    ELSE
        -- Si ya existe, aseguramos que tenga 'secretaria'
        ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'secretaria';
    END IF;
END$$;

-- Estados y Tipos nuevos
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_cita') THEN
        CREATE TYPE estado_cita AS ENUM ('Programada', 'Confirmada', 'Pagada', 'En Sala de Espera', 'Atendiendo', 'Completada', 'Cancelada', 'No Asistió');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_atencion') THEN
        CREATE TYPE tipo_atencion AS ENUM ('Primera Vez', 'Subsecuente');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'metodo_pago') THEN
        CREATE TYPE metodo_pago AS ENUM ('Efectivo', 'Tarjeta', 'Transferencia', 'Seguro');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_pago') THEN
        CREATE TYPE estado_pago AS ENUM ('Pendiente', 'Pagado', 'Abonado', 'Reembolsado');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_transaccion') THEN
        CREATE TYPE tipo_transaccion AS ENUM ('Apertura de Caja', 'Ingreso por Consulta', 'Ingreso Adicional', 'Egreso', 'Cierre de Caja');
    END IF;
END$$;


-- 2. TABLAS PRINCIPALES
-- -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS especialidades (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS profesionales (
    id SERIAL PRIMARY KEY,
    cedula VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol user_role NOT NULL DEFAULT 'profesional',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profesional_especialidades (
    profesional_id INTEGER NOT NULL REFERENCES profesionales(id) ON DELETE CASCADE,
    especialidad_id INTEGER NOT NULL REFERENCES especialidades(id) ON DELETE RESTRICT,
    PRIMARY KEY (profesional_id, especialidad_id)
);

CREATE TABLE IF NOT EXISTS pacientes (
    id SERIAL PRIMARY KEY,
    cedula VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE,
    genero VARCHAR(10),
    telefono VARCHAR(20),
    direccion VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    -- Auditoría
    created_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL,
    updated_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cie10_catalog (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    description TEXT NOT NULL
);


-- 3. MÓDULO DE AGENDAMIENTO Y CAJA
-- -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS citas (
    id SERIAL PRIMARY KEY,
    paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    profesional_id INTEGER NOT NULL REFERENCES profesionales(id) ON DELETE RESTRICT,
    fecha_hora_inicio TIMESTAMPTZ NOT NULL,
    fecha_hora_fin TIMESTAMPTZ NOT NULL,
    estado_cita estado_cita NOT NULL DEFAULT 'Programada',
    tipo_atencion tipo_atencion NOT NULL,
    notas_secretaria TEXT,
    -- atencion_id se crea después para referencia circular
    created_by_user_id INTEGER NOT NULL REFERENCES profesionales(id) ON DELETE RESTRICT,
    updated_by_user_id INTEGER REFERENCES profesionales(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pagos (
    id SERIAL PRIMARY KEY,
    cita_id INTEGER NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
    paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    monto_total DECIMAL(10, 2) NOT NULL,
    metodo_pago metodo_pago NOT NULL,
    estado_pago estado_pago NOT NULL DEFAULT 'Pendiente',
    fecha_pago TIMESTAMPTZ,
    registrado_por_user_id INTEGER NOT NULL REFERENCES profesionales(id) ON DELETE RESTRICT,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pagos_items (
    id SERIAL PRIMARY KEY,
    pago_id INTEGER NOT NULL REFERENCES pagos(id) ON DELETE CASCADE,
    descripcion VARCHAR(255) NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    monto_item DECIMAL(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS transacciones_caja (
    id SERIAL PRIMARY KEY,
    fecha TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tipo_transaccion tipo_transaccion NOT NULL,
    monto DECIMAL(10, 2) NOT NULL,
    metodo_pago metodo_pago,
    descripcion TEXT,
    usuario_id INTEGER NOT NULL REFERENCES profesionales(id) ON DELETE RESTRICT,
    pago_id INTEGER REFERENCES pagos(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS historial_auditoria (
    id BIGSERIAL PRIMARY KEY,
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL,
    entidad_afectada VARCHAR(50) NOT NULL,
    entidad_id INTEGER NOT NULL,
    accion VARCHAR(255) NOT NULL,
    detalles JSONB
);


-- 4. MÓDULO CLÍNICO (ATENCIONES Y DETALLES)
-- -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS atenciones (
    id SERIAL PRIMARY KEY,
    paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    profesional_id INTEGER NOT NULL REFERENCES profesionales(id) ON DELETE RESTRICT,
    cita_id INTEGER REFERENCES citas(id) ON DELETE SET NULL, 
    fecha_atencion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    motivo_consulta TEXT,
    notas_generales TEXT,
    procedimientos_adicionales_facturables TEXT,
    -- Auditoría
    created_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL,
    updated_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Completar referencia circular citas -> atenciones
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='citas' AND column_name='atencion_id') THEN
        ALTER TABLE citas ADD COLUMN atencion_id INTEGER REFERENCES atenciones(id) ON DELETE SET NULL;
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS diagnosticos (
    id SERIAL PRIMARY KEY,
    atencion_id INTEGER NOT NULL REFERENCES atenciones(id) ON DELETE CASCADE,
    cie10_id INTEGER NOT NULL REFERENCES cie10_catalog(id) ON DELETE RESTRICT,
    tipo_diagnostico VARCHAR(20) NOT NULL, 
    created_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL,
    updated_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS historia_clinica_detalles (
    id SERIAL PRIMARY KEY,
    atencion_id INTEGER NOT NULL REFERENCES atenciones(id) ON DELETE CASCADE,
    enfermedad_actual TEXT,
    revision_sistemas TEXT,
    examen_fisico TEXT,
    plan_diagnostico_terapeutico TEXT,
    created_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL,
    updated_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS antecedentes_medicos (
    id SERIAL PRIMARY KEY,
    paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    personales TEXT,
    familiares TEXT,
    quirurgicos TEXT,
    alergicos TEXT,
    farmacologicos TEXT,
    otros TEXT,
    created_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL,
    updated_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Módulo Odontología
CREATE TABLE IF NOT EXISTS odontograma_registros (
    id SERIAL PRIMARY KEY,
    atencion_id INTEGER NOT NULL REFERENCES atenciones(id) ON DELETE CASCADE,
    fecha_registro TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    observaciones_generales TEXT,
    created_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL,
    updated_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS odontograma_dientes (
    id SERIAL PRIMARY KEY,
    odontograma_registro_id INTEGER NOT NULL REFERENCES odontograma_registros(id) ON DELETE CASCADE,
    numero_diente VARCHAR(5) NOT NULL,
    tipo_diente VARCHAR(20) NOT NULL,
    estado_general VARCHAR(50),
    condiciones_superficies JSONB,
    observaciones_diente TEXT,
    UNIQUE (odontograma_registro_id, numero_diente)
);

-- Módulo Psicología
CREATE TABLE IF NOT EXISTS psicologia_evaluaciones (
    id SERIAL PRIMARY KEY,
    atencion_id INTEGER NOT NULL REFERENCES atenciones(id) ON DELETE CASCADE,
    motivo_consulta_psicologia TEXT,
    historia_psicologica TEXT,
    evaluacion_mental TEXT,
    impresion_diagnostica TEXT,
    plan_intervencion TEXT,
    created_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL,
    updated_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- INSERTS DE DATOS BASE
INSERT INTO especialidades (nombre) VALUES
('Medicina General'),
('Ginecologia'),
('Pediatria'),
('Psicologia'),
('Cardiologia'),
('Traumatologia'),
('Neumologia'),
('Medicina Estetica'),
('Radiologia'),
('Odontologia')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO cie10_catalog (code, description) VALUES
('A00', 'Cólera'),
('B00', 'Infecciones por virus del herpes'),
('C00', 'Tumor maligno del labio'),
('D50', 'Anemia por deficiencia de hierro'),
('E10', 'Diabetes mellitus insulinodependiente'),
('F32', 'Episodio depresivo'),
('G43', 'Migraña'),
('I10', 'Hipertensión esencial (primaria)'),
('J09', 'Influenza debida a virus de influenza aviar'),
('K02', 'Caries dental'),
('M15', 'Poliartrosis'),
('N20', 'Cálculo del riñón y del uréter'),
('O00', 'Embarazo ectópico'),
('P07', 'Trastornos relacionados con la gestación corta y con bajo peso al nacer'),
('R51', 'Cefalea'),
('S00', 'Traumatismo superficial de la cabeza'),
('T00', 'Traumatismos que afectan múltiples regiones del cuerpo'),
('Z00', 'Examen médico general')
ON CONFLICT (code) DO NOTHING;