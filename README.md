# The Harry List

Bar reservation system for Stichting Bar Potential.

## Architecture

| Component | Stack |
|-----------|-------|
| Backend | Spring Boot 3.5 (Java 17), MariaDB |
| Admin Portal | React + TypeScript, Microsoft Entra ID auth |
| Public Form | React + TypeScript |

## Local Development

1. **Create `.env`** from the example:
   ```bash
   cp .env.example .env
   ```

2. **Fill in Azure AD values** in `.env`:
   ```env
   AZURE_CLIENT_ID=your-client-id
   AZURE_TENANT_ID=your-tenant-id
   ALLOWED_GROUP_ID=your-group-id  # optional
   ```

3. **Start all services**:
   ```bash
   docker compose up --build
   ```

4. **Access**:
   - Public form: http://localhost:5173
   - Admin portal: http://localhost:5174
   - Backend API: http://localhost:8080
   - Swagger UI: http://localhost:8080/swagger-ui/index.html

## Production Deployment

### Prerequisites
- GitHub repository with Actions enabled
- Portainer with access to an existing MariaDB instance
- Azure AD App Registration configured

### Setup

1. **Push to `main` branch** — GitHub Actions builds and pushes Docker images to `ghcr.io`

2. **Copy `docker-compose.portainer.template.yml`** and replace:
   - `YOUR_GITHUB_USERNAME` with your GitHub username (lowercase)
   - All `__PLACEHOLDER__` values with actual configuration

3. **Required environment variables**:

   | Variable | Description |
   |----------|-------------|
   | `SPRING_DATASOURCE_URL` | MariaDB connection string |
   | `SPRING_DATASOURCE_USERNAME` | Database user |
   | `SPRING_DATASOURCE_PASSWORD` | Database password |
   | `AZURE_TENANT_ID` | Azure AD tenant ID |
   | `AZURE_CLIENT_ID` | Azure AD client ID |
   | `GRAPH_CLIENT_SECRET` | Azure AD client secret (for email) |
   | `ALLOWED_GROUP_ID` | Azure AD group ID for admin access |

4. **Deploy** the stack in Portainer using the modified compose file

## Azure AD App Registration

Required configuration:
- **Redirect URIs**: Add your admin portal URL (e.g., `https://admin.yourdomain.com`)
- **API Permissions**: `User.Read`, `GroupMember.Read.All` (for group-based access)
- **Expose an API**: Create scope `access_as_user` with Application ID URI `api://{client-id}`
- **Client Secret**: Generate one for email functionality (backend only)
