/* ---------------------------------------------------------------------------
 * English strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const en: TranslationDictionary = {
  'passport.title': 'Digital passport',
  'passport.subtitle':
    'Turn any profile into a signed, shareable QR certificate — generated on your device',
  'passport.empty.title': 'No passport yet',
  'passport.empty.body': 'Pick a family member to generate their vaccination passport.',
  'passport.generate': 'Generate passport',
  'passport.regenerate': 'Regenerate',
  'passport.profile': 'Profile',
  'passport.certificate': 'Vaccination certificate',
  'passport.id': 'Certificate ID',
  'passport.issued': 'Issued',
  'passport.doses': 'Doses recorded',
  'passport.scanToVerify': 'Scan to verify',
  'passport.verify.title': 'Verify a certificate',
  'passport.verify.placeholder': 'Paste a certificate code or scan a QR',
  'passport.verify.button': 'Verify',
  'passport.verify.valid': 'Valid certificate',
  'passport.verify.invalid': 'This code could not be verified',
  'passport.verify.tampered': 'The contents do not match the signature — treat it as invalid',
  'passport.download.passportPdf': 'Download Vaccination Passport',
  'passport.download.cardPng': 'Download Card Image (PNG)',
  'passport.download.pdfDone': 'Vaccination Passport PDF downloaded',
  'passport.download.cardDone': 'Vaccination Passport card image downloaded',
  'passport.download.svg': 'Download SVG',
  'passport.download.png': 'Download PNG',
  'passport.download.json': 'Download data (JSON)',
  'passport.print': 'Print certificate',
  'passport.privacy':
    'Everything happens in your browser: the QR payload is signed locally and nothing is uploaded.',
  'passport.saved': 'Passport saved for {0}',
  'passport.whatIsThis': 'About this certificate',
  'passport.whatIsThis.body':
    'The QR code holds the member’s name, date of birth and recorded doses, plus a checksum. It is generated on this device and can be verified again on any device running TikaTrack — no server, no account.',
  'passport.warning':
    'This is a personal record, not an official government certificate. It cannot be used for travel or employment checks.',
  'passport.member': 'Member',
  'passport.dob': 'Date of birth',
  'passport.generated': 'Generated',
  'passport.noDoses': 'This member has no recorded doses yet.',
  'passport.verify.help':
    'Paste the text inside a TikaTrack certificate QR code to check that it has not been altered.',
  'passport.verify.error.empty': 'Paste a certificate payload first.',
  'passport.verify.error.format': 'That payload is not a TikaTrack certificate.',
  'passport.verify.doses': '{0} recorded doses',
  'passport.generateFailed': 'Could not generate the passport',
  'passport.error.tooLarge': 'Too many doses to fit in one QR code. Print the tracker instead.',
  'passport.savedWeak': 'Passport saved — signed with a basic checksum (WebCrypto unavailable)',
  'passport.weakAlgorithm':
    'Signed with a basic checksum because WebCrypto is unavailable in this browser.',
  'passport.verify.error.invalid': 'This is not a TikaTrack passport code.',
  'passport.verify.error.tampered':
    'The code was altered after it was issued — the checksum does not match.',
  'passport.verify.error.unsupported-version':
    'This code was made by a newer version of TikaTrack.',
  'passport.scanner.title': 'Scan a certificate',
  'passport.scanner.body':
    'Point the camera at a TikaTrack QR code, or upload a photo of one. Images are decoded on this device and never uploaded.',
  'passport.scanner.videoLabel': 'Camera view',
  'passport.scanner.start': 'Start camera',
  'passport.scanner.stop': 'Stop camera',
  'passport.scanner.upload': 'Upload a photo',
  'passport.scanner.error.unsupported':
    'This browser cannot access a camera — upload a photo instead',
  'passport.scanner.error.permission':
    'Camera permission was blocked — allow it in your browser settings',
  'passport.scanner.error.noCamera': 'No camera was found, or another app is using it',
  'passport.scanner.error.insecure': 'Camera access needs HTTPS — upload a photo instead',
  'passport.scanner.error.decode': 'No TikaTrack code was found in that image',
  'passport.scanner.error.unknown': 'The camera could not be started',
  'passport.share.button': 'Share certificate',
  'passport.share.pngFailed': 'Could not prepare the certificate image',
  'passport.truncated.title': 'Some doses did not fit in the QR code',
  'passport.truncated.body':
    '{0} of {1} recorded doses are not encoded in the code. The printed card and the JSON backup hold the complete history.',
  'passport.dose.number': 'Dose {0}',
  'passport.dose.unnumbered': 'dose number not recorded',
  'passport.stale.title': 'Records updated since issue',
  'passport.stale.body':
    'Dose records changed after this QR certificate was issued. Regenerate so the QR matches.',
  'passport.familyStatus': 'Family passports',
  'passport.status.issued': 'Issued',
  'passport.status.missing': 'Not issued',
  'passport.status.outdated': 'Needs update',
  'passport.card.historyTitle': 'Immunization history',
  'passport.card.colVaccine': 'Vaccine',
  'passport.card.colDose': 'Dose',
  'passport.card.colDate': 'Date given',
  'passport.card.colCentre': 'Centre / Batch',
  'passport.card.coverage': 'Schedule progress',
  'passport.mode.label': 'Signature mode',
  'passport.mode.deviceHmac': 'This device (HMAC · max doses)',
  'passport.mode.portableEcdsa': 'Cross-device (ECDSA P-256 · any phone)',
  'passport.verify.algorithmEcdsa': 'Signed with ECDSA P-256 — verifiable on any device offline',
  'passport.biometric.title': 'Biometric passport lock',
  'passport.biometric.subtitle':
    'Protect QR certificates on this phone with Face ID, Touch ID, or fingerprint.',
  'passport.biometric.status.protected': 'Protected · Unlocked',
  'passport.biometric.status.locked': 'Locked',
  'passport.biometric.status.off': 'Not enabled',
  'passport.biometric.supportedReady': 'Platform biometrics ready on this device',
  'passport.biometric.unsupportedPin':
    'Hardware biometrics unavailable here — set a 6-digit device PIN instead',
  'passport.biometric.insecureContext':
    'Biometric passkeys require HTTPS — available once deployed over HTTPS',
  'passport.biometric.deviceLabel': 'Device label',
  'passport.biometric.devicePlaceholder': 'e.g. My iPhone / Pixel Phone',
  'passport.biometric.backupPinLabel': 'Optional 6-digit recovery PIN',
  'passport.biometric.backupPinPlaceholder': '6 digits (optional fallback)',
  'passport.biometric.pinOnlyLabel': '6-digit vault PIN',
  'passport.biometric.pinHint':
    'Hashed locally with salted PBKDF2-SHA256; never stored in plain text.',
  'passport.biometric.enablePasskey': 'Enable Biometric Lock',
  'passport.biometric.enablePinOnly': 'Enable 6-Digit PIN Lock',
  'passport.biometric.lockNow': 'Lock Passport',
  'passport.biometric.testVerify': 'Verify Again',
  'passport.biometric.disable': 'Remove Lock',
  'passport.biometric.autoLockLabel': 'Auto-lock timing',
  'passport.biometric.autoLock.immediate': 'When leaving tab or app',
  'passport.biometric.autoLock.5m': 'After 5 minutes',
  'passport.biometric.autoLock.15m': 'After 15 minutes',
  'passport.biometric.autoLock.manual': 'Until locked or closed',
  'passport.biometric.gateTitle': 'Passport Vault Locked',
  'passport.biometric.gateBody':
    'Verify with biometrics on this device to reveal your family QR certificates, dose history, and export controls.',
  'passport.biometric.gateUnlock': 'Unlock with Face ID / Fingerprint',
  'passport.biometric.gateUsePin': 'Unlock with 6-digit PIN',
  'passport.biometric.gatePinPlaceholder': 'Enter 6-digit PIN',
  'passport.biometric.gatePinSubmit': 'Unlock Passport',
  'passport.biometric.gateReset': 'Reset lock & clear QR cache',
  'passport.biometric.resetTitle': 'Reset biometric passport lock?',
  'passport.biometric.resetBody':
    'Resetting without verifying removes this lock and clears issued QR certificates from this device so health records stay private. Your tracker profiles remain intact.',
  'passport.biometric.resetConfirm': 'Reset & Clear QRs',
  'passport.biometric.disableTitle': 'Remove biometric passport lock?',
  'passport.biometric.disableBody':
    'Your QR certificates will remain accessible without Face ID, fingerprint, or PIN prompts until you turn protection back on.',
  'passport.biometric.disableConfirm': 'Remove Lock',
  'passport.biometric.enrolledToast': 'Biometric passport lock enabled',
  'passport.biometric.unlockedToast': 'Passport vault unlocked',
  'passport.biometric.lockedToast': 'Passport vault locked',
  'passport.biometric.removedToast': 'Biometric passport lock removed',
  'passport.biometric.error.cancelled': 'Biometric prompt was cancelled or timed out — try again',
  'passport.biometric.error.unsupported': 'Platform biometrics are unavailable in this browser',
  'passport.biometric.error.insecure': 'HTTPS is required for WebAuthn passkeys',
  'passport.biometric.error.verificationFailed':
    'Biometric signature check failed — please try again',
  'passport.biometric.error.invalidPin': 'Enter a valid 6-digit numeric PIN',
  'passport.biometric.error.pinMismatch': 'Incorrect 6-digit PIN',
  'passport.biometric.error.cooldown': 'Too many wrong PIN attempts — wait {0}s',
  'passport.biometric.error.generic': 'Could not complete biometric verification',
  'passport.biometric.error.iframeBlocked':
    'Biometrics are blocked inside this embedded frame — open this app in a standalone tab or use a 6-digit vault PIN.',
  'passport.biometric.lockedBanner':
    'Unlock the passport vault first to generate or view certificates.',
  'passport.biometric.lastVerified': 'Last verified: {0}',
};
