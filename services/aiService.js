const { OpenAI } = require('openai');
require('dotenv').config(); // ⚠️ BẮT BUỘC nếu bạn chưa có dòng này

// Thêm log để kiểm tra API key (che một phần key để bảo mật)
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('❌ OPENAI_API_KEY không được cấu hình trong tệp .env!');
} else {
  const maskedKey = apiKey.substring(0, 5) + '...' + apiKey.substring(apiKey.length - 4);
  console.log(`✓ Đã tìm thấy OPENAI_API_KEY: ${maskedKey}`);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Sửa hàm sinh chủ đề bằng AI để trả về mảng thay vì chuỗi
exports.generateTopicByAI = async (keyword) => {
  // Đảm bảo keyword là chuỗi và không rỗng
  if (!keyword || typeof keyword !== 'string' || keyword.trim() === '') {
    console.log('❌ Từ khóa không hợp lệ hoặc rỗng:', keyword);
    return [
      { title: "Vui lòng nhập từ khóa để sinh chủ đề", source: 'AI' }
    ];
  }
  
  // Đảm bảo keyword là chuỗi sạch
  const cleanKeyword = keyword.trim();
  console.log('🔍 Gọi AI với từ khóa đã làm sạch:', cleanKeyword);
  
  const prompt = `
Bạn là một chuyên gia sáng tạo nội dung cho mạng xã hội.

Hãy gợi ý 10 ý tưởng chủ đề video ngắn hấp dẫn liên quan đến: "${cleanKeyword}".

Yêu cầu:
- Ý tưởng phải thu hút người xem
- Phù hợp với xu hướng hiện tại
- Tiêu đề phải ngắn gọn, hấp dẫn
- QUAN TRỌNG: Chỉ trả về danh sách dạng JSON với format sau: 
[
  {"title": "Tiêu đề 1"},
  {"title": "Tiêu đề 2"},
  ... các tiêu đề khác
]
- Không thêm thông tin giới thiệu hay giải thích
`;

  try {
    console.log('🤖 Đang gọi OpenAI API với prompt:', prompt.substring(0, 100) + '...');
    
    // Thử các mô hình khác nhau nếu gặp lỗi
    let model = "gpt-3.5-turbo";
    
    try {
      const completion = await openai.chat.completions.create({
        model: model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 500,
      });

      console.log('✓ Đã nhận phản hồi từ OpenAI API');
      let result = completion.choices[0].message.content.trim();
      console.log('📝 Kết quả thô từ OpenAI:', result.substring(0, 100) + '...');
      
      // Đảm bảo kết quả là một mảng JSON hợp lệ
      let topics = [];
      
      try {
        // Tìm và trích xuất phần JSON trong kết quả (nếu có)
        const jsonMatch = result.match(/\[\s*\{.*\}\s*\]/s);
        if (jsonMatch) {
          console.log('Tìm thấy chuỗi JSON trong kết quả');
          result = jsonMatch[0];
        }
        
        topics = JSON.parse(result);
        console.log('✅ Parse JSON thành công');
      } catch (jsonError) {
        console.log('❌ Không thể parse JSON, chuyển sang xử lý văn bản');
        // Nếu không phải JSON, cố gắng phân tích từ văn bản
        const lines = result.split('\n').filter(line => line.trim() !== '');
        topics = [];
        
        // Tìm các dòng có chứa tiêu đề
        for (const line of lines) {
          // Loại bỏ số thứ tự, dấu gạch đầu dòng
          const cleanLine = line.replace(/^(\d+\.|\-|\*)\s*/, '').trim();
          
          // Loại bỏ các ký tự không cần thiết như dấu ngoặc kép, dấu phẩy nếu đó là phần của JSON
          const titleMatch = cleanLine.match(/"title"\s*:\s*"([^"]+)"/);
          
          if (titleMatch) {
            topics.push({ title: titleMatch[1] });
          } else if (cleanLine && cleanLine.length > 3) {
            topics.push({ title: cleanLine });
          }
        }
      }
      
      // Nếu không tìm thấy đủ chủ đề, tạo một số chủ đề mẫu
      if (!Array.isArray(topics) || topics.length < 3) {
        console.log('⚠️ Không đủ chủ đề, tạo chủ đề mẫu');
        topics = [
          { title: `${cleanKeyword}: Những điều bạn chưa biết` },
          { title: `10 bí mật về ${cleanKeyword} ít người biết đến` },
          { title: `${cleanKeyword} trending 2024 - Xu hướng mới nhất` },
          { title: `Làm thế nào để ${cleanKeyword} hiệu quả nhất` },
          { title: `${cleanKeyword} cho người mới bắt đầu` },
          { title: `${cleanKeyword} - Phiên bản nâng cấp` },
          { title: `Sự thật về ${cleanKeyword} gây sốc` },
          { title: `${cleanKeyword} trong 60 giây` },
          { title: `${cleanKeyword} - Trải nghiệm đầu tiên` },
          { title: `${cleanKeyword} hacks bạn nên biết` }
        ];
      }
      
      // Map để đảm bảo mỗi phần tử có đúng định dạng
      const formattedTopics = topics.map(item => {
        if (typeof item === 'string') {
          return { title: item, source: 'AI' };
        }
        return { title: item.title || `Ý tưởng về ${cleanKeyword}`, source: 'AI' };
      }).slice(0, 10); // Giới hạn 10 chủ đề
      
      console.log(`✓ Đã xử lý thành công ${formattedTopics.length} chủ đề từ OpenAI`);
      return formattedTopics;
      
    } catch (apiError) {
      console.error("❌ Lỗi khi gọi OpenAI:", apiError.message);
      
      // Tạo chủ đề mẫu khi API lỗi
      console.log('⚠️ API lỗi, tạo chủ đề mẫu');
      const fallbackTopics = [
        { title: `${cleanKeyword}: Những điều bạn chưa biết`, source: 'AI' },
        { title: `10 bí mật về ${cleanKeyword} ít người biết đến`, source: 'AI' },
        { title: `${cleanKeyword} trending 2024 - Xu hướng mới nhất`, source: 'AI' },
        { title: `Làm thế nào để ${cleanKeyword} hiệu quả nhất`, source: 'AI' },
        { title: `${cleanKeyword} cho người mới bắt đầu`, source: 'AI' },
        { title: `${cleanKeyword} - Phiên bản nâng cấp`, source: 'AI' },
        { title: `Sự thật về ${cleanKeyword} gây sốc`, source: 'AI' },
        { title: `${cleanKeyword} trong 60 giây`, source: 'AI' },
        { title: `${cleanKeyword} - Trải nghiệm đầu tiên`, source: 'AI' },
        { title: `${cleanKeyword} hacks bạn nên biết`, source: 'AI' }
      ];
      return fallbackTopics;
    }
    
  } catch (generalError) {
    console.error("❌ Lỗi tổng thể:", generalError.message);
    
    // Tạo chủ đề mẫu khi có lỗi tổng thể
    const emergencyTopics = [
      { title: `${cleanKeyword}: Những điều bạn chưa biết`, source: 'AI' },
      { title: `10 bí mật về ${cleanKeyword} ít người biết đến`, source: 'AI' },
      { title: `${cleanKeyword} trending 2024 - Xu hướng mới nhất`, source: 'AI' },
      { title: `Làm thế nào để ${cleanKeyword} hiệu quả nhất`, source: 'AI' },
      { title: `${cleanKeyword} cho người mới bắt đầu`, source: 'AI' },
      { title: `${cleanKeyword} - Phiên bản nâng cấp`, source: 'AI' },
      { title: `Sự thật về ${cleanKeyword} gây sốc`, source: 'AI' },
      { title: `${cleanKeyword} trong 60 giây`, source: 'AI' },
      { title: `${cleanKeyword} - Trải nghiệm đầu tiên`, source: 'AI' },
      { title: `${cleanKeyword} hacks bạn nên biết`, source: 'AI' }
    ];
    return emergencyTopics;
  }
};

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
    // Import và kiểm tra Gemini API
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    
    // Kiểm tra API key có tồn tại không
    if (!process.env.GEMINI_API_KEY) {
      console.log('⚠️ Không tìm thấy GEMINI_API_KEY, chuyển sang dùng kịch bản mẫu...');
      throw new Error("Không tìm thấy GEMINI_API_KEY");
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro-preview" });
    
    // Gọi Gemini API
    console.log('🤖 Đang gọi Gemini API để tạo kịch bản...');
    const result = await model.generateContent(prompt);
    const response = result.response;
    const scriptContent = response.text().trim();
    console.log('✓ Đã nhận phản hồi từ Gemini API');
    
    return scriptContent;
    
  } catch (error) {
    console.error("❌ Lỗi khi gọi Gemini:", error.message);
    
    // Fallback sang OpenAI nếu Gemini có lỗi
    try {
      // Kiểm tra OpenAI API key có tồn tại không
      if (!process.env.OPENAI_API_KEY) {
        console.log('⚠️ Không tìm thấy OPENAI_API_KEY, chuyển sang dùng kịch bản mẫu...');
        throw new Error("Không tìm thấy OPENAI_API_KEY");
      }
      
      console.log('⚠️ Gemini lỗi, chuyển sang OpenAI...');
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Dùng gpt-3.5-turbo để tiết kiệm quota
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1000,
      });
  
      return completion.choices[0].message.content.trim();
    } catch (openAiError) {
      console.error("❌ Lỗi khi gọi OpenAI:", openAiError.message);
      
      // Tạo kịch bản mẫu nếu cả hai API đều thất bại
      console.log('⚠️ Tất cả API đều thất bại, sử dụng kịch bản mẫu');
      
      // Tạo kịch bản mẫu dựa trên từ khóa
      return `
# Kịch bản video về "${keyword}"

## Mở đầu (Hook)
"Bạn đã bao giờ tự hỏi về ${keyword}? Hôm nay mình sẽ chia sẻ những điều thú vị nhất về chủ đề này!"

## Nội dung chính
"${keyword} là một chủ đề rất thú vị và đang được nhiều người quan tâm. Có 3 điều bạn nên biết:

1. ${keyword} đang trở thành xu hướng trong năm 2024
2. Những người thành công với ${keyword} thường áp dụng các phương pháp khác biệt
3. Bạn có thể bắt đầu với ${keyword} ngay hôm nay chỉ với 3 bước đơn giản

## Kết thúc (Call to Action)
"Nếu bạn thấy video này hữu ích, hãy like và follow để xem thêm nội dung về ${keyword} nhé! Comment bên dưới nếu bạn có câu hỏi hoặc muốn mình chia sẻ thêm về chủ đề này!"
`;
    }
  }
};