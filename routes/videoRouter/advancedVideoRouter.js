const express = require('express');
const router = express.Router();
const advCtrl = require('../../controllers/videoController/advancedVideoController');
const editCtrl = require('../../controllers/videoController/videoEditorController');
const { requireAuth } = require('../../middleware/auth');



/* -------------------------------------------------  advanced flow */
router.get ('/edit-parts',                 advCtrl.renderEditPartsPage);
router.post('/generate-advanced',          advCtrl.generateAdvancedVideo);
router.get ('/voices',                     advCtrl.getAvailableVoices);
router.post('/sample-audio',               advCtrl.generateSampleAudio);
router.post('/prepare-script',             advCtrl.prepareVideoScript);
router.post('/generate-image-for-part',    advCtrl.generateImageForPart);
router.post('/upload-image-for-part',
            advCtrl.upload.single('image'),
            advCtrl.uploadImageForPart);
router.post('/generate-audio-for-part',    advCtrl.generateAudioForPart);
router.post('/finalize-video',             advCtrl.finalizeAdvancedVideo);
router.post('/create-final-video',         advCtrl.createFinalVideo);
router.get ('/check-setup',                advCtrl.checkSetup);
router.get ('/debug',                      advCtrl.debugVideo);

/* -------------------------------------------------  editor flow  */
router.post('/save-video-edits',           editCtrl.saveVideoEdits);
router.post('/create-edited-video',        editCtrl.createFinalVideo);

router.post('/upload-media',
            advCtrl.upload.single('media'),
            editCtrl.uploadMedia);

/* ----  ⬇️  chỉ MỘT middleware – đã gồm Multer ------------------- */
router.post('/upload-audio-for-part',      editCtrl.uploadAudioForPart);

router.get ('/check-editor-status',        editCtrl.checkStatus);
router.post('/check-request-data',         editCtrl.checkRequestData);

/* ------------------------------------------------- */
module.exports = router;