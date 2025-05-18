# Deployment Guide

This guide explains how to deploy the blog application to Render (backend) and Vercel (frontend).

## Backend Deployment (Render)

### Prerequisites
- A [Render](https://render.com/) account
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account (or other MongoDB provider)
- Your code pushed to a GitHub repository

### Steps to Deploy Backend on Render

1. **Log in to Render** and go to your dashboard.

2. **Create a new Web Service**:
   - Click "New" and select "Web Service"
   - Connect your GitHub repository
   - Select the repository containing your blog project

3. **Configure the Web Service**:
   - Name: `blog-api` (or your preferred name)
   - Runtime: `Python`
   - Build Command: `cd server && pip install -r requirements.txt && python manage.py collectstatic --noinput`
   - Start Command: `cd server && gunicorn blog_project.wsgi:application`
   - Select the appropriate plan (Free tier is fine for testing)

4. **Set Environment Variables**:
   Add the following environment variables in the Render dashboard:

   ```
   SECRET_KEY=your-secure-secret-key
   DEBUG=False
   ALLOWED_HOST=my-blog-pre.onrender.com
   FRONTEND_URL=https://my-blog-pre01.vercel.app
   CORS_ALLOW_ALL=False

   # If using MongoDB Atlas
   DB_NAME=your-mongodb-name
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/your-db-name

   # If using Render PostgreSQL
   DATABASE_URL=postgres://username:password@host:port/database
   ```

5. **Deploy the Service**:
   - Click "Create Web Service"
   - Wait for the build and deployment to complete

6. **Note your API URL**:
   - Your API will be available at `https://your-service-name.onrender.com`
   - Save this URL for configuring your frontend

## Frontend Deployment (Vercel)

1. **Log in to Vercel** and go to your dashboard.

2. **Import your project**:
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Vercel should automatically detect that it's a React project

3. **Configure the project**:
   - Set the root directory to `client`
   - Build Command: `npm run build` (should be auto-detected)
   - Output Directory: `dist` (for Vite projects)

4. **Set Environment Variables**:
   Add the following environment variables:

   ```
   VITE_API_URL=https://my-blog-pre.onrender.com
   ```

5. **Deploy**:
   - Click "Deploy"
   - Wait for the build and deployment to complete

6. **Note your Frontend URL**:
   - Your frontend will be available at the URL provided by Vercel
   - Update the `FRONTEND_URL` in your Render environment variables with this URL

## Handling Environment Variables Between Local and Production

### For Backend (Django)

The Django settings have been configured to handle both local and production environments:

```python
# In settings.py
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '.onrender.com', os.getenv('ALLOWED_HOST', '')]

# CORS settings
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Local Vite development server
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

# Add production frontend URL if available
if os.getenv('FRONTEND_URL'):
    CORS_ALLOWED_ORIGINS.append(os.getenv('FRONTEND_URL'))

# For development only, allow all origins
CORS_ALLOW_ALL_ORIGINS = os.getenv('CORS_ALLOW_ALL', 'False').lower() == 'true'
```

### For Frontend (React)

In your React application, create a configuration file that handles both local and production environments:

```javascript
// In client/src/config.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default {
  API_URL
};
```

Then use this configuration in your API calls:

```javascript
import config from './config';

// Example API call
fetch(`${config.API_URL}/api/posts/`)
  .then(response => response.json())
  .then(data => console.log(data));
```

## Testing Your Deployment

1. **Test the backend API**:
   - Visit `https://my-blog-pre.onrender.com/api/posts/` to verify the API is working

2. **Test the frontend**:
   - Visit `https://my-blog-pre01.vercel.app` and ensure it can communicate with the backend
   - Test all functionality: authentication, creating posts, etc.

## Troubleshooting

- **CORS Issues**: Ensure your `FRONTEND_URL` is correctly set in the backend environment variables
- **Database Connection**: Verify your MongoDB connection string is correct
- **404 Errors**: Check your API routes and ensure they match between frontend and backend
- **Deployment Logs**: Check the logs in both Render and Vercel for specific error messages

## Maintenance

- **Updating Your Application**:
  - Push changes to your GitHub repository
  - Render and Vercel will automatically rebuild and deploy your application

- **Monitoring**:
  - Use the Render and Vercel dashboards to monitor your application's performance
  - Set up alerts for any issues
