const express = require('express');
const router = express.Router();
const advCtrl = require('../../controllers/videoController/advancedVideoController');
const editCtrl = require('../../controllers/videoController/videoEditorController');
const { requireAuth } = require('../../middleware/auth');

/* ------------------------------------------------- Advanced flow (không yêu cầu xác thực) */
router.post('/generate-advanced', advCtrl.generateAdvancedVideo);
router.post('/prepare-script', advCtrl.prepareVideoScript);
router.post('/generate-image-for-part', advCtrl.generateImageForPart);
router.post('/upload-image-for-part', advCtrl.upload.single('image'), advCtrl.uploadImageForPart);
router.post('/generate-audio-for-part', advCtrl.generateAudioForPart);
router.post('/finalize-video', advCtrl.finalizeAdvancedVideo);
router.post('/create-final-video', advCtrl.createFinalVideo);
router.post('/upload-audio-for-part', advCtrl.audioUpload.single('audio'), editCtrl.uploadAudioForPart);

/* ------------------------------------------------- Editor flow (không yêu cầu xác thực) */
router.post('/save-video-edits', editCtrl.saveVideoEdits);
router.post('/create-edited-video', editCtrl.createFinalVideo);
router.post('/upload-media', advCtrl.upload.single('media'), editCtrl.uploadMedia);

/* ------------------------------------------------- Public routes (không yêu cầu xác thực) */
router.get('/edit-parts', advCtrl.renderEditPartsPage);
router.get('/voices', advCtrl.getAvailableVoices);
router.post('/sample-audio', advCtrl.generateSampleAudio);
router.get('/check-setup', advCtrl.checkSetup);
router.get('/debug', advCtrl.debugVideo);
router.get('/check-editor-status', editCtrl.checkStatus);
router.post('/check-request-data', editCtrl.checkRequestData);

module.exports = router;