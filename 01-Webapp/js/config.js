// ============================================================
//  ⚠️  FONTOS: Cseréld ki az URL-t a deploy után!
//
//  Az API Gateway URL-t itt találod:
//  AWS Console → API Gateway → cloud-quotes → Stages → prod
// ============================================================

const CONFIG = {
    API_BASE_URL: 'https://XXXXXXXXXX.execute-api.eu-central-1.amazonaws.com/prod',

    get QUOTES_URL()        { return this.API_BASE_URL + '/quotes'; },
    get QUOTES_RANDOM_URL() { return this.API_BASE_URL + '/quotes/random'; },
    get CHAT_URL()          { return this.API_BASE_URL + '/chat'; },
};
