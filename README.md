# Kindle本推薦チャット（MVP）

学びたいテーマを入力すると、Google Books APIで候補を検索し、LLM（OpenAI互換API）の tool-calling で **5〜10冊**を推薦するチャットです。

## セットアップ

### 環境変数

`.env.example` をコピーして `.env.local` を作成し、最低限 `OPENAI_API_KEY` を設定してください。

```bash
cp .env.example .env.local
```

- **OPENAI_API_KEY**: 必須
- **OPENAI_BASE_URL**: 任意（例: OpenAI互換の自前/プロキシ。未指定なら `https://api.openai.com/v1`）
- **OPENAI_MODEL**: 任意（未指定なら `gpt-4.1-mini`）
- **GOOGLE_BOOKS_API_KEY**: 任意（未指定でも動きますが、クォータの都合で推奨）

## 起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開いてください。

## 実装の場所（拡張ポイント）

- **チャットUI**: `src/components/Chat.tsx`
- **API**: `src/app/api/chat/route.ts`
- **エージェント**: `src/lib/agent/runAgent.ts`
- **ツール**: `src/tools/`（ツールを1ファイル追加して `src/tools/index.ts` に登録）
