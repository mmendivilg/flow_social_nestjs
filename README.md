<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## API usage (cURL)

This project exposes a REST API for auth, profiles, preference sessions, conversation assistant, confidence test, and AI coaching.

Set your base URL:

```bash
export API="http://localhost:3000"
```

Optional health check:

```bash
curl -sS "$API/"
```

### Authentication

Register:

```bash
curl -sS -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "you@example.com",
    "password": "StrongPass123!"
  }'
```

Login:

```bash
curl -sS -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "you@example.com",
    "password": "StrongPass123!"
  }'
```

Both return:

```json
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

Save tokens with `jq`:

```bash
TOKENS=$(curl -sS -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"StrongPass123!"}')

export ACCESS_TOKEN=$(echo "$TOKENS" | jq -r '.accessToken')
export REFRESH_TOKEN=$(echo "$TOKENS" | jq -r '.refreshToken')
```

Refresh access token (use refresh token as Bearer token):

```bash
curl -sS -X POST "$API/auth/refresh" \
  -H "Authorization: Bearer $REFRESH_TOKEN"
```

Logout:

```bash
curl -sS -X POST "$API/auth/logout" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Profiles (auth required)

Get current profile:

```bash
curl -sS "$API/profiles/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Update profile basics:

```bash
curl -sS -X PATCH "$API/profiles/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Manuel",
    "locale": "es-MX",
    "timezone": "America/Mazatlan"
  }'
```

Replace full `profileJson`:

```bash
curl -sS -X PUT "$API/profiles/me/profile-json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profileJson": {
      "tone": "casual",
      "emoji_preference": "some"
    }
  }'
```

Merge patch into `profileJson`:

```bash
curl -sS -X PATCH "$API/profiles/me/profile-json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patch": {
      "humor": "light"
    }
  }'
```

### Preference sessions (auth required)

Create a preference session:

```bash
curl -sS -X POST "$API/preferences/sessions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contextText": "I want help texting more confidently."
  }'
```

Get latest session (optional `status=in_progress|completed`):

```bash
curl -sS "$API/preferences/sessions/latest?status=in_progress" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Get session by ID:

```bash
curl -sS "$API/preferences/sessions/<SESSION_ID>" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Update session context:

```bash
curl -sS -X PATCH "$API/preferences/sessions/<SESSION_ID>/context" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contextText": "I am looking for a serious relationship."
  }'
```

Merge answers:

```bash
curl -sS -X PATCH "$API/preferences/sessions/<SESSION_ID>/answers" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "answersPatch": {
      "intention": "serious_relationship",
      "vibe": "quiet_polite",
      "flirt_level": "light"
    }
  }'
```

Complete session:

```bash
curl -sS -X POST "$API/preferences/sessions/<SESSION_ID>/complete" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Confidence test (auth required)

Dev-only random profile mode:

- Set `CONFIDENCE_TEST_DEV_RANDOMIZE_ON_STATE=true` (or `EXPO_PUBLIC_DEV_RANDOMIZE_CONFIDENCE_TEST=true`).
- On every `GET /confidence-test/state`, the backend deletes that user's existing confidence-test state and recreates it with a random profile.

- Optional local debugging: set `CONFIDENCE_TEST_LOG_RAW_AI_OUTPUT=true` to include a short raw AI output preview when JSON parsing fails (keep it `false` in production).

Get current confidence-test state (this is what your frontend can call right after login):

```bash
curl -sS "$API/confidence-test/state" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Example response:

```json
{
  "testId": "d86be2ce-2413-41bf-9fd0-8e1a939235e5",
  "status": "pending",
  "shouldShowOnLogin": true,
  "profile": {
    "id": "luna.ramirez",
    "instagramHandle": "@luna.ramirez",
    "avatarUrl": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=256&h=256&auto=format&fit=crop",
    "lastSeen": "Seen 12m ago",
    "backgroundImageUrl": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1974&auto=format&fit=crop"
  },
  "attemptCount": 0,
  "latestScore": null,
  "latestFeedback": null,
  "strengths": [],
  "improvements": [],
  "completedAt": null,
  "skippedAt": null,
  "updatedAt": "2026-03-22T18:10:32.511Z"
}
```

Submit a message and get a 1-10 confidence score:

```bash
curl -sS -X POST "$API/confidence-test/score" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageText": "Hey Luna, your travel shots are awesome. If you are up for it, I would love to keep talking."
  }'
