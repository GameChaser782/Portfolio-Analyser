import json
import re
import os
from flask import Flask, render_template, request, jsonify
import yfinance as yf
import yaml
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

with open("config.yaml", "r") as f:
    config = yaml.safe_load(f)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/stock/<ticker>')
def get_stock(ticker):
    ticker = ticker.upper().strip()
    suffixes = ['', '.NS', '.BO']
    
    for suffix in suffixes:
        try:
            full_ticker = ticker + suffix
            stock = yf.Ticker(full_ticker)
            info = stock.info
            
            if info.get('regularMarketPrice') or info.get('currentPrice'):
                hist = stock.history(period="1d")
                price = info.get("currentPrice") or info.get("regularMarketPrice") or (hist["Close"].iloc[-1] if len(hist) > 0 else 0)
                
                return jsonify({
                    "ticker": full_ticker,
                    "name": info.get("shortName") or info.get("longName") or ticker,
                    "price": float(price) if price else 0,
                    "open": float(info.get("open") or (hist["Open"].iloc[-1] if len(hist) > 0 else 0)),
                    "close": float(info.get("previousClose", 0)),
                    "currency": info.get("currency", "USD")
                })
        except:
            continue
    
    return jsonify({"error": f"Stock not found: {ticker}"}), 404

@app.route('/api/analyze', methods=['POST'])
def analyze():
    data = request.json
    stocks = data.get('stocks', [])
    instructions = data.get('instructions', '')
    
    api_key = request.headers.get('X-API-Key') or os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        return jsonify({'error': 'No API key provided'}), 401
    
    if not stocks:
        return jsonify({'error': 'No stocks provided'}), 400
    
    portfolio_str = "\n".join([f"- {s['ticker']}: {s['quantity']} shares @ ${s['price']:.2f}" for s in stocks])
    full_prompt = f"User Instructions:\n{instructions}\n\nPortfolio:\n{portfolio_str}"
    
    try:
        client = OpenAI(
            api_key=api_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
        )
        
        prompt = config["prompts"]["analysis_template"].format(user_input=full_prompt)
        
        response = client.chat.completions.create(
            model=config["model"]["name"],
            messages=[
                {"role": "system", "content": config["prompts"]["system"]},
                {"role": "user", "content": prompt}
            ],
            temperature=config["model"]["temperature"]
        )
        
        raw_response = response.choices[0].message.content
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
    try:
        json_match = re.search(r'\{[^{}]*"score"[^{}]*"reasoning"[^{}]*\}', raw_response, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
        else:
            result = json.loads(raw_response)
    except json.JSONDecodeError:
        score_match = re.search(r'"score"\s*:\s*(\d+)', raw_response)
        reasoning_match = re.search(r'"reasoning"\s*:\s*"([^"]*)"', raw_response, re.DOTALL)
        
        result = {
            "score": int(score_match.group(1)) if score_match else 0,
            "reasoning": reasoning_match.group(1) if reasoning_match else raw_response
        }
    
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
