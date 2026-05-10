# Paycheck Balancer II

A comprehensive personal finance management application with AI-powered financial assistance, real-time budget tracking, and intelligent spending analytics.

---

## Version Information

- Version: 2.0.0
- Release Date: May 2026
- License: MIT

---

## Features

### Core Financial Management

- Percentage-based budget allocation across custom categories
- Real-time expense tracking with category limit monitoring
- Multiple pay period support (weekly, bi-weekly, semi-monthly, monthly)
- Rollback pool system for unspent funds across pay periods
- Savings goals tracking with deadline management

### AI Financial Assistant

- Context-aware financial advice based on user spending patterns
- Automated spending analysis and budget recommendations
- Natural language query support for financial insights
- Real-time balance inquiries and spending breakdowns

### Advanced Analytics

- Interactive spending trend charts
- Category-wise expenditure visualization
- Rollback pool growth tracking
- Budget vs actual comparison graphs
- Historical period analytics

### Data Management

- Automatic local storage persistence
- JSON export/import functionality
- CSV spending history export
- Recurring bill management with auto-processing
- Demo data loader for testing

### Technical Architecture

- Frontend: HTML5, CSS3, JavaScript (ES6+)
- Backend: Node.js with Express.js
- AI Integration: Google Gemini AI API
- Charts: Chart.js for data visualization
- Storage: Browser LocalStorage with cloud backup support

---

## Development Acknowledgments

This application was developed with significant assistance from artificial intelligence tools, including but not limited to:

- Claude (Anthropic) - Code architecture, feature implementation, debugging
- GitHub Copilot - Code completion and optimization suggestions

### The AI tools were utilized for:

- Code structure optimization and refactoring
- Algorithm implementation for financial calculations
- Debugging and error resolution
- Documentation generation
- User interface component development
- API integration guidance

The core financial logic, design decisions, feature requirements, and final implementation review were conducted by the human developer. AI assistance accelerated development and improved code quality while maintaining the developer's architectural vision.

---

## Deployment

The application requires both frontend and backend components to function fully.

### Backend Setup

```bash
cd backend
npm install
npm start
```

### Environment Variables

Create a `.env` file in the backend directory with:

```text
GEMINI_API_KEY=your_google_gemini_api_key_here
PORT=3001
```

### Frontend Configuration

The frontend communicates with the backend API. Ensure the API endpoint is correctly configured in `app.js`:

```javascript
// For local development
const API_BASE_URL = 'http://localhost:3001';

// For production
const API_BASE_URL = ''; // Relative URLs when served from same origin
```

---

## Live Demo

The production version is available at:

```text
https://paycheck-balancer-ii.onrender.com
```

---

## Repository

Source code available at:

```text
https://github.com/Pascal69p/paycheck-balancer-II
```

---

## Technologies Stack

### Frontend

- HTML5 for semantic markup
- CSS3 with custom properties for theming
- Vanilla JavaScript (ES6+) for core logic
- Chart.js for interactive visualizations
- Font Awesome for icons
- Google Fonts (DM Sans, DM Mono)

### Backend

- Node.js runtime environment
- Express.js web framework
- Google Generative AI SDK for Gemini integration
- CORS for cross-origin requests
- Helmet for security headers
- Express Rate Limit for API protection

### Development Tools

- Git for version control
- Nodemon for development auto-reload
- npm for package management

---

## Installation Instructions

### Local Development

#### Clone the repository

```bash
git clone https://github.com/Pascal69p/paycheck-balancer-II.git
cd paycheck-balancer-II
```

#### Install backend dependencies

```bash
cd backend
npm install
```

#### Configure environment variables

```bash
cp .env.example .env
# Edit .env with your Gemini API key
```

#### Start the backend server

```bash
npm start
```

Open `index.html` in your browser or serve with a local server.

---

## Production Deployment

The application is configured for deployment on Render.com:

1. Connect your GitHub repository to Render
2. Set build command:

```bash
cd backend && npm install
```

3. Set start command:

```bash
cd backend && node server.js
```

4. Add environment variable:

```text
GEMINI_API_KEY
```

5. Deploy automatically on git push

---

## Usage Guide

### Getting Started

1. Add your budget categories with percentage allocations
2. Set your paycheck amount and pay period
3. Log spending transactions as they occur
4. Monitor your budget progress in real-time

### AI Assistant Features

Click the robot icon or dashboard AI card to access the financial assistant.

#### Example prompts:

- "What is my remaining balance?"
- "Analyze my spending patterns"
- "How can I save more money this month?"
- "Show me upcoming bills"
- "Track my savings goal progress"

### Data Management

- Use Settings to export/import JSON backups
- Export spending history as CSV for external analysis
- Load demo data to test application features
- Clear all data with confirmation prompt

---

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers on iOS and Android

---

## Known Limitations

- API rate limits apply for AI assistant (15 requests per minute)
- Local storage limited to browser capacity (approx 5–10MB)
- Offline mode not supported for AI features
- Requires internet connection for AI assistant functionality

---

## Future Roadmap

- Multi-currency support
- Bank API integration for automatic transaction import
- Mobile application wrapper (iOS/Android)
- Cloud sync across devices
- Budget sharing with family members
- PDF report generation
- Email notifications for budget alerts

---

## Contributing

This is a personal project, but suggestions and bug reports are welcome via GitHub issues.

---

## License

MIT License - See `LICENSE` file for details.

---

## Contact

- Developer: Pascal69p
- Project Repository: https://github.com/Pascal69p/paycheck-balancer-II

---

## Last Updated

May 10, 2026