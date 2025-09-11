# Automated Qualitative Interviewer for Qualtrics

An AI-powered interview bot using Google's Gemini model, designed for conducting in-depth qualitative interviews about consumer experiences with voice input support and intelligent response orchestration.

## ⚠️ Security Notice

**This implementation exposes your API key in the browser's client-side code.** While the risk of malicious use by research participants is generally low, the API key could potentially be discovered and misused.

**Required Security Measures:**
- **Always use prepaid credits** or set spending limits in your Google Cloud account
- Monitor usage regularly during data collection
- Consider implementing a backend architecture for production studies with larger participant pools
- For sensitive research topics, backend implementation is strongly recommended

For enhanced security, see the backend implementation guide in the original research paper.

## Overview

This repository contains an advanced AI interviewer implementation that conducts qualitative interviews about negative consumer experiences. The tool features multi-agent orchestration, voice input capabilities, and intelligent conversation flow management to gather rich qualitative data at scale.

## Key Features

### Core Functionality
- **Multi-Agent System**: Three specialized AI agents working in concert:
  - Main interviewer for conducting the primary interview
  - Orchestration agent for assessing response quality
  - Clarification bot for gathering missing information
- **Voice Input Support**: Browser-based speech recognition for natural participant responses
- **Intelligent Routing**: Automatic detection of vague or insufficient responses with targeted follow-ups
- **Conversation Memory**: Full context awareness throughout the interview session

### Technical Features
- **Adaptive Questioning**: Dynamic adjustment based on response quality assessment
- **Error Recovery**: Automatic retry logic with graceful fallback options
- **Real-time Transcription**: Voice responses converted to text in real-time
- **Comprehensive Logging**: Complete conversation history with orchestration decisions

## Prerequisites

- Qualtrics account with JavaScript editing permissions
- Google Cloud API key with access to Gemini models
- Modern web browser with speech recognition support (Chrome, Safari, Edge)
- Basic familiarity with Qualtrics survey creation

## Installation

### Step 1: Obtain Google Cloud API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Generate a new API key
4. **Important**: Set up billing controls and usage limits in Google Cloud Console

### Step 2: Configure Qualtrics Survey

1. In your Qualtrics survey, go to **Survey Flow**
2. Add an **Embedded Data** element at the beginning
3. Create the following fields (leave values empty):
   - `user_response` - Stores each user message
   - `bot_question` - Stores each AI question
   - `convo_history` - Complete conversation transcript
   - `orchestration_state` - Agent routing decisions
   - `orchestration_log` - Quality assessment logs

### Step 3: Add the Interview Bot

1. Create a new **Text/Graphic** question in your survey
2. Click the gear icon and select **Add JavaScript**
3. Copy the entire contents of `automated_interviewer.js`
4. Replace `'ADD YOUR GOOGLE API KEY HERE'` with your actual API key
5. Save the question

### Step 4: Test Your Implementation

1. Use an anonymous survey link (not preview mode - voice features may not work in preview)
2. Test both typed and voice input methods
3. Verify that conversations flow naturally and data is being captured
4. Check browser console (F12) for any errors

## File Structure

```
├── automated_interviewer.js    # Main JavaScript implementation
├── README.md                   # This file
└── docs/                      # Additional documentation
    └── implementation_guide.pdf # Detailed implementation guide
```

## How It Works

### Multi-Agent Architecture

The system uses three specialized AI agents:

1. **Main Interview Bot**: Conducts the primary interview with empathetic, focused questioning
2. **Orchestration Agent**: Analyzes each response to determine if clarification is needed
3. **Clarification Bot**: Asks targeted questions to fill information gaps

### Conversation Flow

1. Interview begins with a welcoming introduction
2. After each participant response:
   - Orchestrator assesses response quality
   - Routes to appropriate agent (main or clarification)
   - Generates contextually appropriate follow-up
3. Process continues until comprehensive information is gathered

### Voice Input Process

1. Participant clicks microphone button
2. Browser requests microphone permission (first time only)
3. Real-time transcription appears in text field
4. Participant can edit transcribed text before sending
5. Voice recording stops automatically when send is clicked

