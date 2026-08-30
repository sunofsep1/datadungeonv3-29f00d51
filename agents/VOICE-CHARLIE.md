# Charlie's Voice — ElevenLabs via OpenClaw (runbook)

Status: NOT yet configured (no ELEVENLABS_API_KEY found in gateway env or
openclaw.json; no tts config set). ElevenLabs plugin ships with OpenClaw
(@openclaw/elevenlabs-speech) — no install needed, just a key + config.

## Steps (Greg does step 1 personally — API key stays with you)
1. Get an ElevenLabs API key: elevenlabs.io → Profile → API Keys.
   Pick a voice in their Voice Library and copy its Voice ID.
2. Add the key to the gateway env (don't paste it in chat):
   ~/.openclaw/service-env/ai.openclaw.gateway.env
   → add line: ELEVENLABS_API_KEY=<your key>
3. Set TTS provider + Charlie's voice:
   openclaw config set tts.provider elevenlabs
   openclaw config set tts.providers.elevenlabs.voiceId <VOICE_ID>
4. Restart gateway: openclaw gateway restart
5. Test: openclaw agent --agent main -m "Say hello as a voice note" then
   check the Telegram voice note (Charlie's replies default to voice notes).

## Notes
- Docs: docs.openclaw.ai/providers/elevenlabs and /tools/tts
- Voice replies = outbound polish only; approval gates still apply to
  anything consequential.
- Later (session 3): Talk mode / phone approvals — same key powers it.
