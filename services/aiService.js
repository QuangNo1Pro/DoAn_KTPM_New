const { GoogleGenerativeAI } = require("@google/generative-ai");

// Đảm bảo đã cấu hình biến môi trường
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Hàm sinh chủ đề video từ AI
exports.generateTopicByAI = async (keyword) => {
  // ✅ Sửa tên model tại đây
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

  const prompt = `Hãy đề xuất một chủ đề video ngắn YouTube hấp dẫn, sáng tạo, liên quan đến từ khóa: "${keyword || 'ngẫu nhiên'}". Chỉ trả về một dòng tiêu đề, không thêm mô tả.`;

  try {
    const result = await model.generateContent(prompt);
    const text = (await result.response).text().trim();
    return `🔥 AI đề xuất chủ đề: "${text}"\n=> Dựa trên từ khóa: "${keyword || 'ngẫu nhiên'}"`;
  } catch (err) {
    console.error("Error generating topic:", err);
    return "❌ Lỗi khi sinh chủ đề từ AI.";
  }
};

// Hàm sinh kịch bản video từ AI
exports.generateScriptByAI = async (keyword) => {
  // ✅ Sửa tên model tại đây
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

  const prompt = `Hãy viết một kịch bản chi tiết cho video ngắn YouTube với chủ đề liên quan đến từ khóa: "${keyword || 'ngẫu nhiên'}". Cấu trúc kịch bản nên gồm: Giới thiệu, Nội dung chính (chia gạch đầu dòng nếu cần), và Kết thúc. Văn phong nên trẻ trung, sáng tạo, dễ hiểu.`;

  try {
    const result = await model.generateContent(prompt);
    const text = (await result.response).text().trim();
    return `🔥 AI đề xuất kịch bản:\n${text}\n\n=> Dựa trên từ khóa: "${keyword || 'ngẫu nhiên'}"`;
  } catch (err) {
    console.error("Error generating script:", err);
    return "❌ Lỗi khi sinh kịch bản từ AI.";
  }
};
