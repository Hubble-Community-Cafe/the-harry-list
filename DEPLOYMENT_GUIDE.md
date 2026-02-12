# The Harry List - Production Deployment Guide

This guide covers deploying The Harry List application to production using GitHub Actions CI/CD and Portainer.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [GitHub Repository Setup](#github-repository-setup)
3. [Azure AD Setup for Microsoft Login](#azure-ad-setup-for-microsoft-login)
4. [Azure AD Setup for Email (Microsoft Graph)](#azure-ad-setup-for-email-microsoft-graph)
5. [CI/CD Pipeline Configuration](#cicd-pipeline-configuration)
6. [Portainer Deployment](#portainer-deployment)
7. [DNS & Reverse Proxy Setup](#dns--reverse-proxy-setup)
8. [Verification](#verification)

---

## Prerequisites

- GitHub account with repository access
- Azure AD tenant (for Microsoft login and email)
- Server with Portainer installed
- MariaDB database server
- Domain names configured (e.g., `api.hubble.cafe`, `reservations.hubble.cafe`, `admin.hubble.cafe`)

---

## GitHub Repository Setup

### Step 1: Add GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret Name | Description | Example |
|-------------|-------------|---------|
| (none required) | All Azure settings are configured at runtime in Portainer | - |

> **Note:** `GITHUB_TOKEN` is automatically provided by GitHub Actions - you don't need to create it.
> **Note:** All Azure AD settings (Client ID, Tenant ID, Group ID) are configured in the Portainer docker-compose, not as GitHub secrets. This allows different deployments to use different Azure configurations.

### Step 2: Enable GitHub Packages

1. Go to repository **Settings** → **Actions** → **General**
2. Under "Workflow permissions", select **Read and write permissions**
3. Check "Allow GitHub Actions to create and approve pull requests"
4. Save

---

## Azure AD Setup for Microsoft Login

This enables staff to log in to the admin portal using their Microsoft 365 accounts.

### Step 1: Register an Application in Azure AD

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations** → **New registration**
3. Fill in:
   - **Name:** `The Harry List Admin Portal`
   - **Supported account types:** `Accounts in this organizational directory only (Single tenant)`
   - **Redirect URI:** Select `Single-page application (SPA)` and enter:
     - `https://admin.hubble.cafe` (production)
     - `http://localhost:5174` (local development)
4. Click **Register**

### Step 2: Configure the Application

1. After registration, note down:
   - **Application (client) ID** → This is your `AZURE_CLIENT_ID`
   - **Directory (tenant) ID** → This is your `AZURE_TENANT_ID`

2. Go to **Authentication**:
   - Under "Single-page application", ensure redirect URIs are added
   - Enable **Access tokens** and **ID tokens** under "Implicit grant and hybrid flows"
   - Set "Supported account types" as needed

3. Go to **API permissions**:
   - Click **Add a permission** → **Microsoft Graph** → **Delegated permissions**
   - Add: `User.Read`, `openid`, `profile`, `email`, `GroupMember.Read.All`
   - Click **Grant admin consent for [Your Organization]**

### Step 3: Create a Security Group for Access Control

1. Go to **Azure Active Directory** → **Groups** → **New group**
2. Fill in:
   - **Group type:** Security
   - **Group name:** `Harry List Admins` (or your preferred name)
   - **Group description:** `Users who can access The Harry List admin portal`
   - **Membership type:** Assigned
3. Click **Create**
4. Open the group and copy the **Object ID** → This is your `AZURE_ALLOWED_GROUP_ID`
5. Add staff members who should have access to the **Members** section

### Step 4: Configure Token to Include Groups (Optional but Recommended)

This allows the app to check group membership from the token instead of making API calls:

1. Go to your App Registration → **Token configuration**
2. Click **Add groups claim**
3. Select **Security groups**
4. For **ID token**, select **Group ID**
5. Click **Add**

---

## Azure AD Setup for Email (Microsoft Graph)

This enables the backend to send emails via Microsoft 365.

### Step 1: Register a Separate Application (or use the same one)

1. Go to **Azure AD** → **App registrations** → **New registration** (or use existing)
2. Fill in:
   - **Name:** `The Harry List Email Service`
   - **Supported account types:** `Accounts in this organizational directory only`
3. Click **Register**

### Step 2: Create a Client Secret

1. Go to **Certificates & secrets** → **New client secret**
2. Add a description (e.g., "Harry List Email") and set expiration
3. Click **Add**
4. **IMPORTANT:** Copy the secret value immediately (you won't see it again!)
   - This is your `GRAPH_CLIENT_SECRET`

### Step 3: Configure API Permissions

1. Go to **API permissions** → **Add a permission**
2. Select **Microsoft Graph** → **Application permissions**
3. Add: `Mail.Send`
4. Click **Grant admin consent for [Your Organization]**

### Step 4: Note the Values

You'll need these for Portainer:
- **Application (client) ID** → `GRAPH_CLIENT_ID`
- **Directory (tenant) ID** → `GRAPH_TENANT_ID`
- **Client secret** → `GRAPH_CLIENT_SECRET`

---

## CI/CD Pipeline Configuration

The CI pipeline (`.github/workflows/ci.yml`) automatically:
1. Runs tests on every push/PR
2. Builds and pushes Docker images to GitHub Container Registry on `main` branch

### Images Built

| Image | Description |
|-------|-------------|
| `ghcr.io/YOUR_USERNAME/the-harry-list-backend:latest` | Backend API |
| `ghcr.io/YOUR_USERNAME/the-harry-list-public:latest` | Public reservation form |
| `ghcr.io/YOUR_USERNAME/the-harry-list-admin:latest` | Admin portal |

### Triggering a Build

Push to `main` branch to trigger a build:
```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

### Verifying the Build

1. Go to **Actions** tab in GitHub
2. Check the latest workflow run
3. Verify all jobs completed successfully
4. Go to **Packages** to see the published Docker images

---

## Portainer Deployment

### Step 1: Prepare the Stack Configuration

1. Copy `docker-compose.portainer.template.yml`
2. Replace all placeholders:

```yaml
# Replace YOUR_GITHUB_USERNAME with your actual username (lowercase)
image: ghcr.io/yourusername/the-harry-list-backend:latest

# Replace database credentials
- SPRING_DATASOURCE_USERNAME=your_db_user
- SPRING_DATASOURCE_PASSWORD=your_db_password

# Replace API credentials (for admin endpoints)
- SPRING_SECURITY_USER_NAME=admin
- SPRING_SECURITY_USER_PASSWORD=your_secure_password

# Replace Azure credentials (from Step 4 above)
- GRAPH_TENANT_ID=your_tenant_id
- GRAPH_CLIENT_ID=your_client_id
- GRAPH_CLIENT_SECRET=your_client_secret
```

### Step 2: Create the Stack in Portainer

1. Log in to Portainer
2. Go to **Stacks** → **Add stack**
3. Enter stack name: `the-harry-list`
4. Paste your configured `docker-compose.yml`
5. Click **Deploy the stack**

### Step 3: Configure Registry Access (if needed)

If Portainer can't pull from GHCR:
1. Go to **Registries** → **Add registry**
2. Select **Custom registry**
3. Fill in:
   - **Name:** `GitHub Container Registry`
   - **Registry URL:** `ghcr.io`
   - **Username:** Your GitHub username
   - **Password:** A GitHub Personal Access Token with `read:packages` scope

### Step 4: Verify Deployment

Check that all containers are running:
- `the-harry-list-backend` on port 9802
- `the-harry-list-public` on port 9803
- `the-harry-list-admin` on port 9804

---

## DNS & Reverse Proxy Setup

### Recommended DNS Configuration

| Subdomain | Points To | Internal Port |
|-----------|-----------|---------------|
| `api.hubble.cafe` | Your server | 9802 |
| `reservations.hubble.cafe` | Your server | 9803 |
| `admin.hubble.cafe` | Your server | 9804 |

### Nginx Reverse Proxy Example

```nginx
# API Backend
server {
    listen 443 ssl http2;
    server_name api.hubble.cafe;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:9802;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Public Frontend
server {
    listen 443 ssl http2;
    server_name reservations.hubble.cafe;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:9803;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Admin Frontend
server {
    listen 443 ssl http2;
    server_name admin.hubble.cafe;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:9804;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Verification

### 1. Test Public Reservation Form

1. Go to `https://reservations.hubble.cafe`
2. Fill out and submit a test reservation
3. Verify you receive a confirmation number
4. Check your email for confirmation

### 2. Test Admin Portal

1. Go to `https://admin.hubble.cafe`
2. Click "Sign in with Microsoft"
3. Log in with an authorized Microsoft 365 account
4. Verify you can see the reservation you just created
5. Test approving/rejecting reservations

### 3. Test Email Notifications

1. Create a reservation
2. Check that staff receives notification email
3. Approve the reservation in admin portal
4. Check that customer receives confirmation email

---

## Troubleshooting

### Container won't start
- Check Portainer logs for error messages
- Verify all environment variables are set correctly
- Ensure database is accessible from the container network

### Microsoft login not working
- Verify redirect URIs match exactly in Azure AD
- Check browser console for errors
- Ensure user is assigned to the application (if assignment required)

### Access Denied after login
- Verify the user is a member of the security group specified in `AZURE_ALLOWED_GROUP_ID`
- Check that `GroupMember.Read.All` permission has admin consent
- If using token claims, verify groups claim is configured in Token configuration
- Check browser console for detailed error messages

### Emails not sending
- Verify `APP_MAIL_ENABLED=true`
- Check GRAPH credentials are correct
- Verify Mail.Send permission has admin consent
- Check backend logs for Graph API errors

### Images not pulling
- Verify GitHub Packages registry is accessible
- Check Portainer has correct registry credentials
- Ensure images are public or credentials have read access

---

## Updating the Application

To deploy updates:

1. Push changes to `main` branch
2. Wait for GitHub Actions to build new images
3. In Portainer, go to your stack
4. Click **Pull and redeploy** (or manually pull each image)

---

## Environment Variables Reference

### Backend (`the-harry-list-backend`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SPRING_DATASOURCE_URL` | Yes | Database JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | Yes | Database username |
| `SPRING_DATASOURCE_PASSWORD` | Yes | Database password |
| `SPRING_SECURITY_USER_NAME` | Yes | Basic auth username for admin API |
| `SPRING_SECURITY_USER_PASSWORD` | Yes | Basic auth password for admin API |
| `APP_MAIL_ENABLED` | Yes | Enable/disable emails (`true`/`false`) |
| `APP_MAIL_FROM` | Yes | Sender email address |
| `APP_MAIL_STAFF` | Yes | Staff notification email |
| `APP_BAR_NAME` | Yes | Bar name for emails |
| `GRAPH_TENANT_ID` | If mail enabled | Azure AD tenant ID |
| `GRAPH_CLIENT_ID` | If mail enabled | Azure AD client ID |
| `GRAPH_CLIENT_SECRET` | If mail enabled | Azure AD client secret |

### Frontend (Build-time)

No secrets are required at build time. All configuration is done at runtime via environment variables.

### Public Frontend (Runtime)

These variables are set in Portainer docker-compose and injected at container startup.

| Variable | Required | Description |
|----------|----------|-------------|
| `API_URL` | Yes | Backend API URL (e.g., `https://api.hubble.cafe`) |

### Admin Frontend (Runtime)

These variables are set in Portainer docker-compose and injected at container startup.

| Variable | Required | Description |
|----------|----------|-------------|
| `API_URL` | Yes | Backend API URL (e.g., `https://api.hubble.cafe`) |
| `AZURE_CLIENT_ID` | Yes | Azure AD Application (client) ID |
| `AZURE_TENANT_ID` | Yes | Azure AD Directory (tenant) ID |
| `REDIRECT_URI` | Yes | OAuth redirect URI (e.g., `https://admin.hubble.cafe`) |
| `ALLOWED_GROUP_ID` | Yes | Azure AD Group ID - only members can access admin portal |

> **Tip:** To change any setting, just update the environment variable in Portainer and restart the container. No rebuild needed!

