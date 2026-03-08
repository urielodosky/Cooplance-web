
export const getMockReviews = (users, services) => {
    // Generate reviews based on existing users and services
    const reviews = [
        {
            id: 1,
            serviceId: 1001,
            reviewerId: 201, // Tech Solutions
            reviewerName: "Tech Solutions Ltd.",
            recipientId: 101, // Ana
            rating: 5,
            comment: "Increíble trabajo de branding. Entendió perfectamente nuestra visión.",
            date: "2023-11-10",
            role: "company"
        },
        {
            id: 2,
            serviceId: 1001,
            reviewerId: 301, // Juan Buyer
            reviewerName: "Juan López",
            recipientId: 101, // Ana
            rating: 4,
            comment: "Muy buen diseño, aunque demoró un poco más de lo esperado en la entrega final.",
            date: "2023-12-05",
            role: "buyer"
        },
        {
            id: 3,
            serviceId: 1002, // React Dev
            reviewerId: 202, // Green Marketing
            reviewerName: "Green Marketing",
            recipientId: 102, // Carlos
            rating: 5,
            comment: "Carlos es un experto en React. El código es limpio y muy performante.",
            date: "2024-01-15",
            role: "company"
        },
        // Review FOR a Company (from Freelancer)
        {
            id: 101,
            serviceId: 1001, // The service involved
            serviceTitle: "Diseño de Logo Profesional",
            reviewerId: 101, // Ana (Freelancer)
            reviewerName: "Ana García",
            recipientId: 201, // Tech Solutions
            rating: 5,
            comment: "Excelente cliente. Claridad en los requerimientos y pagos puntuales.",
            date: "2023-11-12",
            type: "freelancer_to_client"
        },
        {
            id: 102,
            serviceId: 1002,
            serviceTitle: "Desarrollo React Moderno",
            reviewerId: 102, // Carlos
            reviewerName: "Carlos Rodríguez",
            recipientId: 201, // Tech Solutions
            rating: 4,
            comment: "Buena comunicación durante el proyecto.",
            date: "2024-02-01",
            type: "freelancer_to_client"
        }
    ];
    return reviews;
};
