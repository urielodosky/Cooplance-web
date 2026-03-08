export const seedDatabase = () => {
    // Check if data already exists to avoid overwriting user progress
    const existingUsers = localStorage.getItem('cooplance_db_users');
    if (existingUsers && JSON.parse(existingUsers).length > 0) {
        console.log("Database already seeded. Skipping overwrite.");
        return;
    }

    console.log("Seeding database with mock data...");

    // 1. Mock Users (Freelancers, Companies, Buyers)
    const users = [
        {
            id: 101,
            username: "ana_design",
            email: "ana@design.com",
            role: "freelancer",
            firstName: "Ana",
            lastName: "García",
            bio: "Diseñadora Gráfica con 5 años de experiencia en branding y UI/UX.",
            location: "Buenos Aires, Argentina",
            country: "Argentina",
            xp: 1200,
            level: 3,
            gamification: { credits: 2, level: 3 },
            rating: 4.8,
            reviewsCount: 12
        },
        {
            id: 102,
            username: "dev_carlos",
            email: "carlos@dev.com",
            role: "freelancer",
            firstName: "Carlos",
            lastName: "Rodríguez",
            bio: "Desarrollador Full Stack MERN. Apasionado por el código limpio.",
            location: "Medellín, Colombia",
            country: "Colombia",
            xp: 4500,
            level: 10,
            gamification: { credits: 5, level: 12 },
            rating: 5.0,
            reviewsCount: 8
        },
        {
            id: 103,
            username: "mario_fix",
            email: "mario@fix.com",
            role: "freelancer",
            firstName: "Mario",
            lastName: "Gómez",
            bio: "Técnico especialista en hardware y redes. Reparaciones a domicilio.",
            location: "Bogotá, Colombia",
            country: "Colombia",
            xp: 800,
            level: 2,
            gamification: { credits: 1, level: 2 },
            rating: 4.7,
            reviewsCount: 22
        },
        {
            id: 201,
            username: "tech_solutions",
            email: "contact@techsolutions.com",
            role: "company",
            companyName: "Tech Solutions Ltd.",
            responsibleName: "Marcos Pérez",
            bio: "Empresa líder en soluciones tecnológicas para startups.",
            location: "Ciudad de México, México",
            workMode: 'remote', // ADDED
            country: "México",
            xp: 1500,
            level: 5,
            rating: 4.9,
            reviewsCount: 15
        },
        {
            id: 202,
            username: "green_marketing",
            email: "hello@greenmarketing.com",
            role: "company",
            companyName: "Green Marketing",
            responsibleName: "Lucía Fernández",
            bio: "Agencia de marketing digital enfocada en sustentabilidad.",
            location: "Santiago, Chile",
            workMode: 'remote', // ADDED
            country: "Chile",
            xp: 800,
            level: 2,
            rating: 4.5,
            reviewsCount: 8
        },
        {
            id: 203,
            username: "eventos_deluxe",
            email: "info@eventosdeluxe.com",
            role: "company",
            companyName: "Eventos Deluxe",
            responsibleName: "Roberto Díaz",
            bio: "Organización integral de eventos corporativos y sociales.",
            location: "Buenos Aires, Argentina",
            workMode: 'presential', // ADDED
            country: "Argentina",
            xp: 2200,
            level: 7,
            rating: 4.2,
            reviewsCount: 4
        },
        {
            id: 204,
            username: "civilia_cons",
            email: "contacto@civilia.com",
            role: "company",
            companyName: "Constructora Civilia",
            responsibleName: "Arq. Laura M.",
            bio: "Constructora dedicada a obras civiles y remodelaciones.",
            location: "Lima, Perú",
            workMode: 'presential', // ADDED
            country: "Perú",
            xp: 3000,
            level: 9,
            rating: 5.0,
            reviewsCount: 2
        },
        {
            id: 301,
            username: "juan_buyer",
            email: "juan@gmail.com",
            role: "buyer",
            firstName: "Juan",
            lastName: "López",
            location: "Lima, Perú",
            country: "Perú",
            xp: 0,
            level: 1,
            rating: 4.8,
            reviewsCount: 6,
            paymentMethods: { card: true, paypal: true }
        }
    ].map(u => ({
        ...u,
        // Ensure everyone has at least one method for testing
        paymentMethods: u.paymentMethods || {
            card: true,
            paypal: Math.random() > 0.5,
            mercadopago: Math.random() > 0.5,
            binance: Math.random() > 0.7
        }
    }));

    // 2. Mock Services (4 items: 2 Remote, 2 Presential)
    const services = [
        // REMOTE 1
        {
            id: 1001,
            freelancerId: 101,
            freelancerName: "Ana García",
            title: "Diseño de Logo Profesional e Identidad de Marca",
            description: "Crearé un logo único y memorable para tu negocio, incluyendo guía de estilos y paleta de colores.",
            category: "Artes Gráficas y Diseño",
            price: 150,
            deliveryTime: 5,
            rating: 4.8,
            reviewsCount: 12,
            workMode: ['remote'],
            location: "Buenos Aires, Argentina",
            subcategories: ['Logo', 'Identidad Visual'], // ADDED
            tags: ['Branding', 'Vector', 'Illustrator'], // ADDED
            image: "https://images.unsplash.com/photo-1626785774573-4b799312c95d?auto=format&fit=crop&q=80&w=800",
            tiers: {
                Standard: { price: 150, desc: "Logo + Paleta de Colores", time: 5 },
                Premium: { price: 300, desc: "Identidad Completa + Social Media Kit", time: 10 }
            }
        },
        // REMOTE 2
        {
            id: 1002,
            freelancerId: 102,
            freelancerName: "Carlos Rodríguez",
            title: "Desarrollo de Sitio Web React Moderno",
            description: "Desarrollaré tu sitio web, landing page o portfolio usando React.js y Tailwind CSS.",
            category: "Programación y Tecnología",
            price: 500,
            deliveryTime: 10,
            rating: 5.0,
            reviewsCount: 8,
            workMode: ['remote'],
            location: "Medellín, Colombia",
            subcategories: ['Web Design', 'Landing Page'], // ADDED
            tags: ['Frontend', 'JavaScript', 'CSS'], // ADDED
            image: "https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&q=80&w=800",
            tiers: {
                Standard: { price: 500, desc: "Landing Page", time: 7 },
                Premium: { price: 1200, desc: "Sitio Completo", time: 14 }
            }
        },
        // PRESENTIAL 1
        {
            id: 1003,
            freelancerId: 101,
            freelancerName: "Ana García",
            title: "Sesión de Fotografía Corporativa",
            description: "Sesión de fotos profesional para tu equipo en tus oficinas. Incluye edición básica.",
            category: "Fotografía",
            price: 200,
            deliveryTime: 3,
            rating: 4.9,
            reviewsCount: 5,
            workMode: ['presential'],
            location: "Buenos Aires, Argentina",
            subcategories: ['Corporativa', 'Retrato'], // ADDED
            tags: ['Retrato', 'Edición', 'Iluminación'], // ADDED
            image: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=800"
        },
        // PRESENTIAL 2
        {
            id: 1004,
            freelancerId: 103, // Mario
            freelancerName: "Mario Gómez",
            title: "Mantenimiento y Reparación de PC a Domicilio",
            description: "Servicio técnico a domicilio para PC y Laptops. Limpieza, virus, formateo y upgrades.",
            category: "Soporte TI",
            price: 50,
            deliveryTime: 1,
            rating: 4.7,
            reviewsCount: 22,
            workMode: ['presential'],
            location: "Bogotá, Colombia",
            subcategories: ['Mantenimiento', 'Reparación'], // ADDED
            tags: ['Hardware', 'Windows', 'Redes'], // ADDED
            image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&q=80&w=800"
        }
    ];

    // 3. Mock Projects (2 Remote, 2 Presential)
    const projects = [
        // REMOTE 1
        {
            id: 5001,
            clientId: 201, // Tech Solutions
            clientName: "Tech Solutions Ltd.",
            clientAvatar: "",
            role: "company",
            title: "Desarrollador Backend Node.js para API",
            description: "Buscamos experto en Node.js para desarrollar una API RESTful escalable.",
            category: "Programación y Tecnología",
            budget: 2000,
            deadline: "2027-12-01",
            executionTime: null, // MUTUALLY EXCLUSIVE
            workMode: 'remote',
            location: "Ciudad de México, México",
            tags: ['Backend', 'Node.js', 'API'], // ADDED
            createdAt: new Date().toISOString(),
            status: "open"
        },
        // REMOTE 2
        {
            id: 5002,
            clientId: 301, // Juan Buyer
            clientName: "Juan López",
            clientAvatar: "",
            role: "buyer",
            title: "Transcripción de Entrevistas (Español)",
            description: "Tengo 5 horas de audio para transcribir. Necesito buena ortografía.",
            category: "Escritura",
            budget: 100,
            deadline: null, // MUTUALLY EXCLUSIVE
            executionTime: "1 semana",
            workMode: 'remote',
            location: "Lima, Perú", // Client loc
            tags: ['Redacción', 'SEO', 'Blogs'], // ADDED
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            status: "open"
        },
        // PRESENTIAL 1
        {
            id: 5003,
            clientId: 203, // Eventos Deluxe
            clientName: "Eventos Deluxe",
            clientAvatar: "",
            role: "company",
            title: "Fotógrafo para Evento Corporativo",
            description: "Buscamos fotógrafo para cubrir un evento de 4 horas este sábado en el centro.",
            category: "Fotografía y Video",
            budget: 300,
            deadline: "2027-05-20",
            executionTime: null, // MUTUALLY EXCLUSIVE
            workMode: 'presential',
            location: "Buenos Aires, Argentina",
            tags: ['Bodas', 'Eventos', 'Edición'], // ADDED
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
            status: "open"
        },
        // PRESENTIAL 2
        {
            id: 5004,
            clientId: 204, // Constructora Civilia
            clientName: "Constructora Civilia",
            clientAvatar: "",
            role: "company",
            title: "Instalación de Redes Estructuradas en Oficina",
            description: "Se requiere técnico para cableado estructurado en nuevas oficinas. Materiales provistos.",
            category: "Soporte TI",
            budget: 800,
            deadline: null, // MUTUALLY EXCLUSIVE
            executionTime: "3 días",
            workMode: 'presential',
            location: "Lima, Perú",
            tags: ['Redes', 'Cisco', 'Hardware'], // ADDED
            createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
            createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
            status: "open",
            paymentMethods: { card: true, mercadopago: true } // Specific requirement example
        }
    ].map(p => ({
        ...p,
        // specific methods or fallback to random if not set above (none set above except last one)
        paymentMethods: p.paymentMethods || {
            card: true,
            paypal: Math.random() > 0.5,
            mercadopago: Math.random() > 0.5,
            binance: Math.random() > 0.8
        }
    }));

    // Save to localStorage
    localStorage.setItem('cooplance_db_users', JSON.stringify(users));
    localStorage.setItem('cooplance_db_services', JSON.stringify(services));
    localStorage.setItem('cooplance_db_projects', JSON.stringify(projects));

    // Also init jobs (orders/contracts)
    // Create a mock active job
    const jobs = [
        {
            id: 9001,
            serviceId: 1001,
            serviceTitle: "Diseño de Logo Profesional",
            freelancerId: 101, // Ana (User we might be testing with if logged in as Ana)
            freelancerName: "Ana García",
            buyerId: 201,
            buyerName: "Tech Solutions Ltd.",
            amount: 150,
            status: "active",
            paymentMethod: "paypal",
            createdAt: new Date().toISOString(),
            deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        // Completed Jobs for History/Wallet Testing (Assuming user might be Ana or Carlos)
        {
            id: 9002,
            serviceId: 1001,
            serviceTitle: "Diseño de Logo (Startup)",
            freelancerId: 101,
            freelancerName: "Ana García",
            buyerId: 202,
            buyerName: "Green Marketing",
            amount: 200,
            status: "completed",
            paymentMethod: "paypal",
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 9003,
            serviceId: 1003,
            serviceTitle: "Sesión Fotos",
            freelancerId: 101,
            freelancerName: "Ana García",
            buyerId: 203,
            buyerName: "Eventos Deluxe",
            amount: 350,
            status: "completed",
            paymentMethod: "mercadopago",
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            deliveryResult: 'Entregado a tiempo'
        },
        {
            id: 9991, // Completed test job for job history 
            serviceId: 1001,
            serviceTitle: 'Creación de E-commerce Básico',
            freelancerId: 102, // Carlos
            freelancerName: 'Carlos Rodríguez',
            buyerId: 201, // Tech Solutions
            buyerName: 'Tech Solutions Ltd.',
            status: 'completed',
            deliveryResult: 'Entregado a tiempo',
            amount: 800,
            paymentMethod: "paypal",
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            deadline: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
            completedAt: new Date(Date.now() - 26 * 24 * 60 * 60 * 1000).toISOString(),
            duration: 5
        },
        {
            id: 9992, // Canceled test job for job history
            serviceId: 1001,
            serviceTitle: 'Consultoría en Diseño',
            freelancerId: 101, // Ana
            freelancerName: 'Ana García',
            buyerId: 201, // Tech Solutions
            buyerName: 'Tech Solutions Ltd.',
            status: 'canceled',
            deliveryResult: 'Cancelado',
            paymentMethod: "visa",
            amount: 150,
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            duration: 5
        },
        {
            id: 9993, // Active expired job
            serviceId: 1001,
            serviceTitle: 'Traducción de Documentos',
            freelancerId: 101, // Ana
            freelancerName: 'Ana García',
            buyerId: 201, // Tech Solutions
            buyerName: 'Tech Solutions Ltd.',
            status: 'in_progress',
            paymentMethod: "paypal",
            amount: 300,
            createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
            deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // expired 2 days ago
            duration: 13
        },
        {
            id: 9004,
            serviceId: 1001,
            serviceTitle: "Logo Redesign",
            freelancerId: 101,
            freelancerName: "Ana García",
            buyerId: 204,
            buyerName: "Constructora Civilia",
            amount: 600,
            status: "completed",
            paymentMethod: "binance", // Crypto payment
            createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
            completedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
        }
    ];
    localStorage.setItem('cooplance_db_jobs', JSON.stringify(jobs));

    console.log("Database seeded successfully!");
    // Force reload to pick up changes is usually needed, but generic context loads might catch it on mount if done early.
    // However, since we call this in App.jsx, contexts might have already initialized with empty arrays.
    // A location.reload() might be cleanest if we just seeded.
};
