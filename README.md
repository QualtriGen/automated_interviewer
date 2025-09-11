# Automated Qualitative Interviewer for Qualtrics

This repository provides a JavaScript framework for deploying sophisticated GenAI interviewers in Qualtrics, featuring multi-agent systems and voice input to conduct qualitative research at scale.

## Repository Structure

This repository contains two implementation approaches:

### 📁 `direct_frontend_integration/`
Contains the JavaScript code that connects Qualtrics directly to Google's Gemini AI service. This approach:
- **Multi-agent orchestration**: Three specialized AI agents working in concert
- **Voice input support**: Browser-based speech recognition for natural responses
- **Intelligent routing**: Automatic detection and follow-up for insufficient responses
- **API key exposure**: The key is visible in browser code
- **Best for**: Pilot interviews, method development, controlled studies
- **Security**: Requires prepaid API credits with spending limits

### 📁 `backend_implementation/`
Contains both the backend server code (Python/Flask) and modified JavaScript for Qualtrics. This approach:
- **Enhanced security**: API keys never exposed to participants
- **Better scalability**: Handles multiple concurrent interviews reliably
- **Professional deployment**: Recommended for large-scale qualitative research
- **Additional setup**: Requires deploying a server (e.g., on Render.com)
- **Best for**: Production studies, sensitive topics, high-volume data collection
- **Advanced features**: Better error handling and request queuing

## Key Features

- **Orchestration Agent**: Assesses response quality and routes to appropriate specialist
- **Main Interviewer**: Conducts empathetic, focused conversations on research topics
- **Clarification Bot**: Asks targeted follow-ups when responses lack detail
- **Voice Input**: Participants can speak responses naturally instead of typing
- **Full Context Awareness**: Maintains conversation memory throughout interview
- **Comprehensive Logging**: Complete transcripts with orchestration decisions

## Choosing Your Implementation

- **Use Direct Frontend** if you're testing interview protocols or running small qualitative studies
- **Use Backend** if you're conducting large-scale interviews or discussing sensitive topics

Both implementations provide the same interview experience and data collection capabilities. The backend approach is recommended for studies requiring enhanced security or handling sensitive participant information.

## Getting Started

See the README files in each folder for detailed setup instructions specific to that implementation approach.

## License

MIT License - See LICENSE file for details.
