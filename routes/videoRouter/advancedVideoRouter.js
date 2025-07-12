const express = require('express');
const router = express.Router();
const advCtrl = require('../../controllers/videoController/advancedVideoController');
const editCtrl = require('../../controllers/videoController/videoEditorController');
const { requireAuth } = require('../../middleware/auth');

/* ------------------------------------------------- Advanced flow (yêu cầu xác thực) */
router.post('/generate-advanced', requireAuth, advCtrl.generateAdvancedVideo);
router.post('/prepare-script', requireAuth, advCtrl.prepareVideoScript);
router.post('/generate-image-for-part', requireAuth, advCtrl.generateImageForPart);
router.post('/upload-image-for-part', requireAuth, advCtrl.upload.single('image'), advCtrl.uploadImageForPart);
router.post('/generate-audio-for-part', requireAuth, advCtrl.generateAudioForPart);
router.post('/finalize-video', requireAuth, advCtrl.finalizeAdvancedVideo);
router.post('/create-final-video', requireAuth, advCtrl.createFinalVideo);
router.post('/upload-audio-for-part', requireAuth, advCtrl.audioUpload.single('audio'), editCtrl.uploadAudioForPart);

/* ------------------------------------------------- Editor flow (yêu cầu xác thực) */
router.post('/save-video-edits', requireAuth, editCtrl.saveVideoEdits);
router.post('/create-edited-video', requireAuth, editCtrl.createFinalVideo);
router.post('/upload-media', requireAuth, advCtrl.upload.single('media'), editCtrl.uploadMedia); // Thêm requireAuth

/* ------------------------------------------------- Public routes (không yêu cầu xác thực) */
router.get('/edit-parts', requireAuth, advCtrl.renderEditPartsPage); // Di chuyển sang yêu cầu xác thực nếu cần
router.get('/voices', advCtrl.getAvailableVoices);
router.post('/sample-audio', advCtrl.generateSampleAudio);
router.get('/check-setup', advCtrl.checkSetup);
router.get('/debug', advCtrl.debugVideo);
router.get('/check-editor-status', editCtrl.checkStatus);
router.post('/check-request-data', requireAuth, editCtrl.checkRequestData); // Thêm requireAuth nếu cần kiểm tra user-specific data

module.exports = router;