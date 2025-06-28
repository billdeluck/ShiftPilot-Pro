# AI Co-Pilot & Chat (ai-chat.md)

## Purpose
Provides an interactive chat interface for users to ask questions, automate tasks, and receive AI-powered assistance for shift management.

## Key Features
- Floating chat button and panel on all pages
- Conversational UI for natural language commands
- Rule-based command parsing (e.g., reassign shifts)
- Integration point for Gemini API (future AI)
- Works offline for rule-based automation

## Data Flow
- Reads and updates data via DataManager
- Parses user input and triggers actions (e.g., reassign, show plan)
- Can automate tasks even when offline

## Main Functions
- `handleCommand(msg)`: Parses and executes chat commands
- `AI.reassignShift(date, shiftId)`: Rule-based reassignment
- `callGeminiAPI(prompt)`: Stub for future AI integration

## Example Usage
- User types "Reassign Alice on July 5"; chat reassigns the shift
- User asks for a weekly plan; chat responds (or says "coming soon")

## Related Files
- `js/chat.js`: Chat UI and logic
- `js/ai.js`: AI and rule-based automation
- All HTML pages (chat is globally available)
