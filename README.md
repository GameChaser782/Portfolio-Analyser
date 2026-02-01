# Portfolio Analyzer

AI-powered portfolio analysis tool with real-time stock data.

## Features
- **@ Mention Stocks**: Type `@AAPL` to add stocks inline
- **Real-time Data**: Fetches prices via yfinance (US + Indian stocks)
- **Portfolio Total**: Live calculation of portfolio value
- **AI Analysis**: Get a 1-100 score with detailed reasoning

## Setup

1. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

2. Run the server:
   ```bash
   cd backend
   python server.py
   ```

3. Open http://localhost:5000

4. Enter your Gemini API key in the input field

## Files
- `backend/server.py` - Flask server with stock and analysis endpoints
- `backend/config.yaml` - Model and prompt configuration
- `backend/static/` - CSS and JavaScript
- `backend/templates/` - HTML template

## API Key
The API key is:
- Entered by the user in the browser
- Stored only in the browser's session storage
- Sent via `X-API-Key` header (not stored on server)
- Falls back to `.env` file for local development

## Supported Tickers
- US stocks: AAPL, MSFT, GOOGL, etc.
- Indian stocks: MARUTI, BHARTIARTL, etc. (auto-appends .NS/.BO)
