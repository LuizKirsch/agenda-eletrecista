# Deploy na VPS (Ubuntu + Docker + Caddy)

Arquitetura: **Caddy** (único com portas 80/443, HTTPS automático) → rede Docker `proxy` → **agenda-app** (Express servindo API + build do React) → rede `interna` → **MySQL**.

VPS: `187.41.125.189` (Hostinger), acesso como `root`. Endereço do app: **https://agenda.187-41-125-189.sslip.io**

## 1. DNS

Nada a fazer por enquanto: o sslip.io resolve `agenda.187-41-125-189.sslip.io` direto para o IP.
Quando tiver domínio próprio, crie um registro **A** `agenda` → `187.41.125.189` e troque o nome no `Caddyfile`.

## 2. Primeiro acesso e segurança básica

```bash
ssh root@187.41.125.189
apt update && apt upgrade -y
```

Chave SSH — no SEU computador (PowerShell). Gere a chave se ainda não tiver:

```powershell
ssh-keygen -t ed25519
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@187.41.125.189 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

Abra **outro terminal** e teste `ssh root@187.41.125.189` — tem que entrar sem pedir a senha da VPS.
Só então, na VPS, desligue o login por senha (o root continua entrando, mas só com a chave):

```bash
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/; s/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
# o Ubuntu às vezes reativa a senha num arquivo extra; garante que fique desligado:
grep -rl PasswordAuthentication /etc/ssh/sshd_config.d/ 2>/dev/null | xargs -r sed -i 's/^PasswordAuthentication.*/PasswordAuthentication no/'
systemctl restart ssh

# firewall: só SSH, HTTP e HTTPS
ufw allow OpenSSH && ufw allow 80 && ufw allow 443
ufw enable

apt install -y unattended-upgrades fail2ban
timedatectl set-timezone America/Sao_Paulo

# se a VPS tiver 1 GB de RAM (confira com free -h), crie swap:
# fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
# echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

> Perdeu a chave? Dá pra entrar pelo console web no painel da Hostinger e reativar a senha.

## 3. Docker

```bash
curl -fsSL https://get.docker.com | sh
docker network create proxy     # rede compartilhada entre o Caddy e os apps
```

## 4. Aplicação

```bash
mkdir -p /opt/apps && cd /opt/apps
git clone https://github.com/LuizKirsch/agenda-eletrecista.git && cd agenda-eletrecista
cp .env.production.example .env
nano .env                       # senhas do banco, JWT_SECRET (openssl rand -hex 48), dados da secretária
docker compose up -d --build
docker compose logs -f app      # deve aparecer as migrations e "Servidor rodando na porta 3000"
```

> Repo privado? Use um token (`git clone https://SEU_TOKEN@github.com/...`) ou uma deploy key.

## 5. Proxy (Caddy)

```bash
mkdir -p /opt/proxy
cp deploy/proxy/* /opt/proxy/ && cd /opt/proxy
docker compose up -d
docker compose logs -f          # procure "certificate obtained successfully"
```

Pronto: https://agenda.187-41-125-189.sslip.io

Se o HTTPS não sair, confira se as portas 80 e 443 estão liberadas no `ufw` e no firewall do painel da Hostinger.

## Atualizar depois de um push

```bash
cd /opt/apps/agenda-eletrecista && git pull && docker compose up -d --build
```

## Backup do banco

```bash
docker exec agenda-db sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" agenda_eletricista' > backup-$(date +%F).sql
```

> Cuidado: `docker compose down -v` apaga o volume do banco. Use só `down` (sem `-v`).
