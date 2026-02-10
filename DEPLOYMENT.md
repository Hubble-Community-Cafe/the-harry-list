# The Harry List - Portainer Deployment Guide

## Prerequisites
- Portainer environment already set up
- MariaDB database accessible via `mariadb_mariadb-network` network
- Database name, user, and password for the application

## Setup Instructions

### 1. Prepare the Database

On your existing MariaDB instance, create a database and user for The Harry List:

```sql
-- Connect to your MariaDB instance
-- Replace passwords with secure ones!

CREATE DATABASE IF NOT EXISTS harrylist;
CREATE USER IF NOT EXISTS 'harrylist_user'@'%' IDENTIFIED BY 'YOUR_SECURE_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON harrylist.* TO 'harrylist_user'@'%';
FLUSH PRIVILEGES;
```

### 2. Configure Environment Variables

Update the following environment variables in `docker-compose.yml`:

**Database Configuration:**
- `SPRING_DATASOURCE_URL`: Your database connection string
  - Format: `jdbc:mariadb://[HOST]:[PORT]/[DATABASE_NAME]`
  - Example: `jdbc:mariadb://db:3306/harrylist`
- `SPRING_DATASOURCE_USERNAME`: Database username (e.g., `harrylist_user`)
- `SPRING_DATASOURCE_PASSWORD`: Database password (CHANGE THIS!)

**Security Configuration:**
- `SPRING_SECURITY_USER_NAME`: Basic auth username for API access
- `SPRING_SECURITY_USER_PASSWORD`: Basic auth password (CHANGE THIS!)

**Network Configuration:**
- `mariadb_mariadb-network`: Name of your external MariaDB network
  - Update this if your network has a different name

### 3. Build and Push Docker Image

The project includes a GitHub Actions workflow that automatically builds and pushes the Docker image to GitHub Container Registry (ghcr.io) when you push to the main branch.

#### Automatic Build (Recommended)

1. Push your code to the `main` branch
2. GitHub Actions will automatically:
   - Run tests
   - Check for security vulnerabilities
   - Build the Docker image
   - Push to `ghcr.io/YOUR_GITHUB_USERNAME/the-harry-list-backend:latest`

3. Make sure your repository has packages enabled:
   - Go to your GitHub repository → Settings → Actions → General
   - Ensure "Read and write permissions" is enabled for GITHUB_TOKEN

4. After the first push, the image will be available at:
   ```
   ghcr.io/YOUR_GITHUB_USERNAME/the-harry-list-backend:latest
   ```

### 4. Deploy to Portainer

#### Option A: Using Pre-built Image from GitHub Container Registry (Recommended)

1. First, make sure the image is built and pushed (see step 3 above)

2. Make the GitHub package public (if it's private, you'll need authentication):
   - Go to your GitHub profile → Packages
   - Find `the-harry-list-backend`
   - Package settings → Change visibility → Public

3. In Portainer, go to **Stacks** → **Add Stack**

4. Choose **Web editor** and paste the content from `docker-compose.portainer.yml`:
   ```yaml
   version: '3.9'
   services:
     the-harry-list-backend:
       image: ghcr.io/YOUR_GITHUB_USERNAME/the-harry-list-backend:latest
       deploy:
         restart_policy:
           condition: on-failure
           delay: 5s
           max_attempts: 3
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
         - SPRING_DATASOURCE_PASSWORD=your_secure_password
         - SPRING_JPA_HIBERNATE_DDL_AUTO=update
         - SPRING_JPA_DATABASE_PLATFORM=org.hibernate.dialect.MariaDBDialect
         - SPRING_JPA_SHOW_SQL=false
         - SPRING_SECURITY_USER_NAME=admin
         - SPRING_SECURITY_USER_PASSWORD=your_secure_admin_password
         - LOGGING_LEVEL_ROOT=INFO
         - LOGGING_LEVEL_COM_PIMVANLEEUWEN=DEBUG
   
   networks:
     harry-list:
     mariadb_mariadb-network:
       external: true
   ```

5. **IMPORTANT**: Replace:
   - `YOUR_GITHUB_USERNAME` with your actual GitHub username
   - `your_secure_password` with your database password
   - `your_secure_admin_password` with your admin password
   - Update the MariaDB host in the URL if it's not `db`

6. Click **Deploy the stack**

#### Option B: Using Git Repository (Auto-build on Portainer)

