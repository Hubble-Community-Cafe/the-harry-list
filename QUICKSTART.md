# Quick Start: Portainer Deployment

## Prerequisites
✅ Portainer environment running
✅ MariaDB accessible via `mariadb_mariadb-network`
✅ GitHub repository with code pushed to `main` branch

## Step-by-Step Deployment

### 1️⃣ Prepare Database (One-time setup)

Connect to your MariaDB and run:

```sql
CREATE DATABASE IF NOT EXISTS harrylist;
CREATE USER IF NOT EXISTS 'harrylist_user'@'%' IDENTIFIED BY 'YOUR_SECURE_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON harrylist.* TO 'harrylist_user'@'%';
FLUSH PRIVILEGES;
```

### 2️⃣ Build Docker Image (Automatic via GitHub Actions)

1. Push your code to the `main` branch:
   ```bash
   git add .
   git commit -m "Deploy to production"
   git push origin main
   ```

2. GitHub Actions will automatically build and push the image to:
   ```
   ghcr.io/YOUR_GITHUB_USERNAME/the-harry-list-backend:latest
   ```

3. Make the package public (first time only):
   - Go to https://github.com/YOUR_USERNAME?tab=packages
   - Click on `the-harry-list-backend`
   - Click **Package settings** (right side)
   - Scroll down to **Danger Zone**
   - Click **Change visibility** → **Public**

### 3️⃣ Deploy in Portainer

1. **Open Portainer** → **Stacks** → **Add Stack**

2. **Name your stack**: `the-harry-list`

3. **Choose "Web editor"** and paste this configuration:

```yaml
version: '3.9'
services:
  the-harry-list-backend:
    image: ghcr.io/YOUR_GITHUB_USERNAME/the-harry-list-backend:latest
    deploy:
      restart_policy:
        condition: on-failure
        delay: 5s
    ports:
      - "9802:8080"
    networks:
      - harry-list
      - mariadb_mariadb-network
    environment:
      - SPRING_PROFILES_ACTIVE=prod
      - TZ=Europe/Amsterdam
      - SPRING_DATASOURCE_URL=jdbc:mariadb://db:3306/harrylist
      - SPRING_DATASOURCE_USERNAME=harrylist_user
      - SPRING_DATASOURCE_PASSWORD=YOUR_DB_PASSWORD_HERE
      - SPRING_JPA_HIBERNATE_DDL_AUTO=update
      - SPRING_JPA_DATABASE_PLATFORM=org.hibernate.dialect.MariaDBDialect
      - SPRING_JPA_SHOW_SQL=false
      - SPRING_SECURITY_USER_NAME=admin
      - SPRING_SECURITY_USER_PASSWORD=YOUR_ADMIN_PASSWORD_HERE
      - LOGGING_LEVEL_ROOT=INFO
      - LOGGING_LEVEL_COM_PIMVANLEEUWEN=DEBUG

networks:
  harry-list:
  mariadb_mariadb-network:
    external: true
```

4. **Replace these values**:
   - `YOUR_GITHUB_USERNAME` → Your GitHub username (e.g., `pimvanleeuwen`)
   - `YOUR_DB_PASSWORD_HERE` → Your database password from step 1
   - `YOUR_ADMIN_PASSWORD_HERE` → Choose a secure password for API access
   - `db` in the database URL → Your actual MariaDB container name (if different)

5. **Click "Deploy the stack"**

### 4️⃣ Verify Deployment

1. **Check container logs** in Portainer:
   - Go to **Containers**
   - Click on `the-harry-list_the-harry-list-backend`
   - Look for: `Started TheHarryListBackendApplication`

2. **Test health endpoint**:
   ```bash
   curl http://YOUR_SERVER:9802/actuator/health
   ```
   Should return: `{"status":"UP"}`

3. **Access Swagger UI**:
   ```
   http://YOUR_SERVER:9802/swagger-ui/index.html
   ```

4. **Test API** (using basic auth):
   ```bash
   curl -u admin:YOUR_ADMIN_PASSWORD http://YOUR_SERVER:9802/reservations
   ```

---

## Updating the Application

### Automatic Update (Recommended)

1. **Make changes** to your code
2. **Commit and push** to main branch:
   ```bash
   git add .
   git commit -m "Update feature"
   git push origin main
   ```
3. **Wait** for GitHub Actions to build and push (check Actions tab)
4. **In Portainer**:
   - Go to your stack
   - Click **Editor**
   - Scroll to bottom
   - Click **Update the stack**
   - ✅ Enable "Re-pull image and redeploy"
   - Click **Update**

---

## Troubleshooting

### ❌ Can't connect to database
- Check if `mariadb_mariadb-network` exists: `docker network ls`
- Verify database host name in the URL (usually `db` or your MariaDB container name)
- Test from container: `docker exec -it <container_name> ping db`

### ❌ Image not found
- Make sure GitHub Actions completed successfully
- Check if package is public on GitHub
- Verify image name matches your GitHub username

### ❌ Container keeps restarting
- Check logs in Portainer for error messages
- Common issues:
  - Wrong database credentials
  - Database not accessible
  - Port 9802 already in use

### ❌ Port conflict
Change the port in the stack configuration:
```yaml
ports:
  - "XXXX:8080"  # Change XXXX to an available port
```

---

## Quick Reference

**Your Stack Configuration**:
- Name: `the-harry-list`
- Port: `9802`
- Image: `ghcr.io/YOUR_GITHUB_USERNAME/the-harry-list-backend:latest`

**Endpoints**:
- API: `http://YOUR_SERVER:9802`
- Health: `http://YOUR_SERVER:9802/actuator/health`
- Swagger: `http://YOUR_SERVER:9802/swagger-ui/index.html`

**Authentication**:
- Type: HTTP Basic Auth
- Username: From `SPRING_SECURITY_USER_NAME`
- Password: From `SPRING_SECURITY_USER_PASSWORD`

**Networks**:
- `harry-list` - Internal network
- `mariadb_mariadb-network` - External MariaDB network

---

## Need Help?

1. Check container logs in Portainer
2. View GitHub Actions logs: Repository → Actions tab
3. Review full documentation: `DEPLOYMENT.md`

