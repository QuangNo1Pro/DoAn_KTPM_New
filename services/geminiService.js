const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAuth } = require('google-auth-library');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Đường dẫn đến file credentials
const credentialsPath = path.join(__dirname, '..', 'gemini.json');

// Kiểm tra file credentials
if (!fs.existsSync(credentialsPath)) {
  console.error(`❌ Không tìm thấy file credentials tại đường dẫn: ${credentialsPath}`);
} else {
  console.log(`✓ Đã tìm thấy file credentials tại: ${credentialsPath}`);
}

// Khởi tạo Google Generative AI với auth từ service account
let genAI;
try {
  // Đọc credentials từ file
  const credentials = JSON.parse(fs.readFileSync(credentialsPath));
  
  // Cấu hình API key thay vì service account vì Gemini API chỉ hỗ trợ API key trực tiếp
  // Trong trường hợp này, ta vẫn dùng thư viện Generative AI nhưng sẽ cần API key
  
  // Thử lấy API key từ .env nếu có
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
    console.log('✓ Khởi tạo Gemini với API key từ .env');
  } else {
    // Fallback xuống mã thử nghiệm (demo)
    console.warn('⚠️ Không tìm thấy GEMINI_API_KEY trong .env file');
    console.warn('⚠️ Sử dụng service account credentials không được hỗ trợ trực tiếp với @google/generative-ai');
    console.warn('⚠️ Bạn cần tạo API key từ Google AI Studio và thêm vào .env file');
    genAI = new GoogleGenerativeAI("DEMO_KEY"); // Sẽ không hoạt động với DEMO_KEY
  }
} catch (error) {
  console.error('❌ Lỗi khi khởi tạo Gemini API:', error.message);
}

// Hàm sinh chủ đề bằng Gemini
exports.generateTopicByGemini = async (keyword) => {
  // Đảm bảo keyword là chuỗi và không rỗng
  if (!keyword || typeof keyword !== 'string' || keyword.trim() === '') {
    console.log('❌ Từ khóa không hợp lệ hoặc rỗng:', keyword);
    return [
      { title: "Vui lòng nhập từ khóa để sinh chủ đề", source: 'Gemini' }
    ];
  }
  
  // Đảm bảo keyword là chuỗi sạch
  const cleanKeyword = keyword.trim();
  console.log('🔍 Gọi Gemini với từ khóa đã làm sạch:', cleanKeyword);
  
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
    console.log('🤖 Đang gọi Gemini API với prompt:', prompt.substring(0, 100) + '...');
    
    try {
      if (!genAI) {
        throw new Error("Google Generative AI chưa được khởi tạo");
      }
      
      // Lấy model Gemini
      const model = genAI.getGenerativeModel({ model: "gemini-pro-2.5" });
      
      // Gọi API
      const result = await model.generateContent(prompt);
      const response = result.response;
      console.log('✓ Đã nhận phản hồi từ Gemini API');
      
      let responseText = response.text().trim();
      console.log('📝 Kết quả thô từ Gemini:', responseText.substring(0, 100) + '...');
      
      // Đảm bảo kết quả là một mảng JSON hợp lệ
      let topics = [];
      
      try {
        // Tìm và trích xuất phần JSON trong kết quả (nếu có)
        const jsonMatch = responseText.match(/\[\s*\{.*\}\s*\]/s);
        if (jsonMatch) {
          console.log('Tìm thấy chuỗi JSON trong kết quả');
          responseText = jsonMatch[0];
        }
        
        topics = JSON.parse(responseText);
        console.log('✅ Parse JSON thành công');
      } catch (jsonError) {
        console.log('❌ Không thể parse JSON, chuyển sang xử lý văn bản');
        // Nếu không phải JSON, cố gắng phân tích từ văn bản
        const lines = responseText.split('\n').filter(line => line.trim() !== '');
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
          return { title: item, source: 'Gemini' };
        }
        return { title: item.title || `Ý tưởng về ${cleanKeyword}`, source: 'Gemini' };
      }).slice(0, 10); // Giới hạn 10 chủ đề
      
      console.log(`✓ Đã xử lý thành công ${formattedTopics.length} chủ đề từ Gemini`);
      return formattedTopics;
      
    } catch (apiError) {
      console.error("❌ Lỗi khi gọi Gemini:", apiError.message);
      
      // Tạo chủ đề mẫu khi API lỗi
      console.log('⚠️ API lỗi, tạo chủ đề mẫu');
      const fallbackTopics = [
        { title: `${cleanKeyword}: Những điều bạn chưa biết`, source: 'Gemini' },
        { title: `10 bí mật về ${cleanKeyword} ít người biết đến`, source: 'Gemini' },
        { title: `${cleanKeyword} trending 2024 - Xu hướng mới nhất`, source: 'Gemini' },
        { title: `Làm thế nào để ${cleanKeyword} hiệu quả nhất`, source: 'Gemini' },
        { title: `${cleanKeyword} cho người mới bắt đầu`, source: 'Gemini' },
        { title: `${cleanKeyword} - Phiên bản nâng cấp`, source: 'Gemini' },
        { title: `Sự thật về ${cleanKeyword} gây sốc`, source: 'Gemini' },
        { title: `${cleanKeyword} trong 60 giây`, source: 'Gemini' },
        { title: `${cleanKeyword} - Trải nghiệm đầu tiên`, source: 'Gemini' },
        { title: `${cleanKeyword} hacks bạn nên biết`, source: 'Gemini' }
      ];
      return fallbackTopics;
    }
  } catch (generalError) {
    console.error("❌ Lỗi tổng thể:", generalError.message);
    
    // Tạo chủ đề mẫu khi có lỗi tổng thể
    const emergencyTopics = [
      { title: `${cleanKeyword}: Những điều bạn chưa biết`, source: 'Gemini' },
      { title: `10 bí mật về ${cleanKeyword} ít người biết đến`, source: 'Gemini' },
      { title: `${cleanKeyword} trending 2024 - Xu hướng mới nhất`, source: 'Gemini' },
      { title: `Làm thế nào để ${cleanKeyword} hiệu quả nhất`, source: 'Gemini' },
      { title: `${cleanKeyword} cho người mới bắt đầu`, source: 'Gemini' },
      { title: `${cleanKeyword} - Phiên bản nâng cấp`, source: 'Gemini' },
      { title: `Sự thật về ${cleanKeyword} gây sốc`, source: 'Gemini' },
      { title: `${cleanKeyword} trong 60 giây`, source: 'Gemini' },
      { title: `${cleanKeyword} - Trải nghiệm đầu tiên`, source: 'Gemini' },
      { title: `${cleanKeyword} hacks bạn nên biết`, source: 'Gemini' }
    ];
    return emergencyTopics;
  }
}; 