1. In Portainer, go to **Stacks** → **Add Stack**
2. Choose **Repository** as the build method
3. Enter your Git repository URL
4. Set the Compose path to: `docker-compose.yml`
5. Under **Environment variables**, override the values:
   ```
   SPRING_DATASOURCE_URL=jdbc:mariadb://db:3306/harrylist
   SPRING_DATASOURCE_USERNAME=harrylist_user
   SPRING_DATASOURCE_PASSWORD=your_secure_password
   SPRING_SECURITY_USER_NAME=your_admin_username
   SPRING_SECURITY_USER_PASSWORD=your_secure_admin_password
   ```
6. Click **Deploy the stack**

Note: This option builds the image on the Portainer server, which may be slower.

### 4. Verify Deployment

After deployment, check:

1. **Container Health:**
   - Check logs in Portainer for any errors
   - Look for: "Started TheHarryListBackendApplication"

2. **Database Connection:**
   - Check logs for successful database connection
   - The application will automatically create tables on first run

3. **API Access:**
   - Test the API: `http://[YOUR_HOST]:9802/actuator/health`
   - Should return: `{"status":"UP"}`

4. **API Documentation:**
   - Access Swagger UI: `http://[YOUR_HOST]:9802/swagger-ui/index.html`

### 5. Network Configuration

The application connects to two networks:
- `harry-list`: Internal network for this application
- `mariadb_mariadb-network`: External network to access your shared database

Make sure the external network name matches your existing MariaDB network. Check with:
```bash
docker network ls | grep mariadb
```

If your network has a different name, update it in `docker-compose.yml`:
```yaml
networks:
  mariadb_mariadb-network:
    external: true
    name: YOUR_ACTUAL_NETWORK_NAME
```

## Port Mapping

- **9802**: The Harry List Backend API
  - Change this if the port conflicts with other services

## Security Considerations

1. **Change default passwords** in environment variables
2. **Use secrets** in Portainer for sensitive values (recommended):
   - Go to **Secrets** in Portainer
   - Create secrets for passwords
   - Reference them in docker-compose.yml
3. **Restrict access** to port 9802 if needed (firewall/reverse proxy)
4. Consider using **OAuth2** or **JWT** instead of basic auth for production

## Database Migration Strategy

The application uses `spring.jpa.hibernate.ddl-auto=update` which:
- ✅ Automatically creates missing tables
- ✅ Adds new columns
- ⚠️ Never drops existing tables or columns

For production, consider:
- Using Flyway or Liquibase for managed migrations
- Setting `ddl-auto=validate` after initial setup
- Managing schema changes explicitly

## Sharing Database with Other Applications

Since you're using a shared database:

1. **Use unique table prefixes** (optional):
   ```properties
   spring.jpa.hibernate.naming.physical-strategy=org.hibernate.boot.model.naming.PhysicalNamingStrategyStandardImpl
   spring.jpa.properties.hibernate.default_schema=harrylist
   ```

2. **Separate database** (recommended):
   - Each application gets its own database on the same MariaDB instance
   - Better isolation and easier to manage

3. **Connection limits**:
   - Monitor connection pool usage
   - Adjust `spring.datasource.hikari.maximum-pool-size` if needed

## Troubleshooting

### Container won't start
- Check logs in Portainer
- Verify database credentials
- Ensure network exists: `docker network inspect mariadb_mariadb-network`

### Can't connect to database
- Verify the database host name (usually `db` or your MariaDB container name)
- Check if the application container is in the correct network
- Test connection from container:
  ```bash
  docker exec -it <container_name> ping db
  ```

### Port conflicts
- Change the port mapping in docker-compose.yml: `"XXXX:8080"`
- Update firewall rules if needed

## Monitoring

Access monitoring endpoints:
- Health: `http://[HOST]:9802/actuator/health`
- Info: `http://[HOST]:9802/actuator/info`

## Updating the Application

1. Rebuild the image with new changes
2. In Portainer, go to your stack
3. Click **Editor** to edit the stack
4. Scroll down and click **Update the stack**
5. Enable **Re-pull image and redeploy**
6. Click **Update**

---

## Quick Reference

**Default Credentials** (CHANGE THESE!):
- Username: `admin`
- Password: `CHANGE_ME_ADMIN_PASSWORD`

**Endpoints**:
- API Base: `http://[HOST]:9802`
- Health Check: `http://[HOST]:9802/actuator/health`
- Swagger UI: `http://[HOST]:9802/swagger-ui/index.html`
- API Docs: `http://[HOST]:9802/v3/api-docs`

**Database Configuration**:
- Host: `db` (or your MariaDB container name)
- Port: `3306`
- Database: `harrylist`
- User: `harrylist_user`

