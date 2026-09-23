import json
import os
import boto3

REGION   = os.environ.get('AWS_REGION', 'eu-central-1')
MODEL_ID = os.environ.get(
    'BEDROCK_MODEL_ID',
    'anthropic.claude-haiku-4-5-20251001-v1:0'
)
INFERENCE_PROFILE_ID = os.environ.get('BEDROCK_INFERENCE_PROFILE_ID', '').strip()

try:
    bedrock = boto3.client('bedrock-runtime', region_name=REGION)
except Exception:
    bedrock = None

SYSTEM_PROMPT = """Te egy barátságos Cloud Mentor AI asszisztens vagy.
A feladatod, hogy segítsd a felhasználókat a felhő technológiák, AWS szolgáltatások,
és szoftverfejlesztés megértésében.

Szabályok:
- Válaszolj magyarul.
- Legyél tömör és lényegre törő (max 3-4 mondat, hacsak nem kérnek részletesebbet).
- Használj konkrét AWS példákat ahol releváns.
- Legyél barátságos és bátorító, ez egy képzés.
- Ha nem tudsz valamit, mondd el őszintén.
"""

HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
}


MAX_HISTORY = 20  # Max üzenetek száma a kontextusban


def _resolve_model_target():
    return INFERENCE_PROFILE_ID or MODEL_ID


def _invoke_bedrock(payload):
    return bedrock.invoke_model(
        modelId=_resolve_model_target(),
        contentType='application/json',
        accept='application/json',
        body=json.dumps(payload)
    )


def lambda_handler(event, context):
    """
    POST /chat          → AI chat válasz
    GET  /chat/health   → health check
    """
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': HEADERS, 'body': ''}

    path = event.get('path', '')

    # --- Health check ---
    if '/chat/health' in path:
        health = {'lambda': True, 'bedrock': False, 'bedrock_error': None}
        try:
            _invoke_bedrock({
                'anthropic_version': 'bedrock-2023-05-31',
                'max_tokens': 10,
                'messages': [{'role': 'user', 'content': 'ping'}]
            })
            health['bedrock'] = True
        except Exception as e:
            health['bedrock_error'] = str(e)
        return {'statusCode': 200, 'headers': HEADERS,
                'body': json.dumps(health, ensure_ascii=False)}

    # --- Chat ---
    try:
        body = json.loads(event.get('body', '{}'))
        user_message = body.get('message', '').strip()
        history = body.get('history', [])

        if not user_message:
            return {'statusCode': 400, 'headers': HEADERS,
                    'body': json.dumps({'error': 'Üres üzenet'})}

        # Konverzáció előzmények összeállítása
        messages = []
        for msg in history[-MAX_HISTORY:]:
            role = msg.get('role', '')
            content = msg.get('content', '')
            if role in ('user', 'assistant') and content:
                messages.append({'role': role, 'content': content})

        # Ha a history-ban nincs benne az aktuális üzenet, hozzáadjuk
        if not messages or messages[-1].get('content') != user_message:
            messages.append({'role': 'user', 'content': user_message})

        response = _invoke_bedrock({
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': 500,
            'system': SYSTEM_PROMPT,
            'messages': messages
        })

        result = json.loads(response['body'].read())
        reply  = result['content'][0]['text']

        return {'statusCode': 200, 'headers': HEADERS,
                'body': json.dumps({'reply': reply}, ensure_ascii=False)}

    except Exception as e:
        error_text = str(e)
        if 'on-demand throughput isn’t supported' in error_text or "on-demand throughput isn't supported" in error_text:
            error_text = (
                "A kiválasztott modellhez inference profile szükséges. "
                "Állítsd be a Lambda env var-t: BEDROCK_INFERENCE_PROFILE_ID "
                "(profile ID vagy ARN), majd Deploy."
            )
        print(f"HIBA: {e}")
        return {'statusCode': 200, 'headers': HEADERS,
                'body': json.dumps({
                    'status': 'bedrock_error',
                    'reply': f'Lambda működik – Bedrock hiba: {error_text}'
                }, ensure_ascii=False)}
