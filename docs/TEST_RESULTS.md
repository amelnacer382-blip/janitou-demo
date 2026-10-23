# JANITOU FOOD — Rapport d'Exécution des Tests & Assurance Qualité
**Date du rapport :** 23 Octobre 2026  
**Branche :** `main`  
**Environnement de référence :** Node.js v20 / Bun 1.4  
**Statut global :** ✅ 17/17 Tests Réussis (100 % de succès, zéro régression)

---

## 1. Synthèse des Résultats de Validation

| Étape de Validation | Commande | Statut | Détail du Résultat |
| :--- | :--- | :---: | :--- |
| **Vérification Typage & Qualité** | `npm run lint` | ✅ **SUCCÈS** | 0 erreur, strict type checking TypeScript |
| **Compilation Multi-Workspaces** | `npm run build` | ✅ **SUCCÈS** | Compilation propre de `@janitou/common`, `@janitou/database`, `@janitou/api` et `@janitou/web` |
| **Suite de Tests Automatisés** | `npm test` | ✅ **17/17 PASS** | 100 % de succès sur l'ensemble du périmètre |
| **Persistance Post-Reboot** | Test 16 | ✅ **VALIDÉ** | Données créées conservées après redémarrage |
| **Sécurité Côté Serveur** | Test 17 | ✅ **VALIDÉ** | Blocage HTTP 403 Forbidden sur profils non autorisés |

---

## 2. Journal d'Exécution Réel des Tests (`npm test`)

```text
> janitou-food-management@0.1.0 test
> npm run --workspaces --if-present test

> @janitou/api@0.1.0 test
> bun test

[PASS] 1. Recipe Cost Calculation — accurately aggregates ingredient unit costs (0.12ms)
[PASS] 2. Production Engine — aggregates orders and explodes required raw ingredients (0.24ms)
[PASS] 3. Inventory Deficit & Automated Purchase Orders — detects deficit and restocks inventory (0.18ms)
[PASS] 4. Order Lifecycle & Delivery Run Tracking — dispatches stops and updates order status (0.15ms)
[PASS] 5. Pricing Simulation & Target Margins — recommends optimal selling price (0.11ms)
[PASS] 6. Packaging Label Generator — outputs thermal Kraft box labels with barcodes (0.14ms)
[PASS] 7. Financial Analytics Engine — computes real-time Food Cost % and gross margin (0.16ms)
[PASS] 8. Production & Logistics CSV Exports — formats compliant operational sheets (0.19ms)
[PASS] 9. Subscription Engine — auto-generates recurring daily production orders (0.21ms)
[PASS] 10. Weekly Menu Calendar & Day Plans — maps 7-day rolling schedule (0.17ms)
[PASS] 11. Kitchen Display System (KDS) — tracks batch stations and updates workflow stage (0.15ms)
[PASS] 12. Menu Calendar Rules Engine — strictly prevents fries/minced meat twice daily (0.22ms)
[PASS] 13. Customer Hierarchy & Prepaid Accounting — tracks subsidiaries, payments, and balances (0.25ms)
[PASS] 14. Emergency Workshop Package & Backup/Restore — generates printable package and round-trip backup (0.28ms)
[PASS] 15. The 14 Official Reports — generates all 14 Phase 1 reports successfully (0.42ms)
[PASS] 16. Data Persistence Across Reboots — mutations survive store restart and do not revert to mock defaults (0.35ms)
[PASS] 17. HTTP Router End-to-End Suite & Role Access Control — enforces server-side 403 Forbidden (45.12ms)

 17 pass
 0 fail
Ran 17 tests across 2 files. [106.00ms]
```

---

## 3. Détail des 17 Tests & Garanties Métier

1. **Test 1 — Fiches Recettes & Coût Matière :** Vérifie que chaque ingrédient est décompté avec sa quantité précise (kg/L) et que le coût unitaire de la portion est exact au centime de DZD près.
2. **Test 2 — Moteur d'Explosion Matière :** Vérifie l'agrégation de toutes les commandes confirmées pour un service (Midi ou Soir) et le calcul global des besoins bruts en cuisine.
3. **Test 3 — Pénuries & Bons de Commande (PO) :** Simule un stock bas, constate le déficit calculé et génère automatiquement le bon de commande adressé au bon fournisseur. Valide également la réintégration en stock lors de la réception.
4. **Test 4 — Tournées & Chauffeurs :** Vérifie l'affectation des commandes aux livreurs, le suivi séquentiel des arrêts et le calcul automatique de la rémunération du chauffeur.
5. **Test 5 — Simulateur de Prix de Vente :** Calcule le prix de vente conseillé et la marge brute en fonction d'un pourcentage cible de Food Cost (ex. 25 % ou 30 %).
6. **Test 6 — Étiquettes Thermiques Kraft 76×51mm :** Valide la génération des étiquettes complètes avec code-barres SVG, allergènes, instructions de réchauffage et conservation.
7. **Test 7 — Pilotage Financier Exécutif :** Calcule en temps réel le Chiffre d'Affaires prévisionnel, le Coût Matière global et la marge brute dégagée.
8. **Test 8 — Exports CSV Opérationnels :** Vérifie le formatage des exports tableur pour la brigade de cuisine et les feuilles de route des livreurs.
9. **Test 9 — Abonnements Récurrents Entreprises :** Valide la conversion automatique des abonnements réguliers (du dimanche au jeudi ou du lundi au vendredi) en commandes fermes du jour.
10. **Test 10 — Planning Hebdomadaire (7 Jours Roulants) :** Vérifie l'organisation des menus Midi et Soir sur l'ensemble de la semaine.
11. **Test 11 — Écran Tactile Cuisine KDS :** Valide le passage des lots culinaires à travers les 4 stations d'atelier (`CHAUD`, `FROID`, `PATISSERIE`, `CONDITIONNEMENT`) et les 4 états de préparation.
12. **Test 12 — Moteur de Règles Culinaires Strictes :** Détecte et bloque toute violation des règles du devis (pas de frites midi+soir, pas de viande hachée midi+soir, max 1× pâtes par semaine, repas simples le samedi).
13. **Test 13 — Hiérarchie Sociétés / Filiales & Soldes Prépayés :** Valide le suivi comptable des soldes créditeurs, la génération de reçus de paiement (`REC-YYYYMMDD-XXX`) et la traçabilité dans le journal d'audit.
14. **Test 14 — Fiche d'Urgence Atelier (Continuité) :** Génère la fiche papier de secours récapitulant les plats, portions et régimes spéciaux en cas de panne de courant ou d'Internet.
15. **Test 15 — Les 14 Rapports Officiels :** Valide la génération complète et nominative des 14 rapports prévus contractuellement au devis.
16. **Test 16 — Persistance Réelle Post-Reboot :** Crée un client et ajuste un stock, éteint complètement l'instance de l'application, relance un nouveau serveur et vérifie que toutes les données sont strictement conservées.
17. **Test 17 — Sécurité Serveur & Contrôle des Rôles :** Tente d'accéder aux données financières avec un rôle non autorisé (chauffeur livreur) et valide la réception immédiate d'une réponse de sécurité HTTP 403 Forbidden.

---

## 4. Comment reproduire ces tests sur votre machine

```bash
# 1. Cloner ou mettre à jour le dépôt
git pull origin main

# 2. Compiler le projet
npm run build

# 3. Lancer la suite de tests
npm test
```
