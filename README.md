# 🐍🪜 साँप-सीढ़ी: भारत ज्ञान यात्रा

A colourful snakes-and-ladders game in Hindi, with trivia about India: national symbols, languages, states, festivals, food, art and some unusual facts. Made for Hindi learners.

## How to play
- Roll the dice 🎲 and answer a question. If you get it right, your pawn moves.
- 🐍 Landing on a snake's head gives you one question to escape it.
- 🪜 Ladders take you straight up (you can turn on a question for ladders too).
- ✋ You can drag any pawn to any square. Turn off **“गोटी अपने-आप चले”** to move your pawn by hand after every roll.
- 🔤 Every question has an **English** hint button.

### Question styles
| Style | What you do |
|---|---|
| 🔘 बहुविकल्पी (MCQ) | pick one of four options |
| ✅/❌ सही या गलत | true or false |
| 🧺 छाँटो (sort) | drag words into the right basket (or tap a word, then a basket) |
| 🔗 जोड़ी मिलाओ (match) | tap one item on the left, then its partner on the right |
| 🔢 क्रम लगाओ (order) | put items in order with ▲▼ (or tap two items to swap them) |

### Settings (⚙️)
- **पहले पासा**: roll first, then answer to move (default)
- **पहले प्रश्न**: answer first, then you get to roll
- **सिर्फ़ खेल**: plain snakes and ladders, no questions
- Difficulty (⭐ / ⭐⭐ / ⭐⭐⭐), Devanagari or Latin digits, 2–4 players

## Adding questions
All questions are in [`js/questions.js`](js/questions.js). The comment at the top of that file describes the format. Copy an existing question and change it.

## Run locally
It's plain HTML/CSS/JS, so there's no build step:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Publish on GitHub Pages
1. Create a new public repository on GitHub, for example `saanp-seedhi`.
2. Push this folder to it:
   ```bash
   git remote add origin https://github.com/<your-username>/saanp-seedhi.git
   git push -u origin main
   ```
3. On GitHub, go to **Settings → Pages → Build and deployment**, set **Source: Deploy from a branch** and **Branch: `main` / root**, then click **Save**.
4. After a minute or so the game will be live at `https://<your-username>.github.io/saanp-seedhi/`.

Inspired by [MichaelDepp/snake-ladder](https://github.com/MichaelDepp/snake-ladder).
