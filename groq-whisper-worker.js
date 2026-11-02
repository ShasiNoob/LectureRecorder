// Cloudflare Worker: ブラウザ -> このWorker -> Groq Whisper
// 使い方:
//   1. Cloudflare Workers にこのコードをデプロイ
//   2. 環境変数 (Settings > Variables and Secrets) に GROQ_API_KEY を Secret で登録
//   3. デプロイ先URLを LectureRecorder の「プロキシURL」に貼る
// これで Groq のCORS制限を回避でき、APIキーもブラウザに置かずに済む。

export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "POST only" }), {
        status: 405, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!env.GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY is not set" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // アプリからは multipart/form-data (file, model, language, prompt, ...) が届く。
    // 内容はそのまま Groq へ中継し、認証だけ Worker 側で付ける。
    const form = await request.formData();
    const upstream = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` },
      body: form,
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { ...cors, "Content-Type": upstream.headers.get("Content-Type") || "application/json" },
    });
  },
};