```

Example response:

```json
{
  "testId": "d86be2ce-2413-41bf-9fd0-8e1a939235e5",
  "status": "completed",
  "shouldShowOnLogin": false,
  "profile": {
    "id": "luna.ramirez",
    "instagramHandle": "@luna.ramirez",
    "avatarUrl": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=256&h=256&auto=format&fit=crop",
    "lastSeen": "Seen 12m ago",
    "backgroundImageUrl": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1974&auto=format&fit=crop"
  },
  "attemptCount": 1,
  "latestScore": 8,
  "latestFeedback": "Clear and respectful tone. Add a slightly more personal hook to feel less generic.",
  "strengths": ["Respectful opener", "Confident phrasing"],
  "improvements": ["Be more specific to her profile"],
  "completedAt": "2026-03-22T18:12:02.901Z",
  "skippedAt": null,
  "updatedAt": "2026-03-22T18:12:02.901Z",
  "score": 8,
  "feedback": "Clear and respectful tone. Add a slightly more personal hook to feel less generic."
}
```

Skip the confidence test:

```bash
curl -sS -X POST "$API/confidence-test/skip" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Example response:

```json
{
  "testId": "d86be2ce-2413-41bf-9fd0-8e1a939235e5",
  "status": "skipped",
  "shouldShowOnLogin": false,
  "profile": {
    "id": "luna.ramirez",
    "instagramHandle": "@luna.ramirez",
    "avatarUrl": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=256&h=256&auto=format&fit=crop",
    "lastSeen": "Seen 12m ago",
    "backgroundImageUrl": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1974&auto=format&fit=crop"
  },
  "attemptCount": 0,
  "latestScore": null,
  "latestFeedback": null,
  "strengths": [],
  "improvements": [],
  "completedAt": null,
  "skippedAt": "2026-03-22T18:11:10.103Z",
  "updatedAt": "2026-03-22T18:11:10.103Z"
}
```

### Conversation assistant (auth required)

Allowed chat types:

- `dating`
- `friends`
- `work`
- `general`

Allowed submit modes:

- `suggest_reply`
- `ask_advice`

Create a conversation chat:

```bash
curl -sS -X POST "$API/conversation/chats" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "dating",
    "title": "Luna - WhatsApp"
  }'
```

Example response:

```json
{
  "id": "6a9f22ce-e4ab-4f03-8b7b-3ab82d0d66d7",
  "type": "dating",
  "title": "Luna - WhatsApp",
  "isFavorite": false,
  "createdAt": "2026-03-23T19:00:10.031Z",
  "updatedAt": "2026-03-23T19:00:10.031Z"
}
```

Save chat id for next requests:

```bash
export CHAT_ID="6a9f22ce-e4ab-4f03-8b7b-3ab82d0d66d7"
```

List your conversation chats (cursor pagination + optional filters):

```bash
curl -sS "$API/conversation/chats?limit=20" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Optional query params:

- `favorite=true|false`
- `q=<search text>` (matches title and type)
- `type=dating|friends|work|general`

Example response:

```json
{
  "items": [
    {
      "id": "6a9f22ce-e4ab-4f03-8b7b-3ab82d0d66d7",
      "type": "dating",
      "title": "Luna - WhatsApp",
      "isFavorite": false,
      "createdAt": "2026-03-23T19:00:10.031Z",
      "updatedAt": "2026-03-23T19:02:45.903Z"
    }
  ],
  "nextCursor": null
}
```

Update a conversation chat (type and/or title):

```bash
curl -sS -X PATCH "$API/conversation/chats/$CHAT_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "friends",
    "title": "Luna - Chill chat"
  }'
