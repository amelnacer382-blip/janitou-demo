# JANITOU FOOD — Procédures de Déploiement en Production (VPS)

Ce document décrit la procédure officielle pour déployer la plateforme **JANITOU FOOD** sur un serveur VPS dédié sous Linux (Ubuntu 22.04 LTS ou Debian 12).

---

## 1. Prérequis Système

- **Serveur VPS :** 2 vCPU, 4 Go RAM, 40 Go SSD.
- **Système d'exploitation :** Ubuntu 22.04 / 24.04 LTS ou Debian 12.
- **Accès :** Connexion SSH avec privilèges `sudo`.
- **Nom de domaine :** Pointeur DNS A configuré vers l'adresse IP du VPS (ex. `app.janitoufood.dz`).

---

## 2. Préparation du Serveur

Connectez-vous au VPS via SSH :
```bash
ssh user@vps-ip-address
```

Mettez à jour les paquets système :
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ufw ca-certificates gnupg
```

Installez Docker & Docker Compose :
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Activez le pare-feu UFW en autorisant SSH, HTTP et HTTPS :
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 3. Clonage du Référentiel GitHub

```bash
git clone https://github.com/janitoufood/janitou-food-management.git /opt/janitou-food
cd /opt/janitou-food
```

---

## 4. Configuration des Variables d'Environnement

Copiez le modèle de configuration :
```bash
cp .env.example .env
nano .env
```

Ajustez les valeurs de production (mots de passe forts, secret JWT unique) :
```env
NODE_ENV=production
PORT=4000
APP_URL=https://app.janitoufood.dz
API_URL=https://app.janitoufood.dz/api

DB_HOST=localhost
DB_PORT=5432
DB_USER=janitou_prod_user
DB_PASSWORD=CLE_SECRETE_PRODUCTION_A_DEFINIR
DB_NAME=janitou_food_prod
DATABASE_URL=postgresql://janitou_prod_user:CLE_SECRETE_PRODUCTION_A_DEFINIR@postgres:5432/janitou_food_prod?schema=public

JWT_SECRET=GENERER_UNE_CLE_ALEATOIRE_64_CARACTERES
```

---

## 5. Démarrage de la Base de Données

Lancez le conteneur PostgreSQL 16 :
```bash
docker compose up -d postgres
```

Vérifiez que la base est saine :
```bash
docker compose ps
```

---

## 6. Installation & Démarrage de l'Application

Installez le runtime Bun ou Node.js :
```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

Installez les dépendances et validez les tests :
```bash
bun install
bun test
```

### Configuration du Service Systemd (Démarrage Automatique au Reboot)
Créez le fichier de service :
```bash
sudo nano /etc/systemd/system/janitou.service
```

Insérez la configuration :
```ini
[Unit]
Description=JANITOU FOOD Platform Service
After=network.target docker.service

[Service]
Type=simple
User=user
WorkingDirectory=/opt/janitou-food
ExecStart=/home/user/.bun/bin/bun apps/api/src/server.ts
Restart=always
RestartSec=5
Environment=PORT=4000
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Activez et démarrez le service :
```bash
sudo systemctl daemon-reload
sudo systemctl enable janitou
sudo systemctl start janitou
sudo systemctl status janitou
```

---

## 7. Configuration Nginx Reverse-Proxy & SSL HTTPS

Installez Nginx et Certbot :
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Créez le bloc serveur Nginx :
```bash
sudo nano /etc/nginx/sites-available/janitoufood
```

Contenu de la configuration :
```nginx
server {
    server_name app.janitoufood.dz;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activez le site et testez la syntaxe :
```bash
sudo ln -s /etc/nginx/sites-available/janitoufood /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Générez le certificat SSL HTTPS gratuit Let's Encrypt :
```bash
sudo certbot --nginx -d app.janitoufood.dz
```

---

## 8. Vérification Post-Déploiement

Vérifiez que les sondes répondent :
- `curl -I https://app.janitoufood.dz/health` → doit retourner `HTTP/1.1 200 OK`.
- Ouvrez `https://app.janitoufood.dz/dashboard` dans un navigateur externe.
