import json
import pymysql
import os

DB_HOST     = os.environ.get('DB_HOST')
DB_USER     = os.environ.get('DB_USER', 'admin')
DB_PASSWORD = os.environ.get('DB_PASSWORD')
DB_NAME     = os.environ.get('DB_NAME', 'cloudquotes')

HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
}


def get_connection():
    return pymysql.connect(
        host=DB_HOST, user=DB_USER, password=DB_PASSWORD,
        database=DB_NAME, charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )


def lambda_handler(event, context):
    """
    GET /quotes          → összes idézet (?category= opcionális)
    GET /quotes/random   → véletlenszerű idézet (?category= opcionális)
    GET /quotes/health   → health check
    """
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': HEADERS, 'body': ''}

    path     = event.get('path', '')
    params   = event.get('queryStringParameters') or {}
    category = params.get('category', '')

    # --- Health check ---
    if '/quotes/health' in path:
        health = {'lambda': True, 'database': False, 'database_error': None}
        if not DB_HOST:
            health['database_error'] = 'DB_HOST nincs beállítva'
        else:
            try:
                conn = get_connection()
                with conn.cursor() as cur:
                    cur.execute("SELECT COUNT(*) AS cnt FROM quotes")
                    health['database'] = True
                    health['quote_count'] = cur.fetchone()['cnt']
                conn.close()
            except Exception as e:
                health['database_error'] = str(e)
        return {'statusCode': 200, 'headers': HEADERS,
                'body': json.dumps(health, ensure_ascii=False)}

    # --- DB nincs konfigurálva ---
    if not DB_HOST:
        return {'statusCode': 200, 'headers': HEADERS,
                'body': json.dumps({
                    'status': 'no_db',
                    'message': 'Lambda működik – RDS még nincs konfigurálva'
                }, ensure_ascii=False)}

    # --- Normál működés ---
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            if '/quotes/random' in path:
                if category:
                    cur.execute(
                        "SELECT id, text, author, category FROM quotes "
                        "WHERE category=%s ORDER BY RAND() LIMIT 1", (category,))
                else:
                    cur.execute(
                        "SELECT id, text, author, category FROM quotes "
                        "ORDER BY RAND() LIMIT 1")
                row = cur.fetchone()
                if not row:
                    return {'statusCode': 404, 'headers': HEADERS,
                            'body': json.dumps({'error': 'Nincs idézet'})}
                return {'statusCode': 200, 'headers': HEADERS,
                        'body': json.dumps(row, ensure_ascii=False)}
            else:
                if category:
                    cur.execute(
                        "SELECT id, text, author, category FROM quotes "
                        "WHERE category=%s ORDER BY id", (category,))
                else:
                    cur.execute(
                        "SELECT id, text, author, category FROM quotes ORDER BY id")
                return {'statusCode': 200, 'headers': HEADERS,
                        'body': json.dumps(cur.fetchall(), ensure_ascii=False)}

    except Exception as e:
        print(f"HIBA: {e}")
        return {'statusCode': 200, 'headers': HEADERS,
                'body': json.dumps({
                    'status': 'db_error',
                    'message': f'Lambda működik – RDS hiba: {str(e)}'
                }, ensure_ascii=False)}
    finally:
        try:
            conn.close()
        except:
            pass
