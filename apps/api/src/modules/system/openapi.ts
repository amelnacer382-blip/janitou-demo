export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'JANITOU FOOD Management Platform API',
    version: '1.0.0',
    description:
      'API REST d\'ingénierie culinaire, planification de production, gestion des stocks, traçabilité KDS et distribution logistique.',
    contact: {
      name: 'JANITOU FOOD Engineering Team',
      email: 'tech@janitoufood.com',
    },
    license: {
      name: 'Proprietary',
    },
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Serveur de développement local',
    },
  ],
  tags: [
    { name: 'System & Health', description: 'Surveillance, sauvegardes et journal d\'audit' },
    { name: 'Customers', description: 'Gestion des clients et soldes' },
    { name: 'Recipes & Costs', description: 'Fiches techniques et simulateur de marge' },
    { name: 'Menus', description: 'Planning hebdomadaire des repas' },
    { name: 'Orders', description: 'Commandes et abonnements clients' },
    { name: 'Production', description: 'Moteur de calcul culinaire et KDS' },
    { name: 'Purchasing', description: 'Approvisionnements et commandes fournisseurs' },
    { name: 'Logistics', description: 'Tournées de livraison et chauffeurs' },
    { name: 'Analytics', description: 'Finances, facturation et 14 rapports' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['System & Health'],
        summary: 'Vérification de l\'état du système et de la base',
        responses: {
          '200': {
            description: 'Système opérationnel et sain',
          },
        },
      },
    },
    '/api/v1/customers': {
      get: {
        tags: ['Customers'],
        summary: 'Lister tous les clients',
        responses: { '200': { description: 'Liste des clients' } },
      },
      post: {
        tags: ['Customers'],
        summary: 'Créer un nouveau client',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['contactName', 'phone', 'deliveryAddress'],
                properties: {
                  companyName: { type: 'string' },
                  contactName: { type: 'string' },
                  phone: { type: 'string' },
                  email: { type: 'string' },
                  deliveryAddress: { type: 'string' },
                  wilaya: { type: 'string', default: 'Alger' },
                  commune: { type: 'string', default: 'Centre' },
                  dietaryPreferences: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Client créé' }, '400': { description: 'Données invalides' } },
      },
    },
    '/api/v1/recipes': {
      get: {
        tags: ['Recipes & Costs'],
        summary: 'Lister les fiches recettes avec calcul de coût unitaire',
        responses: { '200': { description: 'Liste des recettes et coûts' } },
      },
      post: {
        tags: ['Recipes & Costs'],
        summary: 'Créer une fiche recette technique',
        responses: { '201': { description: 'Recette créée' } },
      },
    },
    '/api/v1/recipes/{id}/pricing-simulation': {
      get: {
        tags: ['Recipes & Costs'],
        summary: 'Simulateur de prix de vente selon le Food Cost % cible',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'targetFoodCost', in: 'query', schema: { type: 'number', default: 30 } },
        ],
        responses: { '200': { description: 'Simulation de marge brute' } },
      },
    },
    '/api/v1/production/plan': {
      get: {
        tags: ['Production'],
        summary: 'Calculer le plan de production et l\'explosion des ingrédients',
        parameters: [
          { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'serviceTime', in: 'query', schema: { type: 'string', enum: ['LUNCH', 'DINNER'] } },
        ],
        responses: { '200': { description: 'Plan de production avec déficits' } },
      },
    },
    '/api/v1/production/auto-purchase-orders': {
      post: {
        tags: ['Production'],
        summary: 'Générer automatiquement les bons d\'achat fournisseur à partir des déficits',
        responses: { '201': { description: 'Bons de commande générés' } },
      },
    },
    '/api/v1/kds/batches': {
      get: {
        tags: ['Production'],
        summary: 'Lister les lots en cours pour l\'écran cuisine (KDS)',
        responses: { '200': { description: 'Lots KDS' } },
      },
    },
    '/api/v1/delivery/runs': {
      get: {
        tags: ['Logistics'],
        summary: 'Lister les tournées de livraison du jour',
        responses: { '200': { description: 'Tournées et arrêts avec géolocalisation' } },
      },
    },
    '/api/v1/analytics/financials': {
      get: {
        tags: ['Analytics'],
        summary: 'Tableau de bord financier (Chiffre d\'affaires, Food Cost %, Marges brutes)',
        responses: { '200': { description: 'KPIs financiers' } },
      },
    },
    '/api/v1/reports': {
      get: {
        tags: ['Analytics'],
        summary: 'Catalogue des 14 rapports officiels JANITOU FOOD',
        responses: { '200': { description: 'Liste des 14 rapports' } },
      },
    },
  },
};

export function renderSwaggerHtml(): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JANITOU FOOD — Documentation API Interactive (OpenAPI)</title>
  <link rel="icon" type="image/png" href="/logo.png">
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&display=swap" rel="stylesheet">
  <style>
    body { margin: 0; background-color: #faf5ee; font-family: 'Plus Jakarta Sans', sans-serif; }
    .topbar-header {
      background: linear-gradient(135deg, #120906 0%, #241510 100%);
      color: #fff;
      padding: 18px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #d97706;
    }
    .topbar-header h1 { margin: 0; font-size: 1.25rem; font-weight: 800; display: flex; align-items: center; gap: 12px; }
    .topbar-header a {
      color: #fbbf24;
      text-decoration: none;
      font-weight: 700;
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid rgba(251, 191, 36, 0.3);
      transition: all 0.2s;
    }
    .topbar-header a:hover { background: rgba(251, 191, 36, 0.15); }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { color: #120906; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; }
    .swagger-ui .opblock.opblock-get { border-color: #d97706; background: rgba(217, 119, 6, 0.05); }
    .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #d97706; }
    .swagger-ui .opblock.opblock-post { border-color: #10b981; background: rgba(16, 185, 129, 0.05); }
    .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #10b981; }
    .swagger-ui .opblock.opblock-patch { border-color: #8b5cf6; background: rgba(139, 92, 246, 0.05); }
    .swagger-ui .opblock.opblock-patch .opblock-summary-method { background: #8b5cf6; }
  </style>
</head>
<body>
  <div class="topbar-header">
    <h1>
      <img src="/logo.png" style="height: 32px; width: 32px; border-radius: 6px;" alt="Logo" />
      JANITOU FOOD — Documentation Interactive API
    </h1>
    <a href="/dashboard">← Retour au Dashboard</a>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: '/api/v1/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;
}
