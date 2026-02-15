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
    """
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': HEADERS, 'body': ''}

    path     = event.get('path', '')
    params   = event.get('queryStringParameters') or {}
    category = params.get('category', '')

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
        return {'statusCode': 500, 'headers': HEADERS,
                'body': json.dumps({'error': str(e)}, ensure_ascii=False)}
    finally:
        try:
            conn.close()
        except:
            pass
