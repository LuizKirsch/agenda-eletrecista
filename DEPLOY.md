# Deploy na VPS (Ubuntu + Docker + Caddy)

Arquitetura: **Caddy** (único com portas 80/443, HTTPS automático) → rede Docker `proxy` → **agenda-app** (Express servindo API + build do React) → rede `interna` → **MySQL**.

VPS: `187.41.125.189` (Hostinger). Endereço do app: **https://agenda.187-41-125-189.sslip.io**

## 1. DNS

Nada a fazer por enquanto: o sslip.io resolve `agenda.187-41-125-189.sslip.io` direto para o IP.
Quando tiver domínio próprio, crie um registro **A** `agenda` → `187.41.125.189` e troque o nome no `Caddyfile`.

## 2. Primeiro acesso e segurança básica

```bash
ssh root@187.41.125.189
apt update && apt upgrade -y
adduser luiz && usermod -aG sudo luiz

# no SEU computador: copia sua chave SSH (gere antes com ssh-keygen -t ed25519 se não tiver)
ssh-copy-id luiz@187.41.125.189

# de volta na VPS, SÓ depois de testar o login com a chave em outro terminal:
sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/; s/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# firewall: só SSH, HTTP e HTTPS
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443
sudo ufw enable

sudo apt install -y unattended-upgrades fail2ban
sudo timedatectl set-timezone America/Sao_Paulo

# se a VPS tiver 1 GB de RAM (confira com free -h), crie swap:
# sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
# echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 3. Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker luiz    # saia e entre de novo no SSH
docker network create proxy     # rede compartilhada entre o Caddy e os apps
```

## 4. Aplicação

```bash
sudo mkdir -p /opt/apps && sudo chown luiz: /opt/apps && cd /opt/apps
git clone https://github.com/LuizKirsch/agenda-eletrecista.git && cd agenda-eletrecista
cp .env.production.example .env
nano .env                       # senhas do banco, JWT_SECRET (openssl rand -hex 48), dados da secretária
docker compose up -d --build
docker compose logs -f app      # deve aparecer as migrations e "Servidor rodando na porta 3000"
```

> Repo privado? Use um token (`git clone https://SEU_TOKEN@github.com/...`) ou uma deploy key.

## 5. Proxy (Caddy)

```bash
sudo mkdir -p /opt/proxy && sudo chown luiz: /opt/proxy
cp deploy/proxy/* /opt/proxy/ && cd /opt/proxy
docker compose up -d
docker compose logs -f          # procure "certificate obtained successfully"
```

Pronto: https://agenda.187-41-125-189.sslip.io

## Atualizar depois de um push

```bash
cd /opt/apps/agenda-eletrecista && git pull && docker compose up -d --build
```

## Backup do banco

```bash
docker exec agenda-db sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" agenda_eletricista' > backup-$(date +%F).sql
```