## Data Collection

The tool captures comprehensive interview data:

- **user_response**: Individual participant messages
- **bot_question**: Each AI-generated question
- **convo_history**: Complete conversation with timestamps and speaker labels
- **orchestration_state**: Current agent, clarification count, and routing decisions
- **orchestration_log**: Detailed assessment of each response quality

This data appears as additional columns in your standard Qualtrics export.

## Customization Options

### Modify Interview Topics

Edit the system prompts to focus on different research areas:

```javascript
var MAIN_INTERVIEW_PROMPT = 'You are conducting research on [YOUR TOPIC HERE]...';
```

### Adjust Response Assessment Criteria

Modify the orchestrator's evaluation criteria:

```javascript
var ORCHESTRATOR_PROMPT = 'Analyze responses for: [YOUR CRITERIA]...';
```

### Configure Agent Behavior

Adjust temperature and token limits for different conversation styles:

```javascript
generationConfig: {
    temperature: 0.7,  // Higher = more creative, Lower = more focused
    maxOutputTokens: 200  // Adjust response length
}
```

## Troubleshooting

### Common Issues

1. **Voice Input Not Working**
   - Ensure using HTTPS (required for microphone access)
   - Check browser compatibility (Chrome/Safari/Edge recommended)
   - Verify microphone permissions in browser settings
   - Test outside of Qualtrics preview mode

2. **"API Error" Messages**
   - Verify API key is correctly entered
   - Check Google Cloud billing is active
   - Ensure Gemini API is enabled in Google Cloud Console
   - Monitor rate limits and quotas

3. **Conversation Not Flowing Properly**
   - Check all embedded data fields are defined in Survey Flow
   - Verify orchestration logic thresholds
   - Review browser console for JavaScript errors

4. **Data Not Saving**
   - Ensure embedded data fields match exactly (case-sensitive)
   - Check Survey Flow has embedded data before the question
   - Verify no JavaScript errors in console

### Debugging Tips

- Use browser console (F12) to monitor:
  - API responses
  - Orchestration decisions
  - Voice recognition events
- Test with simple responses first
- Monitor the `orchestration_log` field for routing decisions

## Best Practices

### For Optimal Interview Quality

1. **Pilot Testing**: Run small pilots to refine prompts and thresholds
2. **Clear Instructions**: Inform participants about voice option availability
3. **Network Considerations**: Warn participants about stable internet requirements
4. **Fallback Options**: Always allow typed input as backup

### For Data Quality

1. **Response Validation**: Review orchestration logs to ensure proper routing
2. **Conversation Analysis**: Check for off-topic deviations
3. **Technical Monitoring**: Track API errors and timeout rates
4. **Participant Feedback**: Include post-interview experience questions

## Cost Considerations

- Google charges per API request based on token usage
- Voice recognition uses browser capabilities (no additional cost)
- Multi-agent design increases token usage compared to single-agent
- Set appropriate spending limits in Google Cloud Console
- Monitor usage during pilots to estimate full study costs

## Research Applications

This tool enables:

- Scalable qualitative research on consumer experiences
- Exploration of sensitive topics with reduced interviewer bias
- Mixed-method approaches combining depth and scale
- Cross-cultural studies without language barriers (with appropriate model configuration)
- 24/7 data collection across time zones

## Citation

If you use this tool in your research, please cite:

```
[Citation information to be added based on publication]
```

## Support

For questions or issues:
- Review the troubleshooting section above
- Consult the original research paper for methodological guidance
- Verify Google Cloud API documentation for service-specific issues

## License

This project is released under the MIT License. See LICENSE file for details.

## Acknowledgments

This implementation demonstrates the use of multi-agent AI systems for qualitative research, part of the broader initiative to democratize GenAI tools for marketing research.

---

**Important Notes**: 
- This tool transmits participant responses to Google's servers. Ensure your IRB approval addresses this data transmission.
- Voice data is processed locally in the browser but transcribed text is sent to Google.
- For sensitive research or vulnerable populations, implement a backend architecture to protect API credentials.
- Always use prepaid credits or spending limits to minimize financial risk from API key exposure.
