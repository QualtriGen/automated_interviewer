# AI Interview Bot for Qualtrics

An intelligent interview bot for Qualtrics surveys that conducts empathetic conversations about negative consumer experiences, using Google's Gemini AI with a secure Flask backend.

## Overview

This tool provides an AI-powered interview interface in Qualtrics surveys that can conduct natural conversations with intelligent response analysis. It consists of:

1. **Flask Backend** (`app.py`) - Securely handles Gemini API requests
2. **Qualtrics Frontend** (`GenAI_interview_bot_client.js`) - JavaScript for the chat interface with voice input support

## Quick Start

### 1. Deploy the Backend to Render

1. Fork/clone this repository to your GitHub account

2. Go to [Render Dashboard](https://dashboard.render.com/)

3. Click "New +" → "Web Service" and connect your GitHub repo

4. Configure:
   - **Name**: `interview-bot-api`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`

5. Add environment variable:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: Your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

6. Click "Create Web Service" and wait for deployment

7. Note your service URL: `https://[your-service-name].onrender.com`

### 2. Set Up Qualtrics

1. Edit `GenAI_interview_bot_client.js`:
   ```javascript
   BACKEND_URL: 'https://[your-service-name].onrender.com'
   ```

2. In Qualtrics:
   - Create a new question (Text/Graphic type)
   - Click the question → "JavaScript"
   - Paste the entire `GenAI_interview_bot_client.js` content
   - Save

3. Add these Embedded Data fields in Survey Flow:
   - `bot_question`
   - `user_response`
   - `convo_history`
   - `orchestration_state`
   - `orchestration_log`

4. Preview your survey to test!

## Files Description

- **`app.py`** - Flask backend server with CORS configured for Qualtrics
- **`GenAI_interview_bot_client.js`** - Qualtrics frontend with voice input and intelligent orchestration
- **`requirements.txt`** - Python dependencies
- **`render.yaml`** - Render deployment configuration
- **`.env.example`** - Environment variable template for local development

## Features

- **Intelligent Response Analysis** - Orchestrator agent evaluates responses and routes to appropriate follow-up
- **Voice Input Support** - Users can speak their responses using browser speech recognition
- **Empathetic Conversations** - Maintains focus on negative consumer experiences
- **Auto-Save** - All conversations saved to Qualtrics Embedded Data

## API Endpoints

- `POST /api/interview` - Handle interview interactions
- `GET /api/health` - Health check
- `GET /api/logs` - View conversation logs (implement auth for production)

## Security Features

- API key stored as environment variable (never exposed to client)
- CORS configured for Qualtrics domains only
- Request logging for monitoring
- HTTPS enforced in production

## Troubleshooting

**Backend not responding:**
- Check if Render service is running
- For free tier: wait 30-60 seconds if service was sleeping
- Verify URL in `GenAI_interview_bot_client.js` has correct backend URL

**CORS errors:**
- Ensure you're testing from actual Qualtrics preview
- Check your Qualtrics domain is in `app.py` CORS configuration

**No AI response:**
- Verify Gemini API key is set in Render
- Check Google AI Studio for API usage/limits

**Voice input not working:**
- Only works in Chrome/Edge browsers
- Requires HTTPS (automatic in Qualtrics)
- User must grant microphone permission

## Monitoring

- **Logs**: Render Dashboard → Your Service → "Logs"
- **Health**: `https://[your-service].onrender.com/health`
- **Conversation Logs**: `https://[your-service].onrender.com/api/logs`

## License

MIT License - see LICENSE file for details
