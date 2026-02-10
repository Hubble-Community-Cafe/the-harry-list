# The Harry List 
Bar Reservation System for Stichting Bar Potential Under Development

## 🚀 Quick Start

### Local Development
```bash
# Run with docker-compose (includes local MariaDB)
docker-compose up --build
```

The backend will be available at: `http://localhost:8080`

### Production Deployment to Portainer

**📋 [Quick Start Guide](QUICKSTART.md)** - Step-by-step deployment instructions

**📚 [Full Deployment Guide](DEPLOYMENT.md)** - Comprehensive documentation

**Key Features:**
- ✅ Automatic Docker builds via GitHub Actions
- ✅ Deploys to GitHub Container Registry (ghcr.io)
- ✅ Connects to your existing MariaDB instance
- ✅ Production-ready configuration

## 🏗️ Architecture

- **Backend**: Spring Boot 3.5.6 (Java 17)
- **Database**: MariaDB
- **Security**: Spring Security with Basic Auth
- **API Documentation**: OpenAPI 3 / Swagger UI

## 📖 API Documentation

When running, access Swagger UI at:
- Local: `http://localhost:8080/swagger-ui/index.html`
- Production: `http://YOUR_SERVER:9802/swagger-ui/index.html`

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SPRING_DATASOURCE_URL` | Database connection URL | `jdbc:mariadb://db:3306/harrylist` |
| `SPRING_DATASOURCE_USERNAME` | Database username | `harrylist_user` |
| `SPRING_DATASOURCE_PASSWORD` | Database password | - |
| `SPRING_SECURITY_USER_NAME` | API admin username | `admin` |
| `SPRING_SECURITY_USER_PASSWORD` | API admin password | - |

See `application-prod.properties` for all available options.

## 🔐 Security

- API uses HTTP Basic Authentication
- Change default credentials before deploying
- Database passwords should be stored securely
- Consider using Portainer secrets for sensitive values

## 🧪 Testing

```bash
cd the-harry-list-backend
mvn test
```

## 📦 CI/CD

GitHub Actions automatically:
1. Runs tests on every push
2. Checks for security vulnerabilities
3. Builds and pushes Docker image to ghcr.io (on main branch)
