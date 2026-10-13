# AI model research for NeoMath

Date: 2026-10-09. Model lineups change fast, so re-check prices before you commit. Every number below has a source link. If I could not find a number, it says "not found". Many sources are third-party trackers (pricepertoken, benchlm, Artificial Analysis, devtoolpicks). Treat them as good estimates, not contracts. Prices should be re-checked on the vendor page before switching.

## 1. Current setup and its weaknesses

Files: `backend/src/services/ai/ai.service.ts` and `prompts.ts`.

How it works today:
- Primary is `gemini-2.5-flash` through the direct Gemini API (`callGemini`).
- If `USE_MULTI_MODEL=true`, sequential failover: Gemini gets 20s; if it fails or runs out of time, `deepseek/deepseek-v4-flash` on OpenRouter gets one try with 20s (fastest host via `provider.sort = throughput`). (The old staggered race used two OpenRouter models that no longer exist, so it was replaced.)
- Output is plain text that is cleaned with a regex and `JSON.parse` (`parseAIResponse`). No JSON mode or schema is used.

Weaknesses found in the code:
1. **Nothing is actually verified.** `transformToSolution` sets every step to `status: "VERIFIED"` with no check at all. This clashes with the "verified solutions" promise.
2. **The 8s backup fires on almost every solve.** A solve takes about 10s, so the backup timer (8s) usually starts a second paid call before the primary returns. That means about double the cost and the extra calls are wasted.
3. **Backup 1 is dead.** Google lists Gemini 2.0 Flash as shut down ([models page](https://ai.google.dev/gemini-api/docs/models)). Its AIME 2025 score was also only 21.7 ([pricepertoken](https://pricepertoken.com/leaderboards/benchmark/aime-25?page=2)), so even when alive it was a weak math model.
4. **Primary is now a legacy model.** Google says Gemini 2.5 models are restricted to users with past activity and recommends 3.5 Flash-Lite or 3.8 Flash for new projects ([models page](https://ai.google.dev/gemini-api/docs/models)). No shutdown date was found.
5. **Backup 2 is a free, mid-2025 model** (R1T2 Chimera, created July 2025, [typingmind](https://www.typingmind.com/guide/openrouter/deepseek-r1t2-chimera-free)). Free models have low rate limits and slow, unpredictable latency. It is a reasoning model, so it will rarely finish inside the 30s budget with a 4096 token cap.
6. **Token cap risk.** `maxOutputTokens: 4096` on a thinking model: thinking tokens usually count against the output cap, so long problems can be cut off and produce broken JSON.
7. **No images.** `SolveRequest` is `{ problem: string; mode?; chatId? }` (`backend/src/types/solve.types.ts`), and no image or upload handling exists in the backend solve code. Handwritten photos are not supported today.
8. **The "unsolvable" regex blocks valid problems.** `UNSOLVABLE_PATTERNS` rejects any text containing "infinity", "undefined" or "no solution", which breaks things like "limit as x approaches infinity".
9. **Old comments/logs.** The header comment says OpenRouter is primary and Gemini is the backup, which is the opposite of the code. Logging uses `console.log` on every call.
10. **No usage numbers from OpenRouter**, so cost cannot be tracked for backups (`tokenUsage: undefined`).

## 2. Candidate comparison

Notes on reading the table:
- AIME 2025 is close to saturated for top models ([benchlm summary via search](https://anotherwrapper.com/tools/llm-pricing/evals/aime-2025)), and the newest cheap models mostly have no published AIME number yet. I give what I found and mark the rest "not found".
- Speed is output tokens per second and TTFT is time to first token, from Artificial Analysis ([leaderboard](https://artificialanalysis.ai/leaderboards/models)). For reasoning models, "TTFT" includes thinking time, so it is the real wait before text appears.
- Prices are USD per 1M tokens.

| Model | Math scores found | Vision | JSON / structured output | Speed (tok/s) and TTFT | Price in / out | Free tier | Sources |
|---|---|---|---|---|---|---|---|
| **Gemini 3.8 Flash** (`gemini-3.8-flash`, released 2026-09-02) | AIME: not found. (Older Gemini 3 Flash Preview with thinking: 97.0 AIME 2025.) | Yes (Gemini family is multimodal; benchlm lists image benchmarks) | Yes (documented Gemini feature, not re-checked here) | 246 tok/s and 8.29s at medium thinking; 286 tok/s and 17.36s at high | 0.75 / 3.75 (intro price until 2026-12-31, rises 2027-01-01, new price not found) | Yes | [pricing](https://ai.google.dev/gemini-api/docs/pricing), [models](https://ai.google.dev/gemini-api/docs/models), [speed](https://benchlm.ai/md/models/gemini-3-8-flash.md), [3 Flash AIME](https://pricepertoken.com/leaderboards/benchmark/aime-25) |
| **Gemini 3.5 Flash-Lite** | AIME: not found. GPQA Diamond 83.8 | Yes | Yes (same API) | 346 tok/s, TTFT 8.62s | 0.30 / 2.50 | Yes | [pricing](https://ai.google.dev/gemini-api/docs/pricing), [scores](https://benchlm.ai/md/models/gemini-3-5-flash-lite.md), [speed](https://artificialanalysis.ai/leaderboards/models) |
| **Gemini 3.1 Flash-Lite** | not found | Yes | Yes | not found | 0.25 / 1.50 | Yes | [pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| **Gemini 2.5 Flash** (current NeoMath primary) | AIME 2025: 60.3 (no thinking), 73.3 (thinking) | Yes | Yes | not found | 0.30 / 2.50 | Yes (but access limited to past users) | [pricing](https://ai.google.dev/gemini-api/docs/pricing), [AIME](https://pricepertoken.com/leaderboards/benchmark/aime-25?page=2), [models](https://ai.google.dev/gemini-api/docs/models) |
| **GPT-6 Luna** (OpenAI, released 2026-09-22) | Math: not found. ARC-AGI-1 86.7 | Yes | Yes | 121 tok/s, TTFT 3.05s (low reasoning); 119 tok/s, 0.76s (non-reasoning) | 0.10 / 0.50 | not found | [price and features](https://devtoolpicks.com/ai-models/gpt-6-luna), [scores](https://benchlm.ai/md/models/gpt-6-luna.md), [speed](https://artificialanalysis.ai/leaderboards/models) |
| **Claude Haiku 5.5** (Anthropic) | Math: not found. (Haiku 4.5 with thinking: 83.7 AIME 2025.) | Yes (Claude models accept images; not re-checked for 5.5) | Not confirmed for this model (Claude can return JSON by prompt; native schema support not checked) | 178 tok/s, TTFT 9.93s (low); 137 tok/s, 13.40s (medium) | 0.10 / 0.50 (prompts up to 100k tokens) | Small test credits only | [pricing](https://platform.claude.com/docs/en/about-claude/pricing), [speed](https://artificialanalysis.ai/leaderboards/models), [Haiku 4.5](https://pricepertoken.com/leaderboards/benchmark/aime-25) |
| **DeepSeek V4.1 Flash** (released 2026-09-10, open weights) | LiveBench Math 93.3, ProofBench 54.0. AIME: not found | Yes per DeepSeek docs for the Flash model | Yes (JSON output listed) | 219 tok/s, TTFT 1.06s (non-reasoning) | Roughly 0.30 / 1.20 at peak hours (cache miss), half at off-peak. The docs page mixes Flash and Pro, so confirm on the page | not found | [pricing](https://api-docs.deepseek.com/quick_start/pricing), [scores](https://llmrun.dev/model/deepseek-ai-deepseek-v4-1-flash/benchmarks), [speed](https://artificialanalysis.ai/leaderboards/models) |
| **Qwen3.8 Flash** (Alibaba, released 2026-08-26) | Math: not found | Yes (text, image, video) | Yes | Artificial Analysis lists a "Qwen3.8-Flash-Next": 56 tok/s, TTFT 2.47s. Name differs, so treat as approximate | 0.15 / 0.47 (Alibaba Model Studio) | not found | [price and features](https://devtoolpicks.com/ai-models/qwen3.8-flash), [speed](https://artificialanalysis.ai/leaderboards/models) |
| **gpt-oss-120b** (OpenAI open weights, via OpenRouter or other hosts) | AIME 2025: 93.4 | No (text only) | Depends on host | not found (gpt-oss-20b: 240 tok/s) | 0.03 / 0.10 (tracker price) | Free variants may exist, not checked | [pricepertoken](https://pricepertoken.com/leaderboards/benchmark/aime-25), [speed](https://artificialanalysis.ai/leaderboards/models) |
| **Claude Sonnet 5.5** (as a premium checker only) | not found | Yes | not confirmed | not found | 2 / 10 | Small test credits only | [pricing](https://platform.claude.com/docs/en/about-claude/pricing) |

Other facts worth knowing:
- Open-weight Chinese models lead AIME 2026 (GLM-5.2 99.2, Kimi K2.6 96.4, Qwen3.6 Plus 95.3, Qwen3.6-27B 94.1) ([benchlm AIME 2026](https://www.benchlm.ai/benchmarks/aime2026)). They are mostly bigger or not priced here. Qwen3.6-27B is a strong small option if you later self-host or use a host like OpenRouter. I did not find its price.
- The big lesson from the numbers: **thinking mode matters more than brand**. Gemini 3 Flash scored 55.7 without thinking and 97.0 with it; Gemini 2.5 Flash scored 60.3 vs 73.3 ([pricepertoken](https://pricepertoken.com/leaderboards/benchmark/aime-25?page=2)). For a math product, always use a reasoning mode.

## 3. Recommendation

### Honest caveat
The newest cheap models (Luna, Haiku 5.5, Qwen3.8 Flash, Gemini 3.5 Flash-Lite) have **no published AIME or MATH number that I could find**. The recommendation below is therefore based on price, features, speed, and the older same-family results. Before switching, run a small test: take about 50 real problems from your users, run each candidate, and count wrong answers. That test is the only evidence that matters for the "verified" promise.

### Primary: Gemini 3.8 Flash with thinking set to low or medium
Why:
- Same SDK, same key (`GEMINI_MATH_AI_API`), no new vendor.
- Has a free tier, which suits open sign-up and a solo dev.
- Accepts images, so handwritten problems become possible later without another vendor.
- The same Gemini family jumped to 97.0 on AIME 2025 when thinking was on (Gemini 3 Flash Preview). 3.8 is newer.
- Speed: about 246 tok/s and 8.3s to the first answer token at medium thinking ([benchlm](https://benchlm.ai/md/models/gemini-3-8-flash.md)). That is about the same as your current 10s, so latency will not get worse. Use low thinking for easy algebra if you want it faster (I did not find a low-tier number).
- Risk: price is an intro price until 2026-12-31 and goes up on 2027-01-01 ([pricing](https://ai.google.dev/gemini-api/docs/pricing)). If the cost matters, plan to re-test Gemini 3.5 Flash-Lite as a cheaper primary.

### Fallback: GPT-6 Luna (reasoning low), through OpenAI direct or OpenRouter
Why: cheapest strong-looking option ($0.10 / $0.50), vision and structured output, and a short TTFT of 3.05s at low reasoning ([speed](https://artificialanalysis.ai/leaderboards/models)). A different vendor from the primary means a Google outage will not take you down. Alternative with similar price: Qwen3.8 Flash.

### Keep the staggered race? No
- The race at 8s fires on nearly every solve now (see weakness 2), so you pay for two calls to save a few seconds only on slow requests.
- Use a plain **sequential failover** instead: call the primary with a timeout of about 20s. If it errors or times out, call the fallback once. You pay for a second call only when the first one failed.
- Delete the free DeepSeek Chimera tier and the dead Gemini 2.0 model.
- If you want the speed benefit of a race, start the fallback early only when the primary has not returned by about 15s, not 8s.

### Verify pass: is a second cheap model worth it?
- **A second LLM that re-reads the answer: only partly.** It is cheap (about $0.4 to $1 per 1,000 solves, see below), but a small model checking a hard integral often agrees with a wrong answer. It catches arithmetic slips better than concept errors.
- **Better, and still cheap: a numeric check with code.** For algebra and calculus, ask the model for a final answer, then verify with a computer algebra library (substitute the answer back into the equation, or differentiate the integral result). This is real verification. It needs a new dependency (for example a CAS or `mathjs`), so I would propose it as a separate decision for you to approve. I did not research which library fits Bun and Vercel.
- **Recommendation:** do not ship an LLM verify pass for every solve. Do (a) stop hard-coding `VERIFIED`, (b) add a code-based substitution check where it is possible, and (c) show "checked by substitution" only when that check passed. Use an LLM second opinion only for problems where the check is not possible, and label it honestly (for example "second opinion agreed").

### Cost per 1,000 solves
Token assumptions (my estimates, check against real `usageMetadata` from your logs):
- Input: about 900 tokens per solve (the system prompt plus the template in `prompts.ts` is long, roughly 750 tokens, plus the problem).
- Output: about 1,500 tokens of visible JSON (6 to 8 steps with explanations).
- Thinking: about 2,000 extra tokens billed as output.
- So per solve: 900 in, 3,500 out. Per 1,000 solves: 0.9M in, 3.5M out.

| Option | Math | Cost per 1,000 solves |
|---|---|---|
| Gemini 3.8 Flash (0.75 / 3.75) | 0.9 x 0.75 + 3.5 x 3.75 | **$13.80** |
| Gemini 3.5 Flash-Lite (0.30 / 2.50) | 0.27 + 8.75 | $9.02 |
| Gemini 3.1 Flash-Lite (0.25 / 1.50) | 0.225 + 5.25 | $5.48 |
| Gemini 2.5 Flash today (0.30 / 2.50) | 0.27 + 8.75 | $9.02 (and about double if the 8s backup fires) |
| GPT-6 Luna (0.10 / 0.50) | 0.09 + 1.75 | **$1.84** |
| Claude Haiku 5.5 (0.10 / 0.50) | 0.09 + 1.75 | $1.84 |
| Qwen3.8 Flash (0.15 / 0.47) | 0.135 + 1.645 | $1.78 |
| gpt-oss-120b (0.03 / 0.10) | 0.027 + 0.35 | $0.38 |

Recommended plan: Gemini 3.8 Flash primary, with Luna only when it fails (assume 3 percent of solves): about $13.80 + 0.03 x $1.84 = **about $13.85 per 1,000 solves**. With the free Gemini tier you may pay nothing at low volume, but the free tier allows Google to use your content to improve its products, and has low rate limits ([search summary](https://benchlm.ai/google/api-pricing)). Use a paid key before open public launch.

Cheaper path if cost matters more than the best math: GPT-6 Luna as primary ($1.84 per 1,000) after you confirm accuracy on your 50 test problems. That is about 7 times cheaper than Gemini 3.8 Flash.

LLM verify pass cost (if you add it): input about 2,400 tokens (problem plus solution), output about 300 to 1,500 tokens on Luna. That is 2.4M x 0.10 + 0.3M x 0.50 = $0.39 per 1,000 with no thinking, up to 2.4M x 0.10 + 1.5M x 0.50 = $0.99 with some thinking.

## 4. How to switch (no code changed yet)

All in `backend/src/services/ai/ai.service.ts` unless noted:

1. **Constants** at the top:
   - `PRIMARY_MODEL`: change to `"gemini-3.8-flash"`.
   - `BACKUP1_MODEL`: change to the fallback model id (for example the OpenRouter id for GPT-6 Luna; confirm the exact id on openrouter.ai).
   - `BACKUP2_MODEL`: remove along with `BACKUP2_START_DELAY_MS`.
   - `BACKUP1_START_DELAY_MS`: if you keep any early start, raise from 8000 to about 15000. For sequential failover it is not needed.
   - `OVERALL_TIMEOUT_MS`: keep at 30000 or lower to about 25000 (Vercel function limits should be checked; `vercel.json` does not set `maxDuration`).
2. **`callGemini`**: add thinking settings and JSON mode in `generationConfig` (a response MIME type of JSON, and a thinking level or budget). Raise `maxOutputTokens` from 4096 to roughly 8192 so thinking tokens do not cut off the answer. Check the exact field names in the current Gemini SDK docs. Note the code uses the older `@google/generative-ai` package; the newer Google SDK may be needed for Gemini 3.x thinking options. That would be a dependency change for you to approve.
3. **`callOpenRouter`**: add a JSON response format to the request body, raise `max_tokens`, and read `data.usage` so `tokenUsage` is filled in.
4. **`solveWithStaggeredStrategy`**: replace with a simple function that calls `callGemini`, then on error or timeout calls `callOpenRouter` once. This removes the timers and the `checkAllFailed` logic.
5. **`solveMathProblem`**: the `USE_MULTI_MODEL` check can stay as the switch for "enable fallback".
6. **`transformToSolution`**: stop setting `status: "VERIFIED"` for every step; set it from a real check result.
7. **`UNSOLVABLE_PATTERNS`**: loosen or remove "infinity", "undefined" and "no solution".
8. **`checkAIServiceHealth`**: still uses the string `"gemini-2.5-flash"`; change it to `PRIMARY_MODEL`.
9. **`prompts.ts`**: no change needed for the switch. If you move to JSON mode, the "JSON only" lines can stay.
10. **Images (later)**: needs a new field on `SolveRequest` in `backend/src/types/solve.types.ts`, an upload route with zod validation, and an image part added to the `generateContent` call. Not part of this switch.

## Source list
- Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing
- Gemini models and shutdowns: https://ai.google.dev/gemini-api/docs/models
- Claude pricing: https://platform.claude.com/docs/en/about-claude/pricing
- DeepSeek pricing: https://api-docs.deepseek.com/quick_start/pricing
- AIME 2025 with prices: https://pricepertoken.com/leaderboards/benchmark/aime-25 and https://pricepertoken.com/leaderboards/benchmark/aime-25?page=2
- AIME 2026: https://www.benchlm.ai/benchmarks/aime2026
- Speed and latency: https://artificialanalysis.ai/leaderboards/models
- GPT-6 Luna: https://devtoolpicks.com/ai-models/gpt-6-luna and https://benchlm.ai/md/models/gpt-6-luna.md
- Qwen3.8 Flash: https://devtoolpicks.com/ai-models/qwen3.8-flash
- Gemini 3.8 Flash scores and speed: https://benchlm.ai/md/models/gemini-3-8-flash.md
- Gemini 3.5 Flash-Lite scores: https://benchlm.ai/md/models/gemini-3-5-flash-lite.md
- DeepSeek V4.1 Flash scores: https://llmrun.dev/model/deepseek-ai-deepseek-v4-1-flash/benchmarks
- R1T2 Chimera free: https://www.typingmind.com/guide/openrouter/deepseek-r1t2-chimera-free
