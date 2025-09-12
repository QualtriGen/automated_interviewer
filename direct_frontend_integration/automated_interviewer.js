Qualtrics.SurveyEngine.addOnload(function() {
    // Configuration
    var CONFIG = {
        API_KEY: 'ADD YOUR GOOGLE API KEY HERE', // Replace with your actual API key
        API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000,
        TIMEOUT: 30000
    };

    // Interview state management
    var conversationHistory = [];
    var isProcessing = false;
    var retryCount = 0;
    
    // Enhanced orchestration state management
    var orchestrationState = {
        currentAgent: 'main',
        clarificationCount: 0,
        lastUserResponse: '',
        lastAssessment: null,
        missingInformation: [],
        conversationPhase: 'initial'
    };

    // Voice recognition state management
    var voiceState = {
        recognition: null,
        isRecording: false,
        isSupported: false,
        accumulatedTranscript: '', // Stores all final transcripts
        currentInterim: '', // Current interim transcript
        baseText: '' // Text that was in the field before voice input started
    };

    // Initialize speech recognition
    function initializeSpeechRecognition() {
        // Check for speech recognition support
        if ('webkitSpeechRecognition' in window) {
            voiceState.isSupported = true;
            voiceState.recognition = new webkitSpeechRecognition();
            
            // Configure speech recognition
            voiceState.recognition.continuous = true;
            voiceState.recognition.interimResults = true;
            voiceState.recognition.lang = 'en-US';
            voiceState.recognition.maxAlternatives = 1;
            
            // Speech recognition event handlers
            voiceState.recognition.onstart = function() {
                voiceState.isRecording = true;
                voiceState.accumulatedTranscript = '';
                voiceState.currentInterim = '';
                
                // Store the existing text in the input field
                var userInput = document.getElementById('user-input');
                if (userInput) {
                    voiceState.baseText = userInput.value;
                }
                
                updateMicrophoneButton();
                showStatus('Listening... Speak clearly about your experience.');
            };
            
            voiceState.recognition.onresult = function(event) {
                var interim_transcript = '';
                var final_transcript = '';
                
                // Process all results from the current session
                for (var i = 0; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        final_transcript += event.results[i][0].transcript;
                    } else {
                        interim_transcript += event.results[i][0].transcript;
                    }
                }
                
                // Accumulate final transcripts (append, don't replace)
                if (final_transcript && final_transcript !== voiceState.accumulatedTranscript) {
                    voiceState.accumulatedTranscript += final_transcript;
                }
                
                voiceState.currentInterim = interim_transcript;
                
                // Update the input field: base text + accumulated final + current interim
                var userInput = document.getElementById('user-input');
                if (userInput) {
                    var fullText = voiceState.baseText;
                    if (voiceState.accumulatedTranscript) {
                        fullText += (fullText ? ' ' : '') + voiceState.accumulatedTranscript;
                    }
                    if (voiceState.currentInterim) {
                        fullText += (fullText ? ' ' : '') + voiceState.currentInterim;
                    }
                    userInput.value = fullText;
                }
                
                // Show interim results in status
                if (interim_transcript) {
                    showStatus('Listening: "' + interim_transcript + '"');
                }
            };
            
            voiceState.recognition.onerror = function(event) {
                voiceState.isRecording = false;
                updateMicrophoneButton();
                
                var errorMessage = 'Voice recognition error: ';
                switch(event.error) {
                    case 'no-speech':
                        errorMessage += 'No speech detected. Please try again.';
                        break;
                    case 'audio-capture':
                        errorMessage += 'Microphone not available.';
                        break;
                    case 'not-allowed':
                        errorMessage += 'Microphone access denied.';
                        break;
                    default:
                        errorMessage += 'Please try again.';
                        break;
                }
                showStatus(errorMessage);
                
                setTimeout(function() {
                    showStatus('');
                }, 3000);
            };
            
            voiceState.recognition.onend = function() {
                voiceState.isRecording = false;
                updateMicrophoneButton();
                
                // Only update input if we haven't already sent the message
                if (!isProcessing) {
                    var userInput = document.getElementById('user-input');
                    if (userInput && voiceState.accumulatedTranscript) {
                        var finalText = voiceState.baseText;
                        if (voiceState.accumulatedTranscript) {
                            finalText += (finalText ? ' ' : '') + voiceState.accumulatedTranscript;
                        }
                        userInput.value = finalText;
                        showStatus('Voice input complete. You can continue typing or send your response.');
                    } else {
                        showStatus('');
                    }
                } else {
                    // Clear status if we're already processing
                    showStatus('');
                }
                
                voiceState.currentInterim = '';
            };
            
        } else {
            voiceState.isSupported = false;
            console.log('Speech recognition not supported in this browser');
        }
    }

    // Toggle voice recording
    function toggleVoiceRecording() {
        if (!voiceState.isSupported) {
            showStatus('Voice input not supported in this browser. Please type your response.');
            return;
        }
        
        if (isProcessing) {
            showStatus('Please wait for the current response to complete.');
            return;
        }
        
        if (voiceState.isRecording) {
            // Stop recording
            voiceState.recognition.stop();
        } else {
            // Start recording - preserve existing text
            var userInput = document.getElementById('user-input');
            if (userInput) {
                voiceState.baseText = userInput.value;
            }
            
            voiceState.accumulatedTranscript = '';
            voiceState.currentInterim = '';
            
            try {
                voiceState.recognition.start();
            } catch (error) {
                console.error('Error starting speech recognition:', error);
                showStatus('Could not start voice recording. Please try again.');
            }
        }
    }

    // Update microphone button appearance
    function updateMicrophoneButton() {
        var micBtn = document.getElementById('mic-btn');
        if (micBtn) {
            if (voiceState.isRecording) {
                micBtn.style.background = '#dc3545';
                micBtn.innerHTML = '⏹';
                micBtn.title = 'Stop recording';
                micBtn.style.animation = 'pulse 1s infinite';
            } else {
                micBtn.style.background = voiceState.isSupported ? '#28a745' : '#6c757d';
                micBtn.innerHTML = '🎤';
                micBtn.title = voiceState.isSupported ? 'Start voice recording' : 'Voice input not supported';
                micBtn.style.animation = 'none';
            }
        }
    }

    // Orchestration Agent - analyzes responses and decides routing
    var ORCHESTRATOR_PROMPT = 'You are an intelligent orchestration agent that analyzes user responses about negative consumer experiences to determine if more clarification is needed.\n\nAnalyze the user\'s response and determine:\n1. Is the response detailed and specific enough to understand their negative consumer experience?\n2. What key information is missing (if any)?\n3. Should we continue with normal interview questions or ask for clarification?\n\nRespond in this EXACT JSON format:\n{\n  "assessment": "sufficient" or "insufficient",\n  "reasoning": "brief explanation of why the response is sufficient or insufficient",\n  "missing_info": ["list", "of", "missing", "key", "details"],\n  "next_action": "continue_interview" or "request_clarification"\n}\n\nKey information for a complete negative consumer experience includes:\n- What specific product/service was involved\n- What exactly went wrong\n- When and where it happened\n- How it made them feel\n- What they expected vs what they received\n- Any resolution attempts\n\nBe strict - if the response is vague, too short, or missing crucial details, mark it as "insufficient".';

    // Main Interview Bot - conducts the primary interview
    var MAIN_INTERVIEW_PROMPT = 'You are an empathetic interview bot conducting research on negative consumer experiences. Your role is to:\n\n1. Stay strictly focused on discussing a recent negative consumer experience the user had\n2. Ask follow-up questions to understand: what happened, when, where, how it made them feel, what they expected vs. received, and how it was resolved (if at all)\n3. Be empathetic and understanding, but keep redirecting back to the consumer experience topic if the user tries to deviate\n4. Ask one question at a time and keep responses concise (2-3 sentences max)\n5. If the user tries to change topics, politely redirect: "I understand, but I\'d like to focus on your consumer experience. Can you tell me more about..."\n6. Probe deeper into emotions, expectations, and outcomes\n7. End the interview naturally after gathering comprehensive details about their negative experience\n\nKeep your responses conversational, empathetic, and focused. Do not discuss other topics.';

    // Clarification Bot - asks targeted questions for missing information
    var CLARIFICATION_BOT_PROMPT = 'You are a specialized clarification bot designed to gather specific missing information about negative consumer experiences. Based on the analysis of what information is missing from the user\'s previous response, ask targeted, specific questions to fill those gaps.\n\nYour approach:\n1. Ask direct, specific questions about the missing information\n2. Use empathetic but focused language\n3. Keep questions short and clear (1-2 sentences)\n4. Focus on getting concrete details rather than general impressions\n5. Examples of good clarification questions:\n   - "What specific product or service was this about?"\n   - "Can you describe exactly what went wrong?"\n   - "How did this situation make you feel?"\n   - "What were you expecting to happen instead?"\n   - "When and where did this experience occur?"\n\nYour goal is to help the user provide the specific details that were missing from their previous response.';

    // Call Orchestration Agent to assess response quality
    function callOrchestrationAgent(userResponse, conversationContext) {
        var orchestratorContents = [
            {
                role: 'user',
                parts: [{ text: ORCHESTRATOR_PROMPT }]
            },
            {
                role: 'user',
                parts: [{ text: 'Conversation context: ' + conversationContext }]
            },
            {
                role: 'user',
                parts: [{ text: 'User response to analyze: "' + userResponse + '"' }]
            }
        ];

        var requestBody = {
            contents: orchestratorContents,
            generationConfig: {
                temperature: 0.3,
                topK: 20,
                topP: 0.8,
                maxOutputTokens: 300
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        };

        return new Promise(function(resolve, reject) {
            var xhr = new XMLHttpRequest();
            var timeoutId = setTimeout(function() {
                xhr.abort();
                reject(new Error('Orchestrator timeout'));
            }, CONFIG.TIMEOUT);

            xhr.open('POST', CONFIG.API_URL + '?key=' + CONFIG.API_KEY);
            xhr.setRequestHeader('Content-Type', 'application/json');
            
            xhr.onload = function() {
                clearTimeout(timeoutId);
                if (xhr.status === 200) {
                    try {
                        var data = JSON.parse(xhr.responseText);
                        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                            var responseText = data.candidates[0].content.parts[0].text;
                            
                            try {
                                var assessment = JSON.parse(responseText);
                                resolve(assessment);
                            } catch (parseError) {
                                var fallbackAssessment = {
                                    assessment: responseText.toLowerCase().indexOf('insufficient') !== -1 ? 'insufficient' : 'sufficient',
                                    reasoning: 'Orchestrator response parsing failed, using fallback analysis',
                                    missing_info: ['specific details'],
                                    next_action: responseText.toLowerCase().indexOf('insufficient') !== -1 ? 'request_clarification' : 'continue_interview'
                                };
                                resolve(fallbackAssessment);
                            }
                        } else {
                            reject(new Error('Invalid orchestrator response structure'));
                        }
                    } catch (e) {
                        reject(new Error('Failed to parse orchestrator response'));
                    }
                } else {
                    reject(new Error('Orchestrator API request failed: ' + xhr.status));
                }
            };

            xhr.onerror = function() {
                clearTimeout(timeoutId);
                reject(new Error('Orchestrator network error'));
            };

            xhr.send(JSON.stringify(requestBody));
        });
    }

    // Get conversation context for orchestrator
    function getConversationContext() {
        var context = 'This is an interview about negative consumer experiences. ';
        if (conversationHistory.length > 0) {
            var lastFewMessages = conversationHistory.slice(-4);
            context += 'Recent conversation: ';
            for (var i = 0; i < lastFewMessages.length; i++) {
                var msg = lastFewMessages[i];
                context += (msg.role === 'user' ? 'User: ' : 'Bot: ') + msg.content + ' ';
            }
        }
        return context;
    }

    // Determine which specialized agent to use based on orchestrator decision
    function selectSpecializedAgent(assessment) {
        if (assessment.next_action === 'request_clarification') {
            orchestrationState.currentAgent = 'clarification';
            orchestrationState.clarificationCount++;
            orchestrationState.missingInformation = assessment.missing_info || [];
            return 'clarification';
        } else {
            orchestrationState.currentAgent = 'main';
            orchestrationState.clarificationCount = 0;
            orchestrationState.missingInformation = [];
            return 'main';
        }
    }

    // Get the appropriate system prompt based on current agent
    function getSystemPrompt() {
        switch (orchestrationState.currentAgent) {
            case 'clarification':
                return CLARIFICATION_BOT_PROMPT;
            case 'main':
            default:
                return MAIN_INTERVIEW_PROMPT;
        }
    }

    // Initialize the chat interface with voice input
    function initializeChatInterface() {
        var questionContainer = this.getQuestionContainer();
        
        // Add CSS for voice input animations
        var style = document.createElement('style');
        style.textContent = 
            '@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }' +
            '.voice-supported { cursor: pointer; transition: all 0.3s ease; }' +
            '.voice-supported:hover { transform: scale(1.05); }' +
            '.voice-not-supported { cursor: not-allowed; opacity: 0.5; }';
        document.head.appendChild(style);
        
        var chatHTML = '<div id="chat-container" style="max-width: 800px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; background: #fff; font-family: Arial, sans-serif;">' +
            '<div id="chat-header" style="background: #f8f9fa; padding: 15px; border-bottom: 1px solid #ddd; border-radius: 8px 8px 0 0;">' +
                '<h3 style="margin: 0; color: #333;">AI Interview Assistant</h3>' +
                '<p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">I will be asking you about a recent negative consumer experience you have had.</p>' +
                '<div id="agent-indicator" style="margin-top: 5px; font-size: 11px; color: #888; font-style: italic;">🎤 Voice input available • Powered by intelligent response analysis</div>' +
            '</div>' +
            '<div id="chat-messages" style="height: 400px; overflow-y: auto; padding: 20px; background: #fff;"></div>' +
            '<div id="chat-input-container" style="padding: 15px; border-top: 1px solid #ddd; background: #f8f9fa; border-radius: 0 0 8px 8px;">' +
                '<div style="display: flex; gap: 10px; align-items: stretch;">' +
                    '<input type="text" id="user-input" placeholder="Type your response here or use voice input..." style="flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">' +
                    '<button id="mic-btn" style="padding: 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; min-width: 48px; display: flex; align-items: center; justify-content: center;" title="Start voice recording">🎤</button>' +
                    '<button id="send-btn" style="padding: 12px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Send</button>' +
                '</div>' +
                '<div id="status-message" style="margin-top: 10px; font-size: 12px; color: #666; min-height: 16px;"></div>' +
                '<div id="voice-tip" style="margin-top: 5px; font-size: 11px; color: #888; font-style: italic;">💡 Tip: Voice input appends to your existing text. You can type, speak, and edit before sending.</div>' +
            '</div>' +
        '</div>';
        
        questionContainer.innerHTML = chatHTML;
        
        // Initialize speech recognition
        initializeSpeechRecognition();
        
        // Update microphone button based on support
        updateMicrophoneButton();
        
        setupEventListeners();
        startConversation();
    }

    // Set up event listeners for user interaction including voice
    function setupEventListeners() {
        var sendBtn = document.getElementById('send-btn');
        var userInput = document.getElementById('user-input');
        var micBtn = document.getElementById('mic-btn');
        
        // Send button click
        sendBtn.addEventListener('click', handleUserInput);
        
        // Microphone button click
        micBtn.addEventListener('click', toggleVoiceRecording);
        
        // Enter key press
        userInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleUserInput();
            }
        });
        
        // Prevent form submission when enter is pressed
        userInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.stopPropagation();
            }
        });

        // Auto-resize text input based on content
        userInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });
    }

    // Start the conversation
    function startConversation() {
        var introMessage = "Hello! I am here to learn about consumer experiences, specifically focusing on a recent negative experience you might have had with a product or service. This could be anything from a disappointing purchase, poor customer service, a defective product, or any other frustrating consumer experience. You can type your response or click the microphone button to speak. Could you start by telling me about a recent negative experience you have had as a consumer?";
        
        addMessageToChat('bot', introMessage);
        saveToEmbeddedData('bot_question', introMessage);
        
        conversationHistory.push({
            role: 'assistant',
            content: introMessage
        });
        
        updateConversationHistory();
        
        orchestrationState.currentAgent = 'main';
        orchestrationState.clarificationCount = 0;
        orchestrationState.conversationPhase = 'initial';
    }

    // Enhanced user input handling with voice support
    function handleUserInput() {
        if (isProcessing) return;
        
        // Stop any ongoing voice recording
        if (voiceState.isRecording) {
            voiceState.recognition.stop();
        }
        
        var userInput = document.getElementById('user-input');
        var message = userInput.value.trim();
        
        if (!message) {
            showStatus('Please enter a response or use voice input.');
            return;
        }
        
        userInput.value = '';
        userInput.style.height = 'auto'; // Reset height
        
        // IMPORTANT: Clear voice state to prevent it from repopulating the input
        voiceState.accumulatedTranscript = '';
        voiceState.currentInterim = '';
        voiceState.baseText = '';
        
        addMessageToChat('user', message);
        
        saveToEmbeddedData('user_response', message);
        orchestrationState.lastUserResponse = message;
        
        conversationHistory.push({
            role: 'user',
            content: message
        });
        
        processOrchestratedResponse();
    }

    // Orchestrated response processing
    function processOrchestratedResponse() {
        isProcessing = true;
        showStatus('Analyzing your response...');
        toggleInputs(false);
        
        if (conversationHistory.length <= 2) {
            orchestrationState.currentAgent = 'main';
            proceedWithSpecializedAgent();
            return;
        }
        
        if (orchestrationState.clarificationCount >= 2) {
            orchestrationState.currentAgent = 'main';
            orchestrationState.clarificationCount = 0;
            proceedWithSpecializedAgent();
            return;
        }
        
        var conversationContext = getConversationContext();
        callOrchestrationAgent(orchestrationState.lastUserResponse, conversationContext)
            .then(function(assessment) {
                orchestrationState.lastAssessment = assessment;
                
                saveToEmbeddedData('orchestration_log', JSON.stringify({
                    timestamp: new Date().toISOString(),
                    userResponse: orchestrationState.lastUserResponse,
                    assessment: assessment,
                    selectedAgent: selectSpecializedAgent(assessment)
                }));
                
                showStatus('Preparing response...');
                proceedWithSpecializedAgent();
            })
            .catch(function(error) {
                console.error('Orchestration error:', error);
                orchestrationState.currentAgent = 'main';
                showStatus('Preparing response...');
                proceedWithSpecializedAgent();
            });
    }

    // Proceed with the selected specialized agent
    function proceedWithSpecializedAgent() {
        callSpecializedAgent()
            .then(function(response) {
                if (response && response.content) {
                    addMessageToChat('bot', response.content);
                    saveToEmbeddedData('bot_question', response.content);
                    
                    conversationHistory.push({
                        role: 'assistant',
                        content: response.content
                    });
                    
                    updateConversationHistory();
                    retryCount = 0;
                } else {
                    throw new Error('Invalid response from specialized agent');
                }
            })
            .catch(function(error) {
                console.error('Specialized agent error:', error);
                handleAPIError(error);
            })
            .finally(function() {
                isProcessing = false;
                showStatus('');
                toggleInputs(true);
            });
    }

    // Call the appropriate specialized agent
    function callSpecializedAgent() {
        var systemPrompt = getSystemPrompt();
        var apiContents = [{
            role: 'user',
            parts: [{ text: systemPrompt }]
        }];
        
        for (var i = 0; i < conversationHistory.length; i++) {
            var msg = conversationHistory[i];
            apiContents.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            });
        }

        if (orchestrationState.currentAgent === 'clarification' && orchestrationState.lastAssessment) {
            var clarificationContext = 'The user\'s last response needs clarification. Missing information: ' + 
                orchestrationState.lastAssessment.missing_info.join(', ') + 
                '. Reason: ' + orchestrationState.lastAssessment.reasoning + 
                '. Please ask a specific question to get the missing details about their negative consumer experience.';
            
            apiContents.push({
                role: 'user',
                parts: [{ text: clarificationContext }]
            });
        }

        var requestBody = {
            contents: apiContents,
            generationConfig: {
                temperature: orchestrationState.currentAgent === 'clarification' ? 0.5 : 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: orchestrationState.currentAgent === 'clarification' ? 150 : 200
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        };

        return new Promise(function(resolve, reject) {
            var xhr = new XMLHttpRequest();
            var timeoutId = setTimeout(function() {
                xhr.abort();
                reject(new Error('Specialized agent timeout'));
            }, CONFIG.TIMEOUT);

            xhr.open('POST', CONFIG.API_URL + '?key=' + CONFIG.API_KEY);
            xhr.setRequestHeader('Content-Type', 'application/json');
            
            xhr.onload = function() {
                clearTimeout(timeoutId);
                if (xhr.status === 200) {
                    try {
                        var data = JSON.parse(xhr.responseText);
                        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                            resolve({
                                content: data.candidates[0].content.parts[0].text
                            });
                        } else {
                            reject(new Error('Invalid specialized agent response structure'));
                        }
                    } catch (e) {
                        reject(new Error('Failed to parse specialized agent response'));
                    }
                } else {
                    reject(new Error('Specialized agent API request failed: ' + xhr.status));
                }
            };

            xhr.onerror = function() {
                clearTimeout(timeoutId);
                reject(new Error('Specialized agent network error'));
            };

            xhr.send(JSON.stringify(requestBody));
        });
    }

    // Handle API errors with retry logic
    function handleAPIError(error) {
        if (retryCount < CONFIG.MAX_RETRIES) {
            retryCount++;
            showStatus('Connection issue. Retrying... (' + retryCount + '/' + CONFIG.MAX_RETRIES + ')');
            
            setTimeout(function() {
                proceedWithSpecializedAgent();
            }, CONFIG.RETRY_DELAY * retryCount);
        } else {
            var fallbackMessage = "I apologize, but I am experiencing technical difficulties. Could you please try again or refresh the page?";
            addMessageToChat('bot', fallbackMessage);
            showStatus('Technical difficulties. Please try again.');
        }
    }

    // Add message to chat interface
    function addMessageToChat(sender, message) {
        var messagesContainer = document.getElementById('chat-messages');
        var messageDiv = document.createElement('div');
        
        var isBot = sender === 'bot';
        messageDiv.style.cssText = 'margin-bottom: 15px; display: flex; ' + 
            (isBot ? 'justify-content: flex-start;' : 'justify-content: flex-end;');
        
        var messageBubble = document.createElement('div');
        messageBubble.style.cssText = 'max-width: 70%; padding: 12px 16px; border-radius: 18px; word-wrap: break-word; ' +
            (isBot 
                ? 'background: #f1f3f4; color: #333; border-bottom-left-radius: 4px;' 
                : 'background: #007bff; color: white; border-bottom-right-radius: 4px;'
            );
        
        messageBubble.textContent = message;
        messageDiv.appendChild(messageBubble);
        messagesContainer.appendChild(messageDiv);
        
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Show status message
    function showStatus(message) {
        var statusElement = document.getElementById('status-message');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    // Toggle input controls including voice
    function toggleInputs(enabled) {
        var userInput = document.getElementById('user-input');
        var sendBtn = document.getElementById('send-btn');
        var micBtn = document.getElementById('mic-btn');
        
        if (userInput) userInput.disabled = !enabled;
        if (sendBtn) sendBtn.disabled = !enabled;
        if (micBtn) micBtn.disabled = !enabled;
        
        if (enabled) {
            var inputElement = document.getElementById('user-input');
            if (inputElement) {
                inputElement.focus();
            }
        }
        
        // Stop voice recording if inputs are disabled
        if (!enabled && voiceState.isRecording) {
            voiceState.recognition.stop();
        }
    }

    // Save data to Qualtrics embedded data
    function saveToEmbeddedData(fieldName, value) {
        try {
            Qualtrics.SurveyEngine.setEmbeddedData(fieldName, value);
        } catch (error) {
            console.error('Error saving to embedded data field ' + fieldName + ':', error);
        }
    }

    // Update conversation history in embedded data
    function updateConversationHistory() {
        try {
            var historyString = JSON.stringify(conversationHistory);
            Qualtrics.SurveyEngine.setEmbeddedData('convo_history', historyString);
            
            var orchestrationData = JSON.stringify({
                currentAgent: orchestrationState.currentAgent,
                clarificationCount: orchestrationState.clarificationCount,
                conversationPhase: orchestrationState.conversationPhase,
                lastAssessment: orchestrationState.lastAssessment,
                voiceSupported: voiceState.isSupported
            });
            Qualtrics.SurveyEngine.setEmbeddedData('orchestration_state', orchestrationData);
        } catch (error) {
            console.error('Error updating conversation history:', error);
        }
    }

    // Initialize the chat interface
    initializeChatInterface.call(this);
});

// Handle page unload to save final state and stop voice recognition
Qualtrics.SurveyEngine.addOnUnload(function() {
    try {
        // Stop any ongoing voice recognition
        if (window.voiceState && window.voiceState.isRecording && window.voiceState.recognition) {
            window.voiceState.recognition.stop();
        }
        
        var conversationHistory = JSON.parse(Qualtrics.SurveyEngine.getEmbeddedData('convo_history') || '[]');
        var orchestrationState = JSON.parse(Qualtrics.SurveyEngine.getEmbeddedData('orchestration_state') || '{}');
        
        if (conversationHistory.length > 0) {
            console.log('Interview completed with', conversationHistory.length, 'messages');
            console.log('Voice support:', orchestrationState.voiceSupported);
            console.log('Final orchestration state:', orchestrationState);
        }
    } catch (error) {
        console.error('Error during final save:', error);
    }
});