```

Example response:

```json
{
  "id": "6a9f22ce-e4ab-4f03-8b7b-3ab82d0d66d7",
  "type": "friends",
  "title": "Luna - Chill chat",
  "isFavorite": false,
  "createdAt": "2026-03-23T19:00:10.031Z",
  "updatedAt": "2026-03-23T19:03:30.277Z"
}
```

Mark or unmark a conversation chat as favorite:

```bash
curl -sS -X PATCH "$API/conversation/chats/$CHAT_ID/favorite" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isFavorite": true
  }'
```

Example response:

```json
{
  "id": "6a9f22ce-e4ab-4f03-8b7b-3ab82d0d66d7",
  "type": "friends",
  "title": "Luna - Chill chat",
  "isFavorite": true,
  "createdAt": "2026-03-23T19:00:10.031Z",
  "updatedAt": "2026-03-23T19:06:04.811Z"
}
```

List chat history entries for one chat:

```bash
curl -sS "$API/conversation/chats/$CHAT_ID/entries?limit=20" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Example response:

```json
{
  "items": [
    {
      "id": "9f9ad52d-4e53-4bcf-9d76-1daec3f02456",
      "chatId": "6a9f22ce-e4ab-4f03-8b7b-3ab82d0d66d7",
      "role": "assistant_output",
      "mode": "suggest_reply",
      "status": "success",
      "contentText": "Hey, sounds fun 🙂 I am free Thursday evening if you want to grab coffee.",
      "sourceText": null,
      "ocrText": null,
      "payload": {
        "mode": "suggest_reply",
        "bestOption": "Hey, sounds fun 🙂 I am free Thursday evening if you want to grab coffee.",
        "options": [
          {
            "label": "safe",
            "text": "Hey 🙂 sounds great. How has your week been?"
          },
          {
            "label": "balanced",
            "text": "Hey, sounds fun 🙂 I am free Thursday evening if you want to grab coffee."
          },
          {
            "label": "bold",
            "text": "You seem fun. Let us stop texting and do coffee this week."
          }
        ],
        "rationale": ["Balanced tone", "Clear invite", "Respectful and direct"]
      },
      "model": "gpt-5.2",
      "usage": null,
      "errorMessage": null,
      "createdAt": "2026-03-23T19:02:45.903Z"
    },
    {
      "id": "d9a9ed0b-6e3c-4a85-a60f-3d2e4f975f45",
      "chatId": "6a9f22ce-e4ab-4f03-8b7b-3ab82d0d66d7",
      "role": "user_submission",
      "mode": "suggest_reply",
      "status": "success",
      "contentText": "Pasted text:\nShe said: maybe we can do coffee this week",
      "sourceText": "She said: maybe we can do coffee this week",
      "ocrText": null,
      "payload": {
        "imageCount": 0,
        "mode": "suggest_reply"
      },
      "model": null,
      "usage": null,
      "errorMessage": null,
      "createdAt": "2026-03-23T19:02:44.118Z"
    }
  ],
  "nextCursor": null
}
```

Submit text/images to generate output (`multipart/form-data`):

- `images[]` is optional (up to 3 images)
- accepted image types: `image/png`, `image/jpeg`, `image/webp`
- max size per image: `5 MB`
- `text` is optional (max `5000` chars)
- you must send at least one of `text` or `images[]`

Submit a `suggest_reply` request:

```bash
curl -sS -X POST "$API/conversation/chats/$CHAT_ID/submit" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "mode=suggest_reply" \
  -F "text=She said: maybe we can do coffee this week"
```

Example response:

