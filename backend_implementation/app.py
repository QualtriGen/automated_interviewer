import os
import json
import logging
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Configure CORS to allow Qualtrics domains
CORS(app, origins=[
    "https://*.qualtrics.com",
    "https://qualtrics.com",
    "http://localhost:*"  # For local testing
])

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('interview_bot.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Configuration
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent'

if not GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY not found in environment variables")
    raise ValueError("GEMINI_API_KEY must be set in environment variables")

# Store conversation logs (in production, use a proper database)
conversation_logs = []

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/api/interview', methods=['POST'])
def interview_endpoint():
    """Main interview endpoint that proxies requests to Gemini API"""
    try:
        # Get request data
        data = request.get_json()
        
        if not data:
            return jsonify({
                'error': 'No data provided'
            }), 400
        
        # Extract required fields
        agent_type = data.get('agent_type', 'main')  # 'main', 'orchestrator', or 'clarification'
        conversation_history = data.get('conversation_history', [])
        user_response = data.get('user_response', '')
        system_prompt = data.get('system_prompt', '')
        additional_context = data.get('additional_context', '')
        generation_config = data.get('generation_config', {
            'temperature': 0.7,
            'topK': 40,
            'topP': 0.95,
            'maxOutputTokens': 200
        })
        
        # Log the request
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'agent_type': agent_type,
            'user_response': user_response,
            'conversation_length': len(conversation_history)
        }
        conversation_logs.append(log_entry)
        logger.info(f"Interview request - Agent: {agent_type}, User: {user_response[:50]}...")
        
        # Prepare the request for Gemini API
        api_contents = []
        
        # Add system prompt if provided
        if system_prompt:
            api_contents.append({
                'role': 'user',
                'parts': [{'text': system_prompt}]
            })
        
        # Add conversation history
        for msg in conversation_history:
            api_contents.append({
                'role': msg.get('role', 'user'),
                'parts': [{'text': msg.get('content', '')}]
            })
        
        # Add additional context if provided
        if additional_context:
            api_contents.append({
                'role': 'user',
                'parts': [{'text': additional_context}]
            })
        
        # Prepare Gemini API request
        gemini_request = {
            'contents': api_contents,
            'generationConfig': generation_config,
            'safetySettings': [
                {
                    'category': 'HARM_CATEGORY_HARASSMENT',
                    'threshold': 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    'category': 'HARM_CATEGORY_HATE_SPEECH',
                    'threshold': 'BLOCK_MEDIUM_AND_ABOVE'
                }
            ]
        }
        
        # Make request to Gemini API
        gemini_url = f"{GEMINI_API_URL}?key={GEMINI_API_KEY}"
        response = requests.post(
            gemini_url,
            json=gemini_request,
            timeout=30
        )
        
        # Check if request was successful
        if response.status_code != 200:
            logger.error(f"Gemini API error: {response.status_code} - {response.text}")
            return jsonify({
                'error': 'Failed to get response from AI',
                'details': f"Status code: {response.status_code}"
            }), 500
        
        # Parse Gemini response
        gemini_data = response.json()
        
        if not gemini_data.get('candidates'):
            logger.error("No candidates in Gemini response")
            return jsonify({
                'error': 'Invalid response from AI'
            }), 500
        
        # Extract the response text
        response_text = gemini_data['candidates'][0]['content']['parts'][0]['text']
        
        # For orchestrator agent, try to parse JSON response
        if agent_type == 'orchestrator':
            try:
                response_data = json.loads(response_text)
            except json.JSONDecodeError:
                # Fallback parsing for orchestrator
                response_data = {
                    'assessment': 'sufficient',
                    'reasoning': 'Could not parse orchestrator response',
                    'missing_info': [],
                    'next_action': 'continue_interview'
                }
        else:
            response_data = {'content': response_text}
        
        # Log successful response
        logger.info(f"Successfully processed {agent_type} request")
        
        return jsonify({
            'success': True,
            'data': response_data,
            'agent_type': agent_type
        })
        
    except requests.Timeout:
        logger.error("Gemini API request timeout")
        return jsonify({
            'error': 'Request timeout'
        }), 504
        
    except Exception as e:
        logger.error(f"Error processing interview request: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500

@app.route('/api/logs', methods=['GET'])
def get_logs():
    """Get conversation logs (for debugging/monitoring)"""
    try:
        # In production, implement proper authentication
        return jsonify({
            'logs': conversation_logs[-100:],  # Return last 100 logs
            'total_count': len(conversation_logs)
        })
    except Exception as e:
        logger.error(f"Error retrieving logs: {str(e)}")
        return jsonify({
            'error': 'Failed to retrieve logs'
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Endpoint not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({
        'error': 'Internal server error'
    }), 500

if __name__ == '__main__':
    # Run the Flask app
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    logger.info(f"Starting Interview Bot Server on port {port}")
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )