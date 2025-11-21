# Deployment Guide for Vercel

This guide will help you deploy the IB MYP Unit Planner AI to Vercel.

## Prerequisites

- A GitHub account with this repository
- A Vercel account (sign up at https://vercel.com)
- A Google Gemini API key (get one at https://aistudio.google.com/app/apikey)

## Quick Deploy

The fastest way to deploy is using the Vercel Deploy Button:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/medch24/Plan-IB)

## Manual Deployment Steps

### 1. Push to GitHub

Make sure your code is pushed to your GitHub repository:

```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### 2. Import to Vercel

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your `medch24/Plan-IB` repository
4. Vercel will automatically detect it's a Vite project

### 3. Configure Build Settings

Vercel should automatically detect these settings (verify they match):

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 4. Add Environment Variables

In the Vercel project settings, add the following environment variable:

- **Name**: `GEMINI_API_KEY`
- **Value**: Your Google Gemini API key
- **Environment**: Production, Preview, Development (select all)

### 5. Deploy

Click "Deploy" and wait for the build to complete (usually takes 1-2 minutes).

## Post-Deployment

### Verify Deployment

After deployment, Vercel will provide you with a URL like:
- `https://your-project.vercel.app`

Visit this URL to verify your application is working correctly.

### Custom Domain (Optional)

To add a custom domain:

1. Go to your project settings in Vercel
2. Click on "Domains"
3. Add your custom domain
4. Follow the DNS configuration instructions

## Troubleshooting

### Build Fails

If your build fails, check:

1. All dependencies are listed in `package.json`
2. The `GEMINI_API_KEY` environment variable is set correctly
3. Node.js version is compatible (>= 18.0.0)

### App Loads but Doesn't Work

1. Check the browser console for errors
2. Verify the `GEMINI_API_KEY` is set in Vercel environment variables
3. Make sure you've enabled the Gemini API in your Google Cloud project

### API Key Issues

If you get API errors:

1. Verify your API key is valid at https://aistudio.google.com/app/apikey
2. Make sure the API key has the correct permissions
3. Check if you've hit any API rate limits

## Updating Your Deployment

Vercel automatically deploys when you push to your GitHub repository:

```bash
git add .
git commit -m "Update application"
git push origin main
```

Vercel will automatically trigger a new deployment.

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key for AI generation | Yes |

## Build Configuration Files

- `vercel.json` - Vercel-specific configuration
- `vite.config.ts` - Vite build configuration
- `.nvmrc` - Node.js version specification
- `package.json` - Dependencies and build scripts

## Support

For issues with:
- **Vercel deployment**: Check [Vercel Documentation](https://vercel.com/docs)
- **Application bugs**: Open an issue on GitHub
- **Gemini API**: Check [Google AI Studio](https://ai.google.dev/)
