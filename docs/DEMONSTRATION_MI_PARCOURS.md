# JANITOU FOOD — Dossier de Présentation & Validation de Mi-Parcours (Phase 1)
**Référence Devis :** D2026-0005-R1  
**Objet :** Validation formelle de l'étape de mi-parcours & déblocage de l'échéance de 30 % (53 100 DA)  
**Date :** Octobre 2026  
**Dépôt Officiel :** [https://github.com/janitoufood/janitou-food-management](https://github.com/janitoufood/janitou-food-management)  
**Release Officielle :** [`v1.0.0-phase1`](https://github.com/janitoufood/janitou-food-management/releases/tag/v1.0.0-phase1)

---

## 1. Contexte & Objectif de la Présentation

Conformément aux modalités financières et opérationnelles stipulées dans le **Devis D2026-0005-R1** (page 3) :
> *« 40 % à la signature du devis / 30 % à mi-parcours / 30 % à la livraison et acceptation formelle selon les critères d'acceptation convenus. »*

Ce document accompagne la démonstration interactive de la plateforme et certifie la réalisation complète du socle fonctionnel opérationnel couvrant le cycle complet :  
**`Commande → Production & Ateliers → Distribution & Tournées → Facturation & Soldes`**.

---

## 2. Parcours de Démonstration Guidée en Direct (5 Étapes Clés)

La démonstration peut être réalisée en direct sur l'interface active (**`http://localhost:4000/dashboard`**) en suivant ce scénario fluide de 7 minutes :

### Étape 1 : Pilotage Exécutif & Rentabilité (`📊 Vue Globale & Finance`)
- **Action :** Présenter les 4 indicateurs en haut de page.
- **Points forts à montrer :**
  - Le calcul du **Chiffre d'Affaires** prévisionnel (33 300 DZD).
  - La jauge réelle du **Food Cost % (25,4 %)** : preuve que le coût matière est maîtrisé sous le seuil d'alerte des 30 %.
  - Le tableau de **Rentabilité par Plat** : mise en valeur des marges nettes dégagées par chaque recette.

### Étape 2 : Commandes & Abonnements (`📦 Commandes & Abonnements`)
- **Action :** Cliquer sur `⚡ Convertir Abonnements en Commandes` puis sur `+ Nouvelle Commande`.
- **Points forts à montrer :**
  - La conversion automatique des abonnements réguliers (entreprises et particuliers) en commandes fermes du jour.
  - La génération automatique du numéro de commande chronologique (`JNT-YYYYMMDD-XXX`).
  - Le passage de statut en direct (`CONFIRMED` → `IN_PRODUCTION` → `DELIVERED`).

### Étape 3 : Fiches Recettes & Simulateur de Prix (`🍳 Fiches Recettes`)
- **Action :** Sélectionner une recette et ajuster l'objectif de Food Cost à 25 %.
- **Points forts à montrer :**
  - L'explosion des ingrédients et le calcul automatique du coût matière portion (au centime près).
  - Le **Simulateur de Prix de Vente** qui indique instantanément le prix de vente optimal conseillé et la marge brute en DZD.
  - Le respect et l'affichage clair des allergènes déclarés.

### Étape 4 : Règles Calendrier & Écran Cuisine KDS (`📅 Menu de la Semaine` & `📺 Écran KDS`)
- **Action :** Montrer la bannière verte de validation des règles du devis.
- **Points forts à montrer :**
  - **Moteur de règles opérationnelles strictes :** respect de l'interdiction frites midi+soir, interdiction viande hachée midi+soir, max 1× pâtes par semaine au déjeuner, et repas faciles le samedi.
  - **KDS Tactile en conditions réelles :** basculer un lot de `À Préparer` → `En Cuisson` → `En Barquette` → `Prêt au Départ ✓`.
  - **Fiche d'Urgence Atelier :** cliquer sur `🚨 Urgence Atelier` pour montrer la fiche de secours imprimable pour la brigade en cas de panne internet.
  - **Étiquettes Thermiques :** cliquer sur `🏷️ Étiquettes` pour prévisualiser les stickers pour barquettes kraft 76x51mm avec codes-barres vectoriels SVG.

### Étape 5 : Facturation, WhatsApp & Chauffeurs (`💳 Facturation` & `🚚 Tournées`)
- **Action :** Afficher un compte client avec son solde prépayé.
- **Points forts à montrer :**
  - **Hiérarchie Société Mère / Filiales :** exemple avec le siège et son annexe.
  - **Raccourci WhatsApp direct :** ouverture instantanée d'un message pré-rempli pour le client.
  - **Encaissement de règlement :** clic sur `+ Encaisser`, saisie d'un versement et génération du reçu numéroté (`REC-YYYYMMDD-XXX`).
  - **Outils Chauffeur :** clic sur `📍 Navigation GPS Google Maps` pour lancer l'itinéraire sur smartphone et `📞 Téléphone` pour appeler le client en 1 clic.

---

## 3. Matrice de Conformité aux Exigences du Devis D2026-0005-R1

| Article Devis | Intitulé Contractuel | État | Preuve Technique |
| :---: | :--- | :---: | :--- |
| **01** | Analyse & Spécifications techniques | **Validé** | ADR-001 à ADR-006 archivés dans `docs/TECHNICAL_DECISIONS.md`. |
| **02** | Module Clients & Hiérarchie | **Validé** | Société mère / filiales, soldes DZD, WhatsApp direct. |
| **03** | Module Commandes & Calculs | **Validé** | Commandes directes, abonnements, suppléments chiffrés. |
| **04** | Fiches Techniques & Alternatives | **Validé** | Coûts portions, barquettes kraft, gestion des régimes sans gluten. |
| **05** | Règles Calendrier Opérationnelles | **Validé** | Algorithme vérifiant frites, viande hachée, pâtes et samedi facile. |
| **06** | Production, Pénuries & Achats | **Validé** | Explosion kg/L, détection pénuries, génération automatique des PO. |
| **07** | Distribution & Rémunération | **Validé** | Tournées, calcul rémunération livreur, GPS 1-clic, transfert de tournée. |
| **08** | Comptabilité & Facturation | **Validé** | Factures automatiques, reçus d'encaissement numérotés, soldes prépayés. |
| **09** | Sécurité & Journal d'Audit | **Validé** | Audit Trail immuable traçant date, heure, utilisateur et avant/après. |
| **10** | UI/UX Design Ergonomique | **Validé** | Design moderne Obsidian & Emerald, notifications toasts, KDS sombre. |
| **11** | Les 14 Rapports Essentiels | **Validé** | Hub centralisé générant les 14 rapports officiels nominatifs du devis. |
| **12** | Tests & Assurance Qualité | **Validé** | **16 tests automatisés validés à 100 % (zéro régression)**. |
| **13** | Continuité & Backup/Restore | **Validé** | Emergency Workshop Package imprimable & sauvegarde JSON instantanée. |
| **14** | Propriété & Gouvernance GitHub | **Validé** | Code détenu par JANITOU FOOD, 6 PRs fusionnées, release `v1.0.0-phase1`. |

---

## 4. Preuves d'Audit Technique & Transparence sur GitHub

Le client peut auditer directement la totalité du projet sur son espace GitHub officiel :
- **Dépôt officiel :** [https://github.com/janitoufood/janitou-food-management](https://github.com/janitoufood/janitou-food-management)
- **Validation Qualité :** 16 tests unitaires et d'intégration validés (`bun test` exécuté en ~110 ms).
- **Pack Documentation Livré dans le dépôt :**
  - Guide Utilisateur Complet : [`docs/USER_GUIDE.md`](https://github.com/janitoufood/janitou-food-management/blob/main/docs/USER_GUIDE.md)
  - Procédures de Déploiement VPS : [`docs/DEPLOYMENT_PROCEDURES.md`](https://github.com/janitoufood/janitou-food-management/blob/main/docs/DEPLOYMENT_PROCEDURES.md)
  - Sauvegardes & Restauration : [`docs/BACKUP_RESTORE_PROCEDURES.md`](https://github.com/janitoufood/janitou-food-management/blob/main/docs/BACKUP_RESTORE_PROCEDURES.md)
  - Matrice des Rôles & Accès : [`docs/ROLES_AND_PERMISSIONS.md`](https://github.com/janitoufood/janitou-food-management/blob/main/docs/ROLES_AND_PERMISSIONS.md)
  - Registre des Décisions Techniques : [`docs/TECHNICAL_DECISIONS.md`](https://github.com/janitoufood/janitou-food-management/blob/main/docs/TECHNICAL_DECISIONS.md)

---

## 5. Procès-Verbal de Validation d'Étape & Appel de Fonds

### Récapitulatif Financier (Phase 1)
- **Montant Total Ferme Phase 1 :** 177 000 DA HT
- **Acompte de Démarrage (40 %) :** 70 800 DA *(Réglé à la signature)*
- **Échéance de Mi-Parcours exigible (30 %) :** **53 100 DA**
- **Solde Final à la mise en ligne VPS (30 %) :** 53 100 DA

### Bon pour Acceptation de Mi-Parcours

Par la signature du présent document, le client **JANITOU FOOD** atteste avoir assisté à la démonstration opérationnelle du socle fonctionnel, avoir vérifié la conformité des modules listés ci-dessus et valide le déblocage de l'échéance de mi-parcours de **53 100 DA**.

Fait à ............................................, le ....................................

**Pour le Prestataire (ART OF DOING)**  
*Signature & Cachet*

<br><br>

**Pour le Client (JANITOU FOOD)**  
*Nom, Qualité & Signature*
