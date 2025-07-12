const { generateImageByImagen } = require('../services/imagenService');

const generateImage = async (req, res) => {
  const { prompt, modelType = 'ultra', imageCount = 1, aspectRatio = '1:1' } = req.body;
  
  // Log tóm tắt request với độ dài prompt
  console.log(`📝 Generate image request: modelType=${modelType}, imageCount=${imageCount}, aspectRatio=${aspectRatio}, promptLength=${prompt?.length || 0}`);
  // Log phần đầu của prompt để debug
  if (prompt && prompt.length > 50) {
    console.log(`📝 Prompt preview: "${prompt.substring(0, 50)}..."`);
  } else {
    console.log(`📝 Prompt: "${prompt}"`);
  }
  
  try {
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'Vui lòng nhập prompt để tạo ảnh.' 
      });
    }
    
    // Xử lý prompt nếu quá dài
    let processedPrompt = prompt.trim();
    const maxPromptLength = 1000; // Giới hạn ký tự phù hợp với API
    
    if (processedPrompt.length > maxPromptLength) {
      console.log(`⚠️ Prompt quá dài (${processedPrompt.length} ký tự), đang cắt ngắn xuống ${maxPromptLength} ký tự`);
      // Cắt xuống độ dài tối đa và đảm bảo không cắt giữa từ
      processedPrompt = processedPrompt.substring(0, maxPromptLength).split(/\s+/).slice(0, -1).join(' ');
      console.log(`✂️ Prompt sau khi cắt ngắn: ${processedPrompt.substring(0, 50)}...`);
    }
    
    // Giới hạn số lượng ảnh từ 1-4
    const count = Math.min(Math.max(parseInt(imageCount) || 1, 1), 4);
    
    // Xác định model type
    let actualModelType = 'standard';
    if (['ultra', 'standard', 'fast'].includes(modelType)) {
      actualModelType = modelType;
    }
    
    // Xác thực tỷ lệ khung hình
    let validAspectRatio = '1:1'; // Giá trị mặc định
    if (['1:1', '3:4', '4:3', '16:9', '9:16'].includes(aspectRatio)) {
      validAspectRatio = aspectRatio;
    }
    
    try {
      // Gọi service để tạo ảnh
      console.log(`🖼️ Đang gọi Imagen API (${actualModelType}) để tạo ${count} ảnh với tỷ lệ ${validAspectRatio}...`);
      
      const images = await generateImageByImagen(processedPrompt, {
        modelType: actualModelType,
        imageCount: count,
        aspectRatio: validAspectRatio,
        retryDelay: 5000, // 5 giây
        maxRetries: 5     // Thử tối đa 5 lần
      });
      
      console.log(`✅ Đã tạo thành công ${images.length} ảnh`);
      
      // Trả về kết quả
      return res.json({
        success: true,
        images: images,
        model: actualModelType,
        aspectRatio: validAspectRatio
      });
    } catch (error) {
      console.error('❌ Lỗi khi tạo ảnh:', error);
      return res.status(500).json({ 
        success: false, 
        error: `Không thể tạo ảnh: ${error.message}` 
      });
    }
  } catch (error) {
    console.error('❌ Lỗi xử lý request:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Đã xảy ra lỗi khi xử lý yêu cầu.' 
    });
  }
};

module.exports = {
  generateImage
}; 