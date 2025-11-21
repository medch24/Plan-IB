<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# IB MYP Unit Planner AI

An intelligent unit planning tool for IB MYP teachers, powered by Google's Gemini AI.

View your app in AI Studio: https://ai.studio/apps/drive/10z-rymNTf-5Ck-9yh_nqtV8JXau6plNH

## Features

- 🤖 AI-powered unit plan generation
- 📝 Complete MYP unit planning framework
- 💾 Local storage for saving plans
- 📊 Dashboard with analytics
- 📄 Export to Word document
- 🎯 Subject-specific customization

## Run Locally

**Prerequisites:**  Node.js (v18 or higher)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file and set your Gemini API key:
   ```bash
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deploy to Vercel

### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/medch24/Plan-IB)

### Manual Deploy

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add environment variable `GEMINI_API_KEY` in Vercel project settings
4. Deploy!

### Environment Variables

Make sure to set the following environment variable in Vercel:

- `GEMINI_API_KEY`: Your Google Gemini API key

## Build

To create a production build:

```bash
npm run build
```

The build output will be in the `dist` directory.

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Google Gemini AI** - AI generation
- **Lucide React** - Icons
- **Docxtemplater** - Word export
