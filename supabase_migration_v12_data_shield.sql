-- MIGRACIÓN V12: ESCUDO DE PROTECCIÓN DE DATOS
-- Este trigger impide que se guarden valores vacíos si la columna ya tiene datos.

CREATE OR REPLACE FUNCTION public.shield_profile_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Proteger First Name
    IF (NEW.first_name IS NULL OR NEW.first_name = '') AND (OLD.first_name IS NOT NULL AND OLD.first_name <> '') THEN
        NEW.first_name := OLD.first_name;
    END IF;

    -- Proteger Last Name
    IF (NEW.last_name IS NULL OR NEW.last_name = '') AND (OLD.last_name IS NOT NULL AND OLD.last_name <> '') THEN
        NEW.last_name := OLD.last_name;
    END IF;

    -- Proteger Username
    IF (NEW.username IS NULL OR NEW.username = '') AND (OLD.username IS NOT NULL AND OLD.username <> '') THEN
        NEW.username := OLD.username;
    END IF;

    -- Proteger Role (Vital para RLS)
    IF (NEW.role IS NULL OR NEW.role = '') AND (OLD.role IS NOT NULL AND OLD.role <> '') THEN
        NEW.role := OLD.role;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar el escudo antes de cada actualización
DROP TRIGGER IF EXISTS ensure_data_persistence ON public.profiles;
CREATE TRIGGER ensure_data_persistence
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.shield_profile_data();

-- NOTA: Esto garantiza que si la App envía datos vacíos por error, 
-- la base de datos ignore esos valores y mantenga los anteriores.
