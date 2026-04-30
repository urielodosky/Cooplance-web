-- Migration: v64_coop_member_threshold
-- Description: Implementa un trigger de seguridad que elimina servicios, cancela postulaciones y rechaza pedidos si la cantidad de miembros activos de una agencia cae por debajo de 2 (es decir, solo queda 1 miembro).

CREATE OR REPLACE FUNCTION enforce_coop_member_threshold()
RETURNS TRIGGER AS $$
DECLARE
    active_members_count INT;
    target_coop_id UUID;
BEGIN
    -- Determinar el ID de la coop afectada
    IF TG_OP = 'DELETE' THEN
        target_coop_id := OLD.coop_id;
    ELSE
        target_coop_id := NEW.coop_id;
    END IF;

    -- Contar miembros activos restantes (excluyendo los que se fueron/fueron expulsados)
    SELECT COUNT(*)
    INTO active_members_count
    FROM coop_members
    WHERE coop_id = target_coop_id AND status != 'left';

    -- Si la agencia se queda con 1 (o 0) miembros, aplicar sistema de seguridad
    IF active_members_count < 2 THEN
        -- 1. Eliminar todos los servicios de la agencia
        -- (Los servicios de agencia guardan el teamId en el config JSONB)
        DELETE FROM services 
        WHERE config->>'teamId' = target_coop_id::text;
        
        -- 2. Cancelar todas las postulaciones enviadas que estén pendientes o activas
        UPDATE proposals 
        SET status = 'cancelled' 
        WHERE team_id = target_coop_id AND status IN ('pending', 'active');
        
        -- 3. Rechazar todos los pedidos entrantes pendientes de aprobación
        UPDATE jobs 
        SET status = 'rejected' 
        WHERE team_id = target_coop_id AND status IN ('pending', 'pending_approval');
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Asegurarnos de limpiar el trigger si existía antes
DROP TRIGGER IF EXISTS coop_member_threshold_trigger ON coop_members;

-- Crear el trigger para que se dispare después de un update o delete
CREATE TRIGGER coop_member_threshold_trigger
AFTER UPDATE OR DELETE ON coop_members
FOR EACH ROW
EXECUTE FUNCTION enforce_coop_member_threshold();
