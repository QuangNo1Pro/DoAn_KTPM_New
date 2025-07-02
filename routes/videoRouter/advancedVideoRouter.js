const express = require('express')
const router = express.Router()
const {generateAdvancedVideo, getAvailableVoices, prepareVideoScript, generateImageForPart, generateAudioForPart, finalizeAdvancedVideo, uploadImageForPart, generateSampleAudio, upload, renderEditPartsPage, createFinalVideo, checkSetup, debugVideo} = require('../../controllers/videoController/advancedVideoController')
// Trang hiển thị
const { isAuthenticated } = require('../../middleware/authMiddleware')

router.get('/edit-parts',isAuthenticated, renderEditPartsPage)

// API tạo video nâng cao với giọng đọc
router.post('/generate-advanced',isAuthenticated, generateAdvancedVideo)

// API lấy danh sách giọng đọc có sẵn
router.get('/voices',isAuthenticated, getAvailableVoices)

// API tạo mẫu âm thanh để nghe thử giọng đọc
router.post('/sample-audio',isAuthenticated, generateSampleAudio)

// API chuẩn bị kịch bản và phân tích thành các phần
router.post('/prepare-script',isAuthenticated, prepareVideoScript)

// API tạo/tạo lại hình ảnh cho một phần
router.post('/generate-image-for-part',isAuthenticated, generateImageForPart)

// API tải lên hình ảnh từ máy tính cho một phần
router.post('/upload-image-for-part',isAuthenticated, upload.single('image'), uploadImageForPart)

// API tạo/tạo lại giọng đọc cho một phần
router.post('/generate-audio-for-part',isAuthenticated, generateAudioForPart)

// API hoàn thiện video từ các phần đã chuẩn bị
router.post('/finalize-video',isAuthenticated, finalizeAdvancedVideo)

// API tạo video cuối cùng từ dữ liệu đã chỉnh sửa
router.post('/create-final-video',isAuthenticated, createFinalVideo)

// API kiểm tra cài đặt
router.get('/check-setup',isAuthenticated, checkSetup)

// API debug tạo video
router.get('/debug',isAuthenticated, debugVideo)

// Import video editor controller
const {saveVideoEdits, createFinalVideo: createEditedVideo, uploadMedia, checkStatus, checkRequestData} = require('../../controllers/videoController/videoEditorController')

// API lưu dữ liệu chỉnh sửa video
router.post('/save-video-edits',isAuthenticated, saveVideoEdits)

// API tạo video cuối cùng từ dữ liệu đã chỉnh sửa
router.post('/create-edited-video',isAuthenticated, createEditedVideo)

// API tải lên media (hình ảnh, âm thanh) cho video editor
router.post('/upload-media',isAuthenticated, upload.single('media'), uploadMedia)

// API kiểm tra trạng thái controller
router.get('/check-editor-status',isAuthenticated, checkStatus)

// API kiểm tra dữ liệu request
router.post('/check-request-data',isAuthenticated, checkRequestData)

module.exports = router