```json
{
  "chatId": "6a9f22ce-e4ab-4f03-8b7b-3ab82d0d66d7",
  "userEntry": {
    "id": "d9a9ed0b-6e3c-4a85-a60f-3d2e4f975f45",
    "role": "user_submission",
    "mode": "suggest_reply",
    "contentText": "Pasted text:\nShe said: maybe we can do coffee this week",
    "sourceText": "She said: maybe we can do coffee this week",
    "ocrText": null,
    "createdAt": "2026-03-23T19:02:44.118Z"
  },
  "assistantEntry": {
    "id": "9f9ad52d-4e53-4bcf-9d76-1daec3f02456",
    "role": "assistant_output",
    "mode": "suggest_reply",
    "status": "success",
    "contentText": "Hey, sounds fun 🙂 I am free Thursday evening if you want to grab coffee.",
    "payload": {
      "mode": "suggest_reply",
      "bestOption": "Hey, sounds fun 🙂 I am free Thursday evening if you want to grab coffee.",
      "options": [
        {
          "label": "safe",
          "text": "Hey 🙂 sounds great. How has your week been?"
        },
        {
          "label": "balanced",
          "text": "Hey, sounds fun 🙂 I am free Thursday evening if you want to grab coffee."
        },
        {
          "label": "bold",
          "text": "You seem fun. Let us stop texting and do coffee this week."
        }
      ],
      "rationale": ["Balanced tone", "Clear invite", "Respectful and direct"]
    },
    "model": "gpt-5.2",
    "usage": null,
    "errorMessage": null,
    "createdAt": "2026-03-23T19:02:45.903Z"
  },
  "output": {
    "mode": "suggest_reply",
    "bestOption": "Hey, sounds fun 🙂 I am free Thursday evening if you want to grab coffee.",
    "options": [
      {
        "label": "safe",
        "text": "Hey 🙂 sounds great. How has your week been?"
      },
      {
        "label": "balanced",
        "text": "Hey, sounds fun 🙂 I am free Thursday evening if you want to grab coffee."
      },
      {
        "label": "bold",
        "text": "You seem fun. Let us stop texting and do coffee this week."
      }
    ],
    "rationale": ["Balanced tone", "Clear invite", "Respectful and direct"],
    "model": "gpt-5.2"
  },
  "errorMessage": null
}
```

Submit an `ask_advice` request with screenshot(s) and optional text:

```bash
curl -sS -X POST "$API/conversation/chats/$CHAT_ID/submit" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "mode=ask_advice" \
  -F "text=this happened last date and I do not know what it means" \
  -F "images[]=@/absolute/path/to/chat-screenshot-1.png" \
  -F "images[]=@/absolute/path/to/chat-screenshot-2.jpg"
```

Example response:

```json
{
  "chatId": "6a9f22ce-e4ab-4f03-8b7b-3ab82d0d66d7",
  "userEntry": {
    "id": "11c9c13f-98f7-4a3f-9545-2c6dd8d0f116",
    "role": "user_submission",
    "mode": "ask_advice",
    "contentText": "Pasted text:\nthis happened last date and I do not know what it means\n\nScreenshot OCR:\nScreenshot 1:\n...\n\nScreenshot 2:\n...",
    "sourceText": "this happened last date and I do not know what it means",
    "ocrText": "Screenshot 1:\n...\n\nScreenshot 2:\n...",
    "createdAt": "2026-03-23T19:09:01.441Z"
  },
  "assistantEntry": {
    "id": "8cbf5c56-33ab-47b2-b717-aec5eaebf2e2",
    "role": "assistant_output",
    "mode": "ask_advice",
    "status": "success",
    "contentText": "Her replies suggest interest, but she may be testing consistency before committing to another date.",
    "payload": {
      "mode": "ask_advice",
      "advice": "Her replies suggest interest, but she may be testing consistency before committing to another date.",
      "nextSteps": [
        "Send one clear and calm follow-up proposing a day and time.",
        "Avoid overexplaining; keep the message short and confident.",
        "If she stays vague again, give space and let her re-engage."
      ]
    },
    "model": "gpt-5.2",
    "usage": null,
    "errorMessage": null,
    "createdAt": "2026-03-23T19:09:03.090Z"
  },
  "output": {
    "mode": "ask_advice",
    "advice": "Her replies suggest interest, but she may be testing consistency before committing to another date.",
    "nextSteps": [
      "Send one clear and calm follow-up proposing a day and time.",
      "Avoid overexplaining; keep the message short and confident.",
      "If she stays vague again, give space and let her re-engage."
    ],
    "model": "gpt-5.2"
  },
  "errorMessage": null
}
```

Generate a full analysis card from latest chat context:

```bash
curl -sS -X POST "$API/conversation/chats/$CHAT_ID/analyze-options" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Notes:

- analyzes the latest chat context (no body required)
- requires at least one prior `user_submission` entry in that chat
- generates and stores a new `assistant_output` entry with `mode=analyze_options` on every call

Example response:

```json
{
  "chatId": "6a9f22ce-e4ab-4f03-8b7b-3ab82d0d66d7",
  "analysisEntryId": "b31b87b2-f9b5-4ea0-b7a3-68f25fb4cb0a",
  "analysis": {
    "conversationState": {
      "title": "High curiosity with playful push-pull",
      "tags": ["intrigued", "playful"]
    },
    "coreStrategy": "Match their energy with concise confidence and one clear intent signal.",
    "flowScore": 85,
    "successProbability": 82,
    "scoreBand": "high",
    "nextSteps": [
      "Wait 15-20 minutes before replying.",
      "Send one playful line plus a clear invite."
    ],
    "suggestedReplies": [
      {
        "label": "safe",
        "text": "Haha, bold move for a Tuesday.",
        "recommended": false
      },
      {
        "label": "balanced",
        "text": "You are full of surprises. Let us see if you can keep that energy up.",
        "recommended": true
      },
      {
        "label": "bold",
        "text": "Usually I charge for compliments that good, but I will make an exception.",
        "recommended": false
      }
    ],
    "rationale": "Their last messages increased in assertiveness, so a balanced mirror is likely to perform best.",
    "safety": {
      "blocked": false,
      "flags": []
    },
    "model": "gpt-5.2",
    "usage": null,
    "providerResponseId": "resp_123"
  },
  "createdAt": "2026-03-24T02:18:51.129Z"
}
```

### Coaching v1 (auth required, stored in DB)

Create coaching suggestion:

```bash
curl -sS -X POST "$API/coaching" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scenarioText": "I met someone at a cafe and got her number.",
    "lastMessageText": "Hey, nice meeting you :)",
    "goal": "casual",
    "vibe": "relax_joker",
    "flirtLevel": "light",
    "constraints": {
      "language": "en",
      "numOptions": 3,
      "emojiLevel": "some"
    }
  '
```

Allowed values:

- `goal`: `casual`, `serious_relationship`, `just_chat`
- `vibe`: `relax_joker`, `quiet_polite`, `confident_direct`, `reserved_respectful`
- `flirtLevel`: `none`, `light`, `classy`

List your coaching responses:

```bash
curl -sS "$API/coaching/responses?limit=20" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Get one response by ID:

```bash
curl -sS "$API/coaching/responses/<RESPONSE_ID>" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Leave feedback for a response:

```bash
curl -sS -X POST "$API/coaching/responses/<RESPONSE_ID>/feedback" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": "good",
    "commentText": "Natural tone, maybe a bit long.",
    "signals": {
      "length": "too_long",
      "would_send": true
    },
    "userRewriteText": "Hey! Great meeting you, how was your day?"
  '
```

Allowed feedback ratings:

- `very_bad`
- `bad`
- `neutral`
- `good`
- `excellent`

List your feedback:

```bash
curl -sS "$API/coaching/feedback?limit=20" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Coaching v2 (public endpoint in current code)

Generate structured coaching output:

```bash
curl -sS -X POST "$API/coaching-v2" \
  -H "Content-Type: application/json" \
  -d '{
    "scenarioText": "I matched with someone and want to send the first text.",
    "lastMessageText": null,
    "goal": "casual",
    "vibe": "confident_direct",
    "flirtLevel": "light",
    "constraints": {
      "language": "es",
      "locale": "es-MX",
      "numOptions": 3,
      "emojiLevel": "some",
      "riskTolerance": "balanced",
      "includeRationale": true
    }
  }'
```

Typical response:

```json
{
  "status": "success",
  "message": "Hey 🙂 ...",
  "options": [{ "text": "...", "label": "balanced" }],
  "rationale": ["..."],
  "safety": { "blocked": false, "flags": [] },
  "detected": { "tone": ["..."], "askedQuestion": true, "energy": "medium" }
}
```

### Swagger docs

Swagger UI is available at:

```text
http://localhost:3000/docs
```

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
