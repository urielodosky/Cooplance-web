const fs = require('fs');
const path = 'c:/Users/HP/OneDrive/Desktop/Cooplance/Cooplance-web/src/pages/Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

const newCall = `            <ReviewModal
                isOpen={!!selectedJobForReview}
                onClose={() => setSelectedJobForReview(null)}
                onConfirm={handleReviewSubmit}
                title={user.role === 'freelancer' ? "Califica al Cliente" : "Califica a"}
                targetName={user.role === 'freelancer' ? \`@\${selectedJobForReview?.buyerUsername}\` : \`@\${selectedJobForReview?.freelancerUsername}\`}
                subtitle={user.role === 'freelancer' ? "¿Cómo fue tu experiencia trabajando con este cliente?" : "¿Estás satisfecho con el resultado final?"}
            />`;

content = content.replace(
    /<ReviewModal[\s\S]+?\/>/,
    newCall
);

fs.writeFileSync(path, content);
console.log('Updated ReviewModal call to use @username');
