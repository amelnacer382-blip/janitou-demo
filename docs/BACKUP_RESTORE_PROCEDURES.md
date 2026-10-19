# JANITOU FOOD — Procédures de Sauvegarde & Restauration (Backup / Restore)

Ce document formalise les procédures de sauvegarde périodique et de restauration pour garantir la continuité d'activité de la plateforme **JANITOU FOOD**.

---

## 1. Objectifs & Stratégie

- **RPO (Perte maximale de données admissible) :** < 24 heures.
- **RTO (Temps de rétablissement maximal admissible) :** < 1 heure.
- **Principe de redondance :** Double sauvegarde (sauvegarde applicative JSON pour réinjection rapide + dump binaire PostgreSQL pour intégrité totale).

---

## 2. Sauvegarde Applicative Instantanée (Via Dashboard & API)

### Depuis l'Interface Graphique
1. Connectez-vous avec un profil **Directeur / Admin**.
2. Dans la barre supérieure, cliquez sur le bouton **`💾 Backup JSON`**.
3. Le navigateur télécharge instantanément un fichier snapshot complet horodaté :  
   `janitou-backup-YYYY-MM-DD.json`.
4. Ce fichier contient l'intégralité des données :
   - Fiches clients, sociétés et filiales
   - Soldes prépayés, factures et reçus
   - Recettes et matières premières
   - Commandes, plannings et lots de production
   - Journal d'audit complet

### Depuis la Ligne de Commande ou Script Cron
```bash
curl -s http://localhost:4000/api/v1/system/backup -o /var/backups/janitou/backup-$(date +%F).json
```

---

## 3. Sauvegarde Automatisée de la Base PostgreSQL

Sur le serveur VPS, mettez en place un script de sauvegarde quotidienne :

Créez le dossier de stockage :
```bash
sudo mkdir -p /var/backups/janitou
sudo chown -R $USER:$USER /var/backups/janitou
```

Créez le script `/opt/janitou-food/scripts/backup.sh` :
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/janitou"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/janitou_db_${DATE}.sql.gz"

# Sauvegarde compressée de PostgreSQL
docker exec janitou_food_postgres pg_dump -U janitou_user janitou_food_db | gzip > "${BACKUP_FILE}"

# Rétention : supprimer les sauvegardes de plus de 30 jours
find "${BACKUP_DIR}" -type f -name "janitou_db_*.sql.gz" -mtime +30 -delete

echo "[$(date)] Sauvegarde réussie : ${BACKUP_FILE}"
```

Rendez le script exécutable :
```bash
chmod +x /opt/janitou-food/scripts/backup.sh
```

Programmez l'exécution quotidienne via crontab à 02h00 du matin :
```bash
crontab -e
# Ajouter :
0 2 * * * /opt/janitou-food/scripts/backup.sh >> /var/log/janitou_backup.log 2>&1
```

---

## 4. Procédure de Restauration Testée Pas-à-Pas

### Cas A : Restauration Applicative (Via API)
Si vous devez restaurer les données sur une instance vierge :
```bash
curl -X POST http://localhost:4000/api/v1/system/restore \
  -H "Content-Type: application/json" \
  -d @/var/backups/janitou/backup-YYYY-MM-DD.json
```
Le serveur répond :
```json
{ "message": "Restauration complète de la base effectuée avec succès." }
```

### Cas B : Restauration depuis un Dump PostgreSQL
En cas de corruption majeure de la base :

1. Arrêtez le service applicatif :
```bash
sudo systemctl stop janitou
```

2. Restaurez le dump dans le conteneur PostgreSQL :
```bash
gunzip -c /var/backups/janitou/janitou_db_YYYYMMDD_HHMMSS.sql.gz | docker exec -i janitou_food_postgres psql -U janitou_user -d janitou_food_db
```

3. Redémarrez le service :
```bash
sudo systemctl start janitou
sudo systemctl status janitou
```

4. Validez l'intégrité :
```bash
curl -s http://localhost:4000/health
```

---

## 5. Fiche d'Urgence Brigade en cas de Panne Totale (Continuity Package)

Si une panne électrique ou réseau survient pendant le service du matin :
- Les cuisiniers disposent de la **Fiche d'Urgence Atelier (Emergency Workshop Package)** imprimée au préalable.
- Cette fiche récapitule les portions exactes, les emballages nécessaires et les adresses de livraison sans aucun recours aux écrans.
