const { OpenAI } = require('openai');
require('dotenv').config(); // ⚠️ BẮT BUỘC nếu bạn chưa có dòng này

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.generateScriptByAI = async (keyword) => {
  const prompt = `
Bạn là một chuyên gia sáng tạo nội dung TikTok/YouTube Shorts.

Hãy viết một kịch bản video ngắn (dưới 1 phút) cho chủ đề: "${keyword}".

Yêu cầu:
- Mở đầu thu hút (Hook)
- Nội dung chính đầy đủ, chi tiết
- Kết thúc kêu gọi hành động (Call to Action)
- Viết dạng lời thoại video chi tiết để dễ tạo video
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4", // hoặc "gpt-3.5-turbo"
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error("❌ Lỗi khi gọi OpenAI:", error.message);
    if (error.response) {
      console.error("Chi tiết:", await error.response.json());
    }
    throw new Error("Gọi OpenAI thất bại.");
  }
};
