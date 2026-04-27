import { useAuth } from '../features/auth/context/AuthContext';
import { isUserBlocked } from '../services/safetyService';

const ProfileSwitcher = () => {
    const { id } = useParams();
    const { user: currentUser } = useAuth();
    const [role, setRole] = useState(null);
    const [isBlocked, setIsBlocked] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfileData = async () => {
            setLoading(true);
            try {
                // 1. Check if blocked
                if (currentUser && currentUser.id !== id) {
                    const blocked = await isUserBlocked(currentUser.id, id);
                    if (blocked) {
                        setIsBlocked(true);
                        setLoading(false);
                        return;
                    }
                }

                // 2. Fetch role
                const { data, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', id)
                    .single();

                if (error) {
                    console.error('[ProfileSwitcher] Error fetching role:', error);
                    setRole('freelancer');
                } else {
                    setRole(data?.role || 'freelancer');
                }
            } catch (err) {
                console.error('[ProfileSwitcher] Exception:', err);
                setRole('freelancer');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchProfileData();
    }, [id, currentUser]);

    if (loading) {
        return (
            <div className="container" style={{ 
                height: '80vh', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'var(--text-secondary)'
            }}>
                <div className="loader-spinner"></div>
                <span style={{ marginLeft: '1rem' }}>Cargando perfil...</span>
            </div>
        );
    }

    if (isBlocked) {
        return (
            <div className="container" style={{ 
                height: '70vh', 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🔒</div>
                <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '1rem' }}>Acceso Restringido</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '400px' }}>
                    Este usuario te ha bloqueado y no puedes ver su perfil ni interactuar con él por seguridad.
                </p>
                <button 
                    onClick={() => window.history.back()} 
                    className="btn-primary" 
                    style={{ marginTop: '2rem', padding: '1rem 2rem', borderRadius: '16px' }}
                >
                    Volver atrás
                </button>
            </div>
        );
    }

    // Dynamic routing based on role
    if (role === 'company') {
        return <CompanyDetail />;
    } else if (role === 'buyer' || role === 'client') {
        return <ClientDetail />;
    } else {
        // Defaults to freelancer if role is freelancer or anything else
        return <FreelancerDetail />;
    }
};

export default ProfileSwitcher;
