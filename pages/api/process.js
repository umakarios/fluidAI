import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  // POSTメソッドのみ許可
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userInput, userAdjust } = req.body;

  // 入力検証
  if (!userInput || typeof userInput !== 'string') {
    return res.status(400).json({ error: 'Invalid input' });
  }

  // APIキーの確認
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  try {
    const adjustmentText = Object.keys(userAdjust || {}).length > 0 
      ? `\nユーザー調整パラメータ: ${JSON.stringify(userAdjust)}
これらの調整値を各層のfluidityに加算してください(最小0.0、最大1.0にクリップ)。` 
      : '';

    const prompt = `あなたは流体自己最適化AIです。以下の入力を4つの層(meaning, emotion, logic, context)で分析し、各層の流動性スコア(0.0-1.0)とともに応答してください。${adjustmentText}

入力: "${userInput}"

必ず以下のJSON形式"のみ"で応答してください(他のテキストは含めないでください):
{
  "meaning": {"content": "意味層での分析内容", "fluidity": 0.75},
  "emotion": {"content": "感情層での分析内容", "fluidity": 0.65},
  "logic": {"content": "論理層での分析内容", "fluidity": 0.80},
  "context": {"content": "文脈層での分析内容", "fluidity": 0.70}
}

重要: 
- contentは各層の観点から入力を分析した結果を日本語で記述
- fluidityは0.0-1.0の範囲で、その層の分析の確信度や重要度を表す
- JSON形式のみを返し、前後に説明文を含めない`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: prompt
      }]
    });

    // レスポンスからテキストを抽出
    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    // JSONを抽出(マークダウンのコードブロックを除去)
    let cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // JSONパース
    let layerMaps;
    try {
      layerMaps = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Response text:', responseText);
      
      // パースエラーの場合はデフォルト応答を返す
      layerMaps = {
        meaning: { content: `「${userInput}」の意味を分析しました`, fluidity: 0.7 },
        emotion: { content: '感情的な側面を検出しました', fluidity: 0.6 },
        logic: { content: '論理構造を解析しました', fluidity: 0.75 },
        context: { content: '文脈を理解しました', fluidity: 0.65 }
      };
    }

    // ユーザー調整を適用
    if (userAdjust && Object.keys(userAdjust).length > 0) {
      Object.keys(userAdjust).forEach(layer => {
        if (layerMaps[layer]) {
          const adjustment = parseFloat(userAdjust[layer]);
          layerMaps[layer].fluidity = Math.max(0, Math.min(1, 
            parseFloat(layerMaps[layer].fluidity) + adjustment
          ));
        }
      });
    }

    // ランク付け
    const ranked = Object.entries(layerMaps).sort((a, b) => 
      parseFloat(b[1].fluidity) - parseFloat(a[1].fluidity)
    );

    res.status(200).json({
      success: true,
      input: userInput,
      layerMaps,
      ranked
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Failed to process request',
      message: error.message 
    });
  }
}