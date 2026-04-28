-- Migration: Anti-deletion lock for coops with active jobs
CREATE OR REPLACE FUNCTION check_coop_active_jobs()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM jobs 
        WHERE coop_id = OLD.id 
        AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'No puedes eliminar la Coop mientras haya trabajos en curso. Finaliza o cancela los proyectos primero.'
        USING ERRCODE = 'P0001'; -- Custom application error code
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_prevent_coop_deletion ON coops;
CREATE TRIGGER tr_prevent_coop_deletion
BEFORE DELETE ON coops
FOR EACH ROW
EXECUTE FUNCTION check_coop_active_jobs();
