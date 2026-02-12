# Frontend Applications

The Harry List includes two frontend applications:

1. **Public Reservation Form** (`the-harry-list-public`) - For customers to submit reservations
2. **Admin Portal** (`the-harry-list-admin`) - For staff to manage reservations with Microsoft login

## Technology Stack

Both applications use:
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **React Hook Form** + **Zod** for form handling

Admin Portal additionally uses:
- **MSAL React** for Microsoft authentication
- **React Router** for navigation

## Color Theme

Inspired by Hubble and Meteor Community Cafés:
- **Hubble Purple**: `#8b5cf6` (primary)
- **Meteor Orange**: `#f97316` (secondary)
- **Dark Background**: `#0f172a`

---

## Local Development

### Prerequisites
- Node.js 20+
- npm or yarn

### Public Reservation Form

```bash
cd the-harry-list-public

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm run dev
```

Opens at: http://localhost:5173

### Admin Portal

```bash
cd the-harry-list-admin

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your Azure AD credentials

# Start development server
npm run dev
```

Opens at: http://localhost:5174

---

## Environment Variables

### Public Frontend

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://harry.hubble.cafe` |

### Admin Portal

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | Yes |
| `VITE_AZURE_CLIENT_ID` | Azure AD App Client ID | Yes |
| `VITE_AZURE_TENANT_ID` | Azure AD Tenant ID | Yes |
| `VITE_REDIRECT_URI` | OAuth redirect URI | Yes |

---

## Azure AD Setup for Admin Portal

### 1. Register Application in Azure AD

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Fill in:
   - **Name**: `The Harry List Admin`
   - **Supported account types**: Accounts in this organizational directory only
   - **Redirect URI**: 
     - Type: `Single-page application (SPA)`
     - URL: `https://admin.harry.hubble.cafe` (or your production URL)
5. Click **Register**

### 2. Note Your Application IDs

After registration:
- **Application (client) ID** → `VITE_AZURE_CLIENT_ID`
- **Directory (tenant) ID** → `VITE_AZURE_TENANT_ID`

### 3. Configure Authentication

1. Go to **Authentication**
2. Under **Single-page application**, add redirect URIs:
   - `http://localhost:5174` (development)
   - `https://admin.harry.hubble.cafe` (production)
3. Enable **Access tokens** and **ID tokens**
4. Save

### 4. Configure API Permissions

1. Go to **API permissions**
2. Add permissions:
   - Microsoft Graph → Delegated → `User.Read`
   - Microsoft Graph → Delegated → `openid`
   - Microsoft Graph → Delegated → `profile`
   - Microsoft Graph → Delegated → `email`

---

## Building for Production

### Public Frontend

```bash
cd the-harry-list-public

# Build
VITE_API_URL=https://harry.hubble.cafe npm run build

# Output in: dist/
```

### Admin Portal

```bash
cd the-harry-list-admin

# Build with Azure AD credentials
VITE_API_URL=https://harry.hubble.cafe \
VITE_AZURE_CLIENT_ID=your-client-id \
VITE_AZURE_TENANT_ID=your-tenant-id \
VITE_REDIRECT_URI=https://admin.harry.hubble.cafe \
npm run build

# Output in: dist/
```

---

## Docker Build

### Public Frontend

```bash
cd the-harry-list-public

docker build \
  --build-arg VITE_API_URL=https://harry.hubble.cafe \
  -t the-harry-list-public .
```

### Admin Portal

```bash
cd the-harry-list-admin

docker build \
  --build-arg VITE_API_URL=https://harry.hubble.cafe \
  --build-arg VITE_AZURE_CLIENT_ID=your-client-id \
  --build-arg VITE_AZURE_TENANT_ID=your-tenant-id \
  --build-arg VITE_REDIRECT_URI=https://admin.harry.hubble.cafe \
  -t the-harry-list-admin .
```

---

## Deployment Ports

| Service | Development | Production (Portainer) |
|---------|-------------|------------------------|
| Backend API | 8080 | 9802 |
| Public Frontend | 5173 | 9803 |
| Admin Portal | 5174 | 9804 |

---

## Project Structure

### Public Frontend
```
the-harry-list-public/
├── src/
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── ReservationForm.tsx
│   │   └── SuccessMessage.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   └── utils.ts
│   ├── types/
│   │   └── reservation.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── Dockerfile
├── nginx.conf
└── package.json
```

### Admin Portal
```
the-harry-list-admin/
├── src/
│   ├── components/
│   │   └── Layout.tsx
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── ReservationsPage.tsx
│   │   └── ReservationDetailPage.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   ├── authConfig.ts
│   │   └── utils.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── Dockerfile
├── nginx.conf
└── package.json
```

---

## Features

### Public Reservation Form
- ✅ Multi-step form with progress indicator
- ✅ Form validation with Zod
- ✅ Location selection (Hubble / Meteor)
- ✅ Date and time picker
- ✅ Payment options
- ✅ Food requirements
- ✅ Success confirmation with reservation number
- ✅ Responsive design
- ✅ Dark theme with purple/orange accents

### Admin Portal
- ✅ Microsoft SSO login
- ✅ Dashboard with statistics
- ✅ Reservation list with search/filter
- ✅ Reservation detail view
- ✅ Status management (Confirm/Reject/Cancel/Complete)
- ✅ Email notification toggle
- ✅ Delete confirmation
- ✅ Responsive sidebar navigation
- ✅ Dark theme matching public site

---

## API Integration

Both frontends connect to the backend API:

### Public Frontend
- `POST /api/public/reservations` - Submit new reservation

### Admin Portal
- `GET /api/reservations` - List all reservations
- `GET /api/reservations/{id}` - Get reservation details
- `PUT /api/reservations/{id}` - Update reservation
- `DELETE /api/reservations/{id}` - Delete reservation
- `PATCH /api/admin/reservations/{id}/status` - Update status

---

## Customization

### Colors
Edit `tailwind.config.js` to change the color scheme:

```javascript
colors: {
  hubble: {
    500: '#8b5cf6', // Main purple
    // ... other shades
  },
  meteor: {
    500: '#f97316', // Main orange
    // ... other shades
  },
}
```

### Logo
Replace the Coffee icon in `Header.tsx` with your own logo.

### Branding
Update text in:
- `Header.tsx` - Site title
- `Footer.tsx` - Copyright and links
- `LoginPage.tsx` - Login page branding

---

## Troubleshooting

### CORS Issues
Make sure your backend allows requests from the frontend URLs. Check `SecurityConfig.java`.

### Microsoft Login Not Working
1. Verify Azure AD app registration
2. Check redirect URIs match exactly
3. Ensure tenant ID and client ID are correct
4. Check browser console for errors

### API Connection Failed
1. Check `VITE_API_URL` is correct
2. Verify backend is running
3. Check network tab for request/response details

---

## Next Steps

1. **Run locally**: `npm run dev` in each frontend directory
2. **Configure Azure AD** for admin portal
3. **Build Docker images** for deployment
4. **Deploy to Portainer** using the template
5. **Configure reverse proxy** (nginx/openresty) for custom domains

