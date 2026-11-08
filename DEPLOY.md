# Deploy na VPS (Ubuntu + Docker + Caddy)

Arquitetura: **Caddy** (único com portas 80/443, HTTPS automático) → rede Docker `proxy` → **agenda-app** (Express servindo API + build do React) → rede `interna` → **MySQL**.

## 1. DNS (no painel onde o domínio está)

Crie um registro **A**: `agenda` → `IP_DA_VPS`. Confira com `ping agenda.seudominio.com.br` antes do passo 5.

## 2. Primeiro acesso e segurança básica

```bash
ssh root@IP_DA_VPS
apt update && apt upgrade -y
adduser luiz && usermod -aG sudo luiz

# no SEU computador: copia sua chave SSH (gere antes com ssh-keygen -t ed25519 se não tiver)
ssh-copy-id luiz@IP_DA_VPS

# de volta na VPS, depois de testar o login com a chave em outro terminal:
sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/; s/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# firewall: só SSH, HTTP e HTTPS
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443
sudo ufw enable

sudo apt install -y unattended-upgrades fail2ban
sudo timedatectl set-timezone America/Sao_Paulo
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
nano Caddyfile                  # troque e-mail e subdomínio
docker compose up -d
docker compose logs -f          # procure "certificate obtained successfully"
```

Pronto: `https://agenda.seudominio.com.br`.

## Atualizar depois de um push

```bash
cd /opt/apps/agenda-eletrecista && git pull && docker compose up -d --build
```

## Backup do banco

```bash
docker exec agenda-db sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" agenda_eletricista' > backup-$(date +%F).sql
```
