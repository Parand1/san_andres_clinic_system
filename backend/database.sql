-- Creamos un tipo personalizado para los roles de user_role
CREATE TYPE user_role AS ENUM ('admin', 'profesional');

-- Tabla para almacenar las especialidades médicas
CREATE TABLE especialidades (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT
);

-- Tabla para almacenar los datos de los profesionales de la salud
CREATE TABLE profesionales (
    id SERIAL PRIMARY KEY,
    cedula VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol user_role NOT NULL DEFAULT 'profesional',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de unión para la relación muchos-a-muchos entre profesionales y especialidades
CREATE TABLE profesional_especialidades (
    profesional_id INTEGER NOT NULL REFERENCES profesionales(id) ON DELETE CASCADE,
    especialidad_id INTEGER NOT NULL REFERENCES especialidades(id) ON DELETE RESTRICT,
    PRIMARY KEY (profesional_id, especialidad_id)
);

-- Tabla para almacenar los datos de los pacientes
-- Si la tabla ya existe, usaremos ALTER TABLE para añadir las nuevas columnas
-- Si no existe, se creará con estas columnas
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
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Añadir columnas de auditoría si no existen
DO $$ BEGIN
    BEGIN
        ALTER TABLE pacientes ADD COLUMN created_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL;
    EXCEPTION
        WHEN duplicate_column THEN RAISE NOTICE 'column created_by_professional_id already exists in pacientes.';
    END;
    BEGIN
        ALTER TABLE pacientes ADD COLUMN updated_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL;
    EXCEPTION
        WHEN duplicate_column THEN RAISE NOTICE 'column updated_by_professional_id already exists in pacientes.';
    END;
    BEGIN
        ALTER TABLE pacientes ADD COLUMN updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    EXCEPTION
        WHEN duplicate_column THEN RAISE NOTICE 'column updated_at already exists in pacientes.';
    END;
END $$;

-- Tabla para registrar cada atención o consulta de un paciente
CREATE TABLE atenciones (
    id SERIAL PRIMARY KEY,
    paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    profesional_id INTEGER NOT NULL REFERENCES profesionales(id) ON DELETE RESTRICT,
    fecha_atencion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    motivo_consulta TEXT,
    notas_generales TEXT,
    -- Campos de auditoría
    created_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL,
    updated_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Nueva Tabla para el catálogo oficial de códigos CIE-10
CREATE TABLE cie10_catalog (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    description TEXT NOT NULL
);

-- Modificación de la tabla diagnosticos para referenciar cie10_catalog
-- Primero, si la tabla diagnosticos ya existe, necesitamos eliminarla temporalmente
-- o eliminar las columnas cie10_code y descripcion si ya existen
-- Para simplificar, asumiremos que podemos recrear la tabla si es necesario,
-- o que las columnas no existen aún.
-- Si ya existe, usaremos ALTER TABLE para añadir la nueva columna y eliminar las viejas.

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'diagnosticos') THEN
        -- Añadir la nueva columna cie10_id si no existe
        BEGIN
            ALTER TABLE diagnosticos ADD COLUMN cie10_id INTEGER REFERENCES cie10_catalog(id) ON DELETE RESTRICT;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column cie10_id already exists in diagnosticos.';
        END;
        -- Eliminar las columnas viejas si existen y no son necesarias
        BEGIN
            ALTER TABLE diagnosticos DROP COLUMN cie10_code;
        EXCEPTION
            WHEN undefined_column THEN RAISE NOTICE 'column cie10_code does not exist in diagnosticos.';
        END;
        BEGIN
            ALTER TABLE diagnosticos DROP COLUMN descripcion;
        EXCEPTION
            WHEN undefined_column THEN RAISE NOTICE 'column descripcion does not exist in diagnosticos.';
        END;
    ELSE
        -- Si la tabla diagnosticos no existe, la creamos con la nueva estructura
        CREATE TABLE diagnosticos (
            id SERIAL PRIMARY KEY,
            atencion_id INTEGER NOT NULL REFERENCES atenciones(id) ON DELETE CASCADE,
            cie10_id INTEGER NOT NULL REFERENCES cie10_catalog(id) ON DELETE RESTRICT, -- Referencia al catálogo
            tipo_diagnostico VARCHAR(20) NOT NULL, -- 'presuntivo' o 'definitivo'
            -- Campos de auditoría
            created_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL,
            updated_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
    END IF;
END $$;

-- Tabla para detalles generales de la historia clínica (Formato 002)
CREATE TABLE historia_clinica_detalles (
    id SERIAL PRIMARY KEY,
    atencion_id INTEGER NOT NULL REFERENCES atenciones(id) ON DELETE CASCADE,
    enfermedad_actual TEXT,
    revision_sistemas TEXT,
    examen_fisico TEXT,
    plan_diagnostico_terapeutico TEXT,
    -- Campos de auditoría
    created_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL,
    updated_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para antecedentes médicos del paciente (vinculada al paciente, no a la atención)
CREATE TABLE antecedentes_medicos (
    id SERIAL PRIMARY KEY,
    paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    personales TEXT,
    familiares TEXT,
    quirurgicos TEXT,
    alergicos TEXT,
    farmacologicos TEXT,
    otros TEXT,
    -- Campos de auditoría
    created_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL,
    updated_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabla principal para cada registro de odontograma asociado a una atención
CREATE TABLE odontograma_registros (
    id SERIAL PRIMARY KEY,
    atencion_id INTEGER NOT NULL REFERENCES atenciones(id) ON DELETE CASCADE,
    fecha_registro TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    observaciones_generales TEXT,
    -- Campos de auditoría
    created_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL,
    updated_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para almacenar el estado de cada diente dentro de un registro de odontograma
-- Usaremos JSONB para almacenar las condiciones de las superficies de forma flexible
CREATE TABLE odontograma_dientes (
    id SERIAL PRIMARY KEY,
    odontograma_registro_id INTEGER NOT NULL REFERENCES odontograma_registros(id) ON DELETE CASCADE,
    numero_diente VARCHAR(5) NOT NULL, -- Ej: '11', '51'
    tipo_diente VARCHAR(10) NOT NULL, -- 'permanente' o 'deciduo'
    estado_general VARCHAR(50), -- Ej: 'sano', 'ausente', 'erupcionando', 'retenido', 'restaurado'
    -- condiciones_superficies JSONB: Almacenará un objeto JSON con el estado de cada superficie
    -- Ejemplo: { "occlusal": ["caries", "restauracion"], "mesial": ["fractura"] }
    condiciones_superficies JSONB,
    observaciones_diente TEXT,
    UNIQUE (odontograma_registro_id, numero_diente) -- Un diente solo puede aparecer una vez por registro de odontograma
);

-- Tabla para evaluaciones de psicología
CREATE TABLE psicologia_evaluaciones (
    id SERIAL PRIMARY KEY,
    atencion_id INTEGER NOT NULL REFERENCES atenciones(id) ON DELETE CASCADE,
    motivo_consulta_psicologia TEXT,
    historia_psicologica TEXT,
    evaluacion_mental TEXT,
    impresion_diagnostica TEXT,
    plan_intervencion TEXT,
    -- Campos de auditoría
    created_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL,
    updated_by_professional_id INTEGER REFERENCES profesionales(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Precargar especialidades si no existen
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

-- Precargar algunos códigos CIE-10 de ejemplo si no existen
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
