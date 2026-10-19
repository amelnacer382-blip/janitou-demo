# JANITOU FOOD — Matrice des Rôles, Accès & Permissions

Ce document détaille la politique de sécurité, la gestion des profils et le contrôle d'accès granulaire de la plateforme **JANITOU FOOD**.

---

## 1. Profils & Rôles Définis

| Rôle Système | Titre Opérationnel | Description de la Responsabilité |
| :--- | :--- | :--- |
| **`ADMIN`** | Direction Générale & Gérant | Accès complet aux finances, pilotage stratégique, journal d'audit, gestion des utilisateurs et validation des décisions. |
| **`OPERATIONS_MANAGER`** | Responsable d'Exploitation | Supervision de la chaîne complète commande → production → livraison. |
| **`CHEF_KITCHEN`** | Chef de Cuisine & Brigades | Gestion des fiches techniques recettes, fiches de production journalières, écran tactile KDS et validation des lots cuisinés. |
| **`PURCHASING_MANAGER`**| Responsable Achats & Stocks | Suivi des niveaux d'inventaire, seuils d'alerte, émission des bons de commande fournisseurs (PO) et réception des matières premières. |
| **`PACKING_LOGISTICS`** | Responsable Conditionnement | Impression des étiquettes thermiques pour barquettes kraft et contrôle de l'emballage individuel/collectif. |
| **`DELIVERY_DRIVER`** | Chauffeur Livreur | Consultation de la tournée de livraison, navigation GPS, contact téléphonique client et émargement des livraisons. |
| **`CLIENT`** | Client (Entreprise / Particulier) | Consultation de ses commandes, relevé de compte, téléchargement de factures et communication via WhatsApp. |

---

## 2. Matrice Granulaire des Permissions

| Module / Action | `ADMIN` | `CHEF_KITCHEN` | `PURCHASING` | `DELIVERY` | `CLIENT` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Tableau de Bord & Données Financières** | **Total** | Coût matière | Coût achats | Masqué | Masqué |
| **Création & Gestion des Commandes** | **Total** | Consultation | Masqué | Consultation | Propres commandes |
| **Facturation & Encaissement Règlements**| **Total** | Masqué | Masqué | Masqué | Propres factures |
| **Fiches Recettes & Coût Matière** | **Total** | **Total** | Consultation | Masqué | Masqué |
| **Validation Règles Menu Calendrier** | **Total** | **Total** | Consultation | Masqué | Masqué |
| **Écran Cuisine KDS & Lots Atelier** | **Total** | **Total** | Masqué | Masqué | Masqué |
| **Ajustement des Stocks & Réception PO** | **Total** | Consultation | **Total** | Masqué | Masqué |
| **Génération Bons de Commande Fournisseur**| **Total** | Consultation | **Total** | Masqué | Masqué |
| **Gestion des Tournées & Transfert Chauffeur**| **Total** | Consultation | Consultation | Émargement | Suivi statut |
| **Journal d'Audit & Sécurité (Immuable)**| **Total** | Masqué | Masqué | Masqué | Masqué |
| **Sauvegarde / Restauration Base de Données**| **Total** | Masqué | Masqué | Masqué | Masqué |
| **Génération des 14 Rapports Officiels**| **Total** | Rapports 2 & 5| Rapport 3 | Rapport 6 | Masqué |

---

## 3. Règles de Sécurité des Données Financières & Audit

1. **Protection Côté Serveur :**
   - Toutes les vérifications d'autorisation et de validation des règles métier s'exécutent côté serveur dans l'API REST.
   - Les données financières (chiffre d'affaires, marges, encaissements) sont cloisonnées et inaccessibles aux profils cuisine et livraison.
2. **Journal d'Audit Immuable (Audit Trail) :**
   - Chaque opération sensible (enregistrement d'un règlement, modification d'un statut de commande, transfert de tournée chauffeur, suspension de compte client) génère une entrée d'audit avec :
     - Identifiant et nom de l'utilisateur
     - Horodatage certifié ISO-8601
     - Instantané de l'état avant et après modification
3. **Traçabilité des Suppressions :**
   - Aucune suppression physique n'est effectuée sur les transactions financières ou les commandes passées : les enregistrements sont historisés et archivés.
