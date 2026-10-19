# JANITOU FOOD — Guide Utilisateur (Phase 1)

Ce guide décrit l'utilisation quotidienne de la plateforme **JANITOU FOOD** pour l'ensemble des profils opérationnels.

---

## 1. Vue d'Ensemble & Tableau de Bord Exécutif (`/dashboard`)

Le tableau de bord centralise en temps réel la santé opérationnelle et financière de l'activité :
- **Chiffre d'Affaires Prévisionnel :** Montant cumulé des commandes fermes enregistrées pour la journée.
- **Coût Matière Première (Food Cost) :** Somme du coût d'achat des ingrédients bruts consommés par les repas.
- **Jauge Ratio Food Cost :** Ratio de rentabilité affiché avec barre de progression (optimal sous 30 %).
- **Marge Brute Opérationnelle :** Différence directe entre le chiffre d'affaires et le coût matière.
- **Portions Servies :** Volume total de repas réparti entre Déjeuner et Dîner.
- **Tableau de Rentabilité par Recette :** Classement des plats générant la plus forte marge contributive.

---

## 2. Module Commandes & Abonnements

### Prise de Commande Client
1. Cliquer sur **`+ Nouvelle Commande`** dans la barre supérieure.
2. Sélectionner le client (Société mère, Filiale ou Particulier).
3. Définir la date et le service (**Déjeuner / Dîner**).
4. Choisir la recette principale et le nombre de portions.
5. Ajouter des instructions particulières de livraison si nécessaire.
6. Valider : la commande reçoit un numéro unique d'ordonnancement séquentiel (`JNT-YYYYMMDD-XXX`).

### Conversion des Abonnements
- Pour les entreprises souscrivant à une formule récurrente (ex. 5 jours/semaine) :
- Cliquer sur le bouton **`⚡ Convertir Abonnements en Commandes`** pour générer automatiquement l'ensemble des commandes programmées pour la journée en cours.

---

## 3. Module Facturation & Soldes Prépayés (`💳 Facturation & Soldes`)

- **Comptes Clients & Soldes :** Visualisation immédiate des crédits prépayés disponibles (en vert) ou des encours dus (en rouge).
- **Raccourci WhatsApp Direct :** Clic sur `📱 WhatsApp Direct` pour ouvrir une conversation pré-remplie avec le contact client.
- **Encaissement de Règlement :** Cliquer sur `+ Encaisser` pour enregistrer un versement (Espèces, Virement, Chèque, Crédit prépayé) qui crédite automatiquement le solde du client et génère un reçu officiel (`REC-YYYYMMDD-XXX`).
- **Relevé de Compte :** Clic sur `Relevé` pour afficher l'historique complet des factures et règlements d'un client.

---

## 4. Studio Fiches Recettes & Simulateur de Marge (`🍳 Fiches Recettes`)

- **Fiche Technique :** Affichage des grammages d'ingrédients bruts, du coût de revient portion, des allergènes et du temps de préparation.
- **Simulateur de Prix de Vente :** 
  1. Sélectionner un plat.
  2. Ajuster l'objectif de *Food Cost %* désiré (ex. 25 % ou 30 %).
  3. Le système calcule automatiquement le **prix de vente conseillé** et la marge brute en DZD.
- **Création de Recette :** Formulaire permettant d'ajouter une recette avec calcul dynamique du coût d'après le catalogue des ingrédients.

---

## 5. Calendrier des Menus & Moteur de Règles (`📅 Menu de la Semaine`)

Le planning 7 jours intègre un vérificateur de règles opérationnelles strictes :
- **Interdiction frites midi et soir :** Alerte si des frites/pommes sautées sont programmées au déjeuner et au dîner le même jour.
- **Interdiction viande hachée midi et soir :** Alerte en cas de doublon de viande hachée sur une même journée.
- **Pâtes / Spaghetti :** Maximum 1 fois par semaine au déjeuner.
- **Repas du samedi :** Alerte si la préparation dépasse 45 minutes pour préserver la brigade allégée du samedi.

---

## 6. Écran Cuisine KDS Tactile (`📺 Écran Cuisine`)

Conçu pour être affiché sur tablette ou écran tactile dans les ateliers :
- Organisation par postes : **Poste Chaud**, **Poste Froid**, **Pâtisserie**, **Conditionnement**.
- Validation tactile de la progression des lots :
  - `1. À Préparer` → `2. En Cuisson` → `3. En Barquette` → `4. Prêt au Départ ✓`.

---

## 7. Fiche de Production & Approvisionnements (`👨‍🍳 Fiche de Production` & `🥦 Stocks`)

- **Explosion des Matières Premières :** Calcul automatique des kg et litres requis en cuisine.
- **Détection des Pénuries :** Affichage d'un badge rouge `Déficit` si le stock disponible est inférieur au besoin.
- **Réapprovisionnement 1-Clic :** Le bouton `📦 Réapprovisionner Déficits` crée automatiquement les bons de commande d'achat (PO) auprès des fournisseurs attitrés.
- **Réception de Marchandise :** Dans l'onglet Stocks, cliquer sur `Réceptionner` pour incrémenter automatiquement l'inventaire.

---

## 8. Logistique & Tournées de Livraison (`🚚 Tournées & Manifeste`)

- **Création Automatique :** Regroupement des commandes du jour en tournée ordonnée avec assignation d'un chauffeur.
- **Calcul de Rémunération :** Calcul automatique basé sur un forfait de base (800 DZD) + un tarif par arrêt (150 DZD).
- **Navigation GPS en 1 Clic :** Le chauffeur clique sur `📍 Navigation GPS Google Maps` pour lancer l'itinéraire sur son smartphone.
- **Appel Client :** Clic direct sur `📞 Téléphone` pour appeler le destinataire à l'approche.
- **Émargement :** Clic sur `Émarger / Livré` pour marquer l'arrêt livré et basculer instantanément le statut de la commande en `DELIVERED`.

---

## 9. Les 14 Rapports Essentiels (`📑 14 Rapports`)

Sélectionner n'importe quel rapport parmi les 14 officiels pour afficher les données consolidées en temps réel et les imprimer ou les exporter.

---

## 10. Continuité d'Activité & Fiche d'Urgence (`🚨 Urgence Atelier`)

En cas de coupure internet ou de panne réseau :
1. Cliquer sur **`🚨 Urgence Atelier`** dans la barre supérieure.
2. Imprimer la fiche A4 unique qui récapitule :
   - Les volumes exacts à cuisiner par plat.
   - Le décompte précis des barquettes kraft et sacs d'emballage à préparer.
   - Les alternatives alimentaires et adresses de livraison des clients sensibles.
