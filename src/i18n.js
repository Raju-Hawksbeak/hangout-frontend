export const LANGUAGES = [
  // Global & Indian Primary
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'bn', label: 'বাংলা (Bengali)', short: 'বাং' },
  { code: 'hi', label: 'हिन्दी (Hindi)', short: 'हिं' },
  { code: 'bho', label: 'भोजपुरी (Bhojpuri)', short: 'भोज' },
  { code: 'mr', label: 'मराठी (Marathi)', short: 'मरा' },
  { code: 'ta', label: 'தமிழ் (Tamil)', short: 'தமி' },
  { code: 'te', label: 'తెలుగు (Telugu)', short: 'తెలు' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)', short: 'ಕನ್ನ' },
  { code: 'ml', label: 'മലയാളം (Malayalam)', short: 'മല' },
  { code: 'gu', label: 'ગુજરાતી (Gujarati)', short: 'ગુજ' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)', short: 'ਪੰਜਾ' },
  { code: 'or', label: 'ଓଡ଼ିଆ (Odia)', short: 'ଓଡ଼ି' },
  { code: 'as', label: 'অসমীয়া (Assamese)', short: 'অস' },
  { code: 'ur', label: 'اردو (Urdu)', short: 'اردو' },
  // Major International Languages
  { code: 'es', label: 'Español (Spanish)', short: 'ES' },
  { code: 'fr', label: 'Français (French)', short: 'FR' },
  { code: 'pt', label: 'Português (Portuguese)', short: 'PT' },
  { code: 'de', label: 'Deutsch (German)', short: 'DE' },
  { code: 'nl', label: 'Nederlands (Dutch)', short: 'NL' },
  { code: 'pl', label: 'Polski (Polish)', short: 'PL' },
  { code: 'ar', label: 'العربية (Arabic)', short: 'AR' },
  { code: 'id', label: 'Bahasa Indonesia', short: 'ID' }
];

const EN_BASE = {
  badge: 'ZERO-ALGORITHM • VOICE & STAGE CANVAS',
  taglineLogin: 'Your digital corner spot to hang out, jam, and drop unfiltered audio & stage clips.',
  taglineSignup: 'Claim your invite to drop into the Thek — your corner spot for unfiltered audio, comedy & live jams.',
  taglineForgot: 'Reset your password using your 4-6 digit Security PIN or any Invite Code.',
  loginTab: 'Login',
  signupTab: 'Invite Sign Up',
  usernamePlaceholder: 'Stage / Handle Name (e.g. partha_live)',
  emailPlaceholder: 'Email address',
  emailOrUserPlaceholder: 'Email or Username',
  passwordPlaceholder: 'Password',
  newPasswordPlaceholder: 'New Strong Password',
  invitePlaceholder: 'Invite Code (e.g. HANG-XXXXXX)',
  pinPlaceholder: 'Set 4-6 Digit Recovery PIN',
  recoveryKeyPlaceholder: 'Recovery PIN OR Invite Code (HANG-XXXXXX)',
  enterBtn: 'Enter Thek',
  joinBtn: 'Join Thek & Get 3 Invites',
  resetBtn: 'Reset Password',
  forgotLink: 'Forgot password? Reset with PIN or Invite Code',
  backLoginLink: '← Back to Login',
  footerHint: 'thek (n.) — your favorite corner spot to chill, jam & share raw vibes.',
  liveSuffix: 'live',
  installBtn: '📲 Install',
  tipOn: '💸 Tip On',
  tipSetup: '💸 Tip Setup',
  tidyBtn: 'Tidy',
  invitesBtn: 'Invites',
  exitBtn: 'Exit',
  noteBtn: '+ Note',
  stageBtn: '🎬 Stage',
  photoBtn: '📸 Photo',
  voiceDropBtn: '🎙 Voice Drop',
  layerSoundBtn: '↳ Layer Sound',
  releaseDropBtn: '● Release to Drop',
  uploadingBtn: 'Uploading...',
  quietSuffix: 'is Quiet...',
  rooms: {
    'default-hangout': { label: 'Thek Main', hint: 'Drop a Voice Wave, Stage Clip, Polaroid Photo, or Sticky Note!' },
    'standup-stage': { label: 'Standup Stage', hint: 'Drop your 1-min standup bits, crowd-work clips, or punchline notes!' },
    'baul-jam': { label: 'Baul & Folk Jam', hint: 'Drop an acoustic riff or vocal alaap, then hit + Layer Sound to jam together!' },
    'chill-lounge': { label: 'Chill Lounge', hint: 'Late-night adda, poetry drops, and raw backstage Polaroids.' }
  }
};

const RAW_TRANSLATIONS = {
  en: EN_BASE,
  bn: {
    badge: 'জিরো-অ্যালগরিদম • ভয়েস ও স্টেজ ক্যানভাস',
    taglineLogin: 'আনফিল্টার্ড গান, কবিতা, কমেডি আর জম্পেশ আড্ডার আপনার ডিজিটাল ঠেক।',
    taglineSignup: 'ইনভাইট কোড দিয়ে ঠেকে ঢুকে পড়ুন এবং বন্ধুদের জন্য ৩টি ইনভাইট কোড পান।',
    taglineForgot: 'আপনার ৪-৬ সংখ্যার সিকিউরিটি পিন বা ইনভাইট কোড দিয়ে পাসওয়ার্ড রিসেট করুন।',
    loginTab: 'লগইন',
    signupTab: 'ইনভাইট সাইন আপ',
    usernamePlaceholder: 'স্টেজ নাম (যেমন: partha_live)',
    emailPlaceholder: 'ইমেইল অ্যাড্রেস',
    emailOrUserPlaceholder: 'ইমেইল বা ইউজারনেম',
    passwordPlaceholder: 'পাসওয়ার্ড',
    newPasswordPlaceholder: 'নতুন শক্তিশালী পাসওয়ার্ড',
    invitePlaceholder: 'ইনভাইট কোড (HANG-XXXXXX)',
    pinPlaceholder: '৪-৬ সংখ্যার রিকভারি পিন',
    recoveryKeyPlaceholder: 'রিকভারি পিন বা ইনভাইট কোড',
    enterBtn: 'ঠেকে প্রবেশ করুন',
    joinBtn: 'যোগ দিন ও ৩টি ইনভাইট পান',
    resetBtn: 'পাসওয়ার্ড রিসেট করুন',
    forgotLink: 'পাসওয়ার্ড ভুলে গেছেন? পিন বা ইনভাইট কোড দিয়ে রিসেট করুন',
    backLoginLink: '← লগইনে ফিরে যান',
    footerHint: 'ঠেক — গান, আড্ডা আর নিজের ভাবনা ভাগ করে নেওয়ার প্রিয় জায়গা।',
    liveSuffix: 'লাইভ',
    installBtn: '📲 ইনস্টল',
    tipOn: '💸 টিপ চালু',
    tipSetup: '💸 টিপ সেটআপ',
    tidyBtn: 'গুছিয়ে রাখুন',
    invitesBtn: 'ইনভাইট',
    exitBtn: 'বেরোন',
    noteBtn: '+ নোট',
    stageBtn: '🎬 স্টেজ',
    photoBtn: '📸 ছবি',
    voiceDropBtn: '🎙 ভয়েস ড্রপ',
    layerSoundBtn: '↳ গলা মেলান',
    releaseDropBtn: '● ছেড়ে দিন',
    uploadingBtn: 'আপলোড হচ্ছে...',
    quietSuffix: 'এখনো নিরব...',
    rooms: {
      'default-hangout': { label: 'মূল ঠেক', hint: 'একটি ভয়েস ড্রপ, স্টেজ ক্লিপ, ছবি বা নোট পোস্ট করে আড্ডা শুরু করুন!' },
      'standup-stage': { label: 'স্ট্যান্ডআপ মঞ্চ', hint: 'আপনার ১ মিনিটের কমেডি বিট বা ওপেন-মাইক ক্লিপ শেয়ার করুন!' },
      'baul-jam': { label: 'বাউল ও লোকগান জ্যাম', hint: 'একটি সুর ছাড়ুন, আর বাকিরা + Layer Sound চেপে গলা মেলান!' },
      'chill-lounge': { label: 'রাতের আড্ডা', hint: 'গভীর রাতের কবিতা, গল্প আর ব্যাকস্টেজ পোলারয়েড।' }
    }
  },
  hi: {
    badge: 'जीरो-एल्गोरिदम • वॉयस और स्टेज कैनवास',
    taglineLogin: 'अनफ़िल्टर्ड संगीत, शायरी, कॉमेडी और लाइव जैम का आपका डिजिटल अड्डा।',
    taglineSignup: 'इनवाइट कोड डालें और दोस्तों के लिए 3 नए इनवाइट कोड पाएं।',
    taglineForgot: '4-6 अंकों के सिक्योरिटी PIN या इनवाइट कोड से पासवर्ड रीसेट करें।',
    loginTab: 'लॉगिन',
    signupTab: 'इनवाइट साइन अप',
    usernamePlaceholder: 'स्टेज नाम (जैसे: partha_live)',
    emailPlaceholder: 'ईमेल पता',
    emailOrUserPlaceholder: 'ईमेल या यूज़रनेम',
    passwordPlaceholder: 'पासवर्ड',
    newPasswordPlaceholder: 'नया मजबूत पासवर्ड',
    invitePlaceholder: 'इनवाइट कोड (HANG-XXXXXX)',
    pinPlaceholder: '4-6 अंकों का रिकवरी PIN',
    recoveryKeyPlaceholder: 'रिकवरी PIN या इनवाइट कोड',
    enterBtn: 'Thek में प्रवेश करें',
    joinBtn: 'जुड़ें और 3 इनवाइट पाएं',
    resetBtn: 'पासवर्ड रीसेट करें',
    forgotLink: 'पासवर्ड भूल गए? PIN या इनवाइट कोड से रीसेट करें',
    backLoginLink: '← लॉगिन पर वापस जाएं',
    footerHint: 'thek — दोस्तों के साथ जैम करने और असली वाइब्स शेयर करने की जगह।',
    liveSuffix: 'लाइव',
    installBtn: '📲 इंस्टॉल',
    tipOn: '💸 टिप चालू',
    tipSetup: '💸 टिप सेटअप',
    tidyBtn: 'व्यवस्थित करें',
    invitesBtn: 'इनवाइट',
    exitBtn: 'बाहर निकलें',
    noteBtn: '+ नोट',
    stageBtn: '🎬 स्टेज',
    photoBtn: '📸 फ़ोटो',
    voiceDropBtn: '🎙 वॉयस ड्रॉप',
    layerSoundBtn: '↳ आवाज़ जोड़ें',
    releaseDropBtn: '● छोड़ें',
    uploadingBtn: 'अपलोड हो रहा है...',
    quietSuffix: 'अभी शांत है...',
    rooms: {
      'default-hangout': { label: 'मुख्य अड्डा', hint: 'वॉयस वेव, स्टेज क्लिप, फ़ोटो या स्टिकी नोट ड्रॉप करें!' },
      'standup-stage': { label: 'स्टैंडअप स्टेज', hint: 'अपने 1-मिनट के कॉमेडी बिट्स या पंचलाइन शेयर करें!' },
      'baul-jam': { label: 'बाउल और लोक जैम', hint: 'एक धुन ड्रॉप करें, और + Layer Sound दबाकर साथ में जैम करें!' },
      'chill-lounge': { label: 'चिल लाउंज', hint: 'देर रात की महफ़िल, शायरी और बैकस्टेज पल।' }
    }
  },
  bho: {
    badge: 'जीरो-एल्गोरिदम • आवाज आ मंच के कैनवास',
    taglineLogin: 'बिन फिल्टर के लोकगीत, शायरी, हंसी-ठिठोली आ लाइव महफ़िल के राउर डिजिटल अड्डा।',
    taglineSignup: 'इनवाइट कोड डाल के अड्डा में जुड़ जाईं आ 3 गो नया कोड पाईं।',
    taglineForgot: 'आपन 4-6 अंक के PIN भा इनवाइट कोड से पासवर्ड बदलीं।',
    loginTab: 'लॉगिन',
    signupTab: 'इनवाइट साइन अप',
    usernamePlaceholder: 'मंच के नाम (जइसे: partha_live)',
    emailPlaceholder: 'ईमेल पता',
    emailOrUserPlaceholder: 'ईमेल भा यूज़रनेम',
    passwordPlaceholder: 'पासवर्ड',
    newPasswordPlaceholder: 'नया मजबूत पासवर्ड',
    invitePlaceholder: 'इनवाइट कोड (HANG-XXXXXX)',
    pinPlaceholder: '4-6 अंक के रिकवरी PIN',
    recoveryKeyPlaceholder: 'रिकवरी PIN भा इनवाइट कोड',
    enterBtn: 'Thek में आईं',
    joinBtn: 'जुड़ीं आ 3 इनवाइट पाईं',
    resetBtn: 'पासवर्ड बदलीं',
    forgotLink: 'पासवर्ड भुला गइनी? PIN भा कोड से बदलीं',
    backLoginLink: '← लॉगिन पर वापस जाईं',
    footerHint: 'thek — संगी-साथी संगे गावे-बजावे आ दिल के बात कहे के आपन ठिया।',
    liveSuffix: 'लाइव',
    installBtn: '📲 इंस्टॉल',
    tipOn: '💸 टिप चालू',
    tipSetup: '💸 टिप सेटअप',
    tidyBtn: 'सजा के रखीं',
    invitesBtn: 'इनवाइट',
    exitBtn: 'बाहर निकलीं',
    noteBtn: '+ नोट',
    stageBtn: '🎬 मंच',
    photoBtn: '📸 फोटो',
    voiceDropBtn: '🎙 आवाज छोड़ीं',
    layerSoundBtn: '↳ सुर मिलाईं',
    releaseDropBtn: '● छोड़ दीं',
    uploadingBtn: 'अपलोड होता...',
    quietSuffix: 'अभी शांत बा...',
    rooms: {
      'default-hangout': { label: 'मुख्य ठिया', hint: 'आवाज, वीडियो, फोटो भा नोट डाल के महफ़िल शुरू करीं!' },
      'standup-stage': { label: 'हंसी-मजाक मंच', hint: 'आपन 1 मिनट के कॉमेडी भा चुटकुला इहां साझा करीं!' },
      'baul-jam': { label: 'लोकगीत आ बाउल महफ़िल', hint: 'एगो धुन छोड़ीं, आ बाकी लोग + Layer Sound दबा के सुर मिलाईं!' },
      'chill-lounge': { label: 'रात के बतकही', hint: 'रात के कविता, किस्सा आ बैकस्टेज फोटो।' }
    }
  },
  mr: {
    badge: 'झिरो-अल्गोरिदम • व्हॉइस आणि स्टेज कॅनव्हास',
    taglineLogin: 'संगीत, कविता, कॉमेडी आणि लाइव्ह जॅमसाठी तुमचा डिजिटल कट्टा.',
    loginTab: 'लॉगिन', signupTab: 'इनव्हाइट साइन अप', enterBtn: 'Thek मध्ये प्रवेश करा',
    joinBtn: 'सामील व्हा आणि ३ इनव्हाइट मिळवा', resetBtn: 'पासवर्ड रीसेट करा',
    liveSuffix: 'लाइव्ह', tidyBtn: 'व्यवस्थित करा', invitesBtn: 'इनव्हाइट', exitBtn: 'बाहेर पडा',
    noteBtn: '+ नोट', stageBtn: '🎬 स्टेज', photoBtn: '📸 फोटो', voiceDropBtn: '🎙 व्हॉइस ड्रॉप',
    layerSoundBtn: '↳ आवाज जोडा', releaseDropBtn: '● सोडा',
    rooms: {
      'default-hangout': { label: 'मुख्य कट्टा', hint: 'व्हॉइस ड्रॉप, स्टेज क्लिप किंवा नोट शेअर करा!' },
      'standup-stage': { label: 'स्टँडअप स्टेज', hint: 'तुमचे कॉमेडी बिट्स शेअर करा!' },
      'baul-jam': { label: 'लोकसंगीत जॅम', hint: 'सूर सोडा आणि एकत्र जॅम करा!' },
      'chill-lounge': { label: 'चिल लाउंज', hint: 'रात्रीच्या गप्पा आणि कविता.' }
    }
  },
  ta: {
    badge: 'ஜீரோ-அல்காரிதம் • குரல் மற்றும் மேடை தளம்',
    taglineLogin: 'இசை, நகைச்சுவை மற்றும் நேரலை அரட்டைக்கான உங்கள் டிஜிட்டல் தளம்.',
    loginTab: 'உள்நுழை', signupTab: 'அழைப்பு பதிவு', enterBtn: 'Thek-க்குள் நுழையவும்',
    joinBtn: 'இணைந்து 3 அழைப்புகளைப் பெறுங்கள்', resetBtn: 'கடவுச்சொல்லை மீட்டமை',
    liveSuffix: 'நேரலை', tidyBtn: 'ஒழுங்குபடுத்து', invitesBtn: 'அழைப்புகள்', exitBtn: 'வெளியேறு',
    noteBtn: '+ குறிப்பு', stageBtn: '🎬 மேடை', photoBtn: '📸 புகைப்படம்', voiceDropBtn: '🎙 குரல் பதிவு',
    layerSoundBtn: '↳ குரல் சேர்', releaseDropBtn: '● வெளியிடு',
    rooms: {
      'default-hangout': { label: 'முதன்மை அரங்கம்', hint: 'குரல் பதிவு அல்லது வீடியோவைப் பகிரவும்!' },
      'standup-stage': { label: 'நகைச்சுவை மேடை', hint: 'உங்கள் நகைச்சுவை துணுக்குகளைப் பகிரவும்!' },
      'baul-jam': { label: 'நாட்டுப்புற இசை', hint: 'இசையைப் பகிர்ந்து ஒன்றாகப் பாடுங்கள்!' },
      'chill-lounge': { label: 'இரவு அரட்டை', hint: 'கவிதை மற்றும் கதைகள்.' }
    }
  },
  te: {
    badge: 'జీరో-అల్గోరిథమ్ • వాయిస్ & స్టేజ్ కాన్వాస్',
    taglineLogin: 'సంగీతం, కామెడీ మరియు లైవ్ జామ్ కోసం మీ డిజిటల్ అడ్డా.',
    loginTab: 'లాగిన్', signupTab: 'ఇన్వైట్ సైన్ అప్', enterBtn: 'Thek లోకి ప్రవేశించండి',
    joinBtn: 'చేరండి & 3 ఇన్వైట్లు పొందండి', resetBtn: 'పాస్‌వర్డ్ మార్చండి',
    liveSuffix: 'లైవ్', tidyBtn: 'సర్దుబాటు', invitesBtn: 'ఇన్వైట్లు', exitBtn: 'నిష్క్రమించు',
    noteBtn: '+ నోట్', stageBtn: '🎬 స్టేజ్', photoBtn: '📸 ఫోటో', voiceDropBtn: '🎙 వాయిస్ డ్రాప్',
    layerSoundBtn: '↳ గొంతు కలపండి', releaseDropBtn: '● వదలండి',
    rooms: {
      'default-hangout': { label: 'ప్రధాన అడ్డా', hint: 'వాయిస్ డ్రాప్ లేదా వీడియో షేర్ చేయండి!' },
      'standup-stage': { label: 'స్టాండప్ స్టేజ్', hint: 'మీ కామెడీ బిట్స్ షేర్ చేయండి!' },
      'baul-jam': { label: 'జానపద జామ్', hint: 'పాట పాడి కలిసి జామ్ చేయండి!' },
      'chill-lounge': { label: 'చిల్ లాంజ్', hint: 'కవితలు మరియు కబుర్లు.' }
    }
  },
  kn: {
    badge: 'ಜೀರೋ-ಅಲ್ಗಾರಿದಮ್ • ಧ್ವನಿ ಮತ್ತು ವೇದಿಕೆ',
    taglineLogin: 'ಸಂಗೀತ, ಹಾಸ್ಯ ಮತ್ತು ಲೈವ್ ಜಾಮ್‌ಗಾಗಿ ನಿಮ್ಮ ಡಿಜಿಟಲ್ ಅಡ್ಡೆ.',
    loginTab: 'ಲಾಗಿನ್', signupTab: 'ಆಹ್ವಾನ ಸೈನ್ ಅಪ್', enterBtn: 'Thek ಪ್ರವೇಶಿಸಿ',
    joinBtn: 'ಸೇರಿ ಮತ್ತು 3 ಆಹ್ವಾನಗಳನ್ನು ಪಡೆಯಿರಿ', resetBtn: 'ಪಾಸ್‌ವರ್ಡ್ ಮರುಹೊಂದಿಸಿ',
    liveSuffix: 'ಲೈವ್', tidyBtn: 'ಜೋಡಿಸಿ', invitesBtn: 'ಆಹ್ವಾನಗಳು', exitBtn: 'ನಿರ್ಗಮಿಸಿ',
    noteBtn: '+ ಟಿಪ್ಪಣಿ', stageBtn: '🎬 ವೇದಿಕೆ', photoBtn: '📸 ಫೋಟೋ', voiceDropBtn: '🎙 ಧ್ವನಿ',
    layerSoundBtn: '↳ ಧ್ವನಿ ಸೇರಿಸಿ', releaseDropBtn: '● ಬಿಡಿ',
    rooms: {
      'default-hangout': { label: 'ಮುಖ್ಯ ಅಡ್ಡೆ', hint: 'ಧ್ವನಿ ಅಥವಾ ವೀಡಿಯೊ ಹಂಚಿಕೊಳ್ಳಿ!' },
      'standup-stage': { label: 'ಹಾಸ್ಯ ವೇದಿಕೆ', hint: 'ನಿಮ್ಮ ಹಾಸ್ಯ ತುಣುಕುಗಳನ್ನು ಹಂಚಿಕೊಳ್ಳಿ!' },
      'baul-jam': { label: 'ಜಾನಪದ ಜಾಮ್', hint: 'ಹಾಡು ಹಾಡಿ ಒಟ್ಟಿಗೆ ಜಾಮ್ ಮಾಡಿ!' },
      'chill-lounge': { label: 'ಚಿಲ್ ಲೌಂಜ್', hint: 'ಕವಿತೆ ಮತ್ತು ಮಾತುಕತೆ.' }
    }
  },
  ml: {
    badge: 'സീറോ-അൽഗോരിതം • വോയ്‌സ് & സ്റ്റേജ് ക്യാൻവാസ്',
    taglineLogin: 'സംഗീതത്തിനും തമാശകൾക്കും തത്സമയ സംഗമത്തിനുമുള്ള നിങ്ങളുടെ ഡിജിറ്റൽ ഇടം.',
    loginTab: 'ലോഗിൻ', signupTab: 'സൈൻ അപ്പ്', enterBtn: 'Thek-ലേക്ക് പ്രവേശിക്കുക',
    joinBtn: 'ചേരുക, 3 ഇൻവൈറ്റുകൾ നേടുക', resetBtn: 'പാസ്‌വേഡ് മാറ്റുക',
    liveSuffix: 'ലൈവ്', tidyBtn: 'ക്രമീകരിക്കുക', invitesBtn: 'ഇൻവൈറ്റുകൾ', exitBtn: 'പുറത്തുകടക്കുക',
    noteBtn: '+ കുറിപ്പ്', stageBtn: '🎬 സ്റ്റേജ്', photoBtn: '📸 ഫോട്ടോ', voiceDropBtn: '🎙 വോയ്‌സ്',
    layerSoundBtn: '↳ ശബ്ദം ചേർക്കുക', releaseDropBtn: '● വിടുക',
    rooms: {
      'default-hangout': { label: 'പ്രധാന വേദി', hint: 'വോയ്‌സ് ക്ലിപ്പ് അല്ലെങ്കിൽ വീഡിയോ പങ്കിടുക!' },
      'standup-stage': { label: 'കോമഡി സ്റ്റേജ്', hint: 'നിങ്ങളുടെ കോമഡി ക്ലിപ്പുകൾ പങ്കിടുക!' },
      'baul-jam': { label: 'നാടൻ പാട്ട് ജാം', hint: 'ഒരു ഈണം പങ്കിടുക, ഒരുമിച്ച് പാടുക!' },
      'chill-lounge': { label: 'ചിൽ ലോഞ്ച്', hint: 'രാത്രികാല വർത്തമാനങ്ങളും കവിതകളും.' }
    }
  },
  gu: {
    badge: 'ઝીરો-અલ્ગોરિધમ • વૉઇસ અને સ્ટેજ કેનવાસ',
    taglineLogin: 'સંગીત, કવિતા, કોમેડી અને લાઇવ જામ માટે તમારો ડિજિટલ ઓટલો.',
    loginTab: 'લૉગિન', signupTab: 'સાઇન અપ', enterBtn: 'Thek માં પ્રવેશ કરો',
    joinBtn: 'જોડાઓ અને 3 ઇન્વાઇટ મેળવો', resetBtn: 'પાસવર્ડ રીસેટ કરો',
    liveSuffix: 'લાઇવ', tidyBtn: 'ગોઠવો', invitesBtn: 'ઇન્વાઇટ', exitBtn: 'બહાર નીકળો',
    noteBtn: '+ નોંધ', stageBtn: '🎬 સ્ટેજ', photoBtn: '📸 ફોટો', voiceDropBtn: '🎙 વૉઇસ ડ્રોપ',
    layerSoundBtn: '↳ અવાજ ઉમેરો', releaseDropBtn: '● છોડો',
    rooms: {
      'default-hangout': { label: 'મુખ્ય ઓટલો', hint: 'વૉઇસ ડ્રોપ અથવા સ્ટેજ ક્લિપ શેર કરો!' },
      'standup-stage': { label: 'સ્ટેન્ડઅપ સ્ટેજ', hint: 'તમારી કોમેડી ક્લિપ્સ શેર કરો!' },
      'baul-jam': { label: 'લોકસંગીત જામ', hint: 'સૂર છેડો અને સાથે મળીને જામ કરો!' },
      'chill-lounge': { label: 'ચિલ લાઉન્જ', hint: 'રાતની મહેફિલ અને કવિતાઓ.' }
    }
  },
  pa: {
    badge: 'ਜ਼ੀਰੋ-ਐਲਗੋਰਿਦਮ • ਵੌਇਸ ਅਤੇ ਸਟੇਜ ਕੈਨਵਸ',
    taglineLogin: 'ਸੰਗੀਤ, ਕਵਿਤਾ, ਕਾਮੇਡੀ ਅਤੇ ਲਾਈਵ ਜੈਮ ਲਈ ਤੁਹਾਡਾ ਡਿਜੀਟਲ ਅੱਡਾ।',
    loginTab: 'ਲੌਗਇਨ', signupTab: 'ਸਾਈਨ ਅੱਪ', enterBtn: 'Thek ਵਿੱਚ ਆਓ',
    joinBtn: 'ਜੁੜੋ ਅਤੇ 3 ਇਨਵਾਈਟ ਪਾਓ', resetBtn: 'ਪਾਸਵਰਡ ਬਦਲੋ',
    liveSuffix: 'ਲਾਈਵ', tidyBtn: 'ਸਜਾਓ', invitesBtn: 'ਇਨਵਾਈਟ', exitBtn: 'ਬਾਹਰ',
    noteBtn: '+ ਨੋਟ', stageBtn: '🎬 ਸਟੇਜ', photoBtn: '📸 ਫੋਟੋ', voiceDropBtn: '🎙 ਵੌਇਸ ਡ੍ਰੌਪ',
    layerSoundBtn: '↳ ਸੁਰ ਮਿਲਾਓ', releaseDropBtn: '● ਛੱਡੋ',
    rooms: {
      'default-hangout': { label: 'ਮੁੱਖ ਅੱਡਾ', hint: 'ਵੌਇਸ ਡ੍ਰੌਪ ਜਾਂ ਵੀਡੀਓ ਸਾਂਝਾ ਕਰੋ!' },
      'standup-stage': { label: 'ਕਾਮੇਡੀ ਸਟੇਜ', hint: 'ਆਪਣੇ ਕਾਮੇਡੀ ਬਿੱਟ ਸਾਂਝੇ ਕਰੋ!' },
      'baul-jam': { label: 'ਲੋਕ ਸੰਗੀਤ ਜੈਮ', hint: 'ਇੱਕ ਧੁਨ ਛੱਡੋ ਅਤੇ ਇਕੱਠੇ ਗਾਓ!' },
      'chill-lounge': { label: 'ਚਿੱਲ ਲੌਂਜ', hint: 'ਰਾਤ ਦੀਆਂ ਗੱਲਾਂ ਅਤੇ ਸ਼ਾਇਰੀ।' }
    }
  },
  or: {
    badge: 'ଜିରୋ-ଆଲଗୋରିଦମ୍ • ଭଏସ୍ ଓ ଷ୍ଟେଜ୍ କାନଭାସ୍',
    taglineLogin: 'ସଙ୍ଗୀତ, କବିତା, କମେଡି ଏବଂ ଲାଇଭ୍ ଆଡ୍ଡା ପାଇଁ ଆପଣଙ୍କ ଡିଜିଟାଲ୍ ଠିକଣା।',
    loginTab: 'ଲଗଇନ୍', signupTab: 'ସାଇନ୍ ଅପ୍', enterBtn: 'Thek କୁ ପ୍ରବେଶ କରନ୍ତୁ',
    joinBtn: 'ଯୋଗ ଦିଅନ୍ତୁ ଓ ୩ଟି ଇନଭାଇଟ୍ ପାଆନ୍ତୁ', resetBtn: 'ପାସୱାର୍ଡ ବଦଳାନ୍ତୁ',
    liveSuffix: 'ଲାଇଭ୍', tidyBtn: 'ସଜାଡନ୍ତୁ', invitesBtn: 'ଇନଭାଇଟ୍', exitBtn: 'ବାହାରକୁ ଯାଆନ୍ତୁ',
    noteBtn: '+ ନୋଟ୍', stageBtn: '🎬 ଷ୍ଟେଜ୍', photoBtn: '📸 ଫଟୋ', voiceDropBtn: '🎙 ଭଏସ୍ ଡ୍ରପ୍',
    layerSoundBtn: '↳ ସ୍ୱର ମିଶାନ୍ତୁ', releaseDropBtn: '● ଛାଡନ୍ତୁ',
    rooms: {
      'default-hangout': { label: 'ମୁଖ୍ୟ ଆଡ୍ଡା', hint: 'ଭଏସ୍ ଡ୍ରପ୍ କିମ୍ବା ଭିଡିଓ ସେୟାର୍ କରନ୍ତୁ!' },
      'standup-stage': { label: 'କମେଡି ମଞ୍ଚ', hint: 'ଆପଣଙ୍କ କମେଡି କ୍ଲିପ୍ ସେୟାର୍ କରନ୍ତୁ!' },
      'baul-jam': { label: 'ଲୋକଗୀତ ଜ୍ୟାମ୍', hint: 'ଗୋଟିଏ ସୁର ଛାଡନ୍ତୁ ଏବଂ ଏକାଠି ଗାଆନ୍ତୁ!' },
      'chill-lounge': { label: 'ଚିଲ୍ ଲାଉଞ୍ଜ', hint: 'ରାତିର ଗପ ଓ କବିତା।' }
    }
  },
  as: {
    badge: 'জিৰো-এলগৰিদম • ভইচ আৰু ষ্টেজ কেনভাছ',
    taglineLogin: 'সংগীত, কবিতা, কমেডী আৰু লাইভ আড্ডাৰ বাবে আপোনাৰ ডিজিটেল ঠিকনা।',
    loginTab: 'লগইন', signupTab: 'চাইন আপ', enterBtn: 'Thek-ত প্ৰৱেশ কৰক',
    joinBtn: 'যোগ দিয়ক আৰু ৩টা ইনভাইট পাওক', resetBtn: 'পাছৱৰ্ড সলনি কৰক',
    liveSuffix: 'লাইভ', tidyBtn: 'সজাই থওক', invitesBtn: 'ইনভাইট', exitBtn: 'ওলাই আহক',
    noteBtn: '+ নোট', stageBtn: '🎬 ষ্টেজ', photoBtn: '📸 ফটো', voiceDropBtn: '🎙 ভইচ ড্ৰপ',
    layerSoundBtn: '↳ সুৰ মিলাওক', releaseDropBtn: '● এৰি দিয়ক',
    rooms: {
      'default-hangout': { label: 'মূল আড্ডা', hint: 'ভইচ ড্ৰপ বা ভিডিঅ’ শ্বেয়াৰ কৰক!' },
      'standup-stage': { label: 'কমেডী মঞ্চ', hint: 'আপোনাৰ কমেডী ক্লিপ শ্বেয়াৰ কৰক!' },
      'baul-jam': { label: 'লোকগীত জাম', hint: 'এটা সুৰ এৰি দিয়ক আৰু একেলগে গাওক!' },
      'chill-lounge': { label: 'চিল লাউঞ্জ', hint: 'নিশাৰ আড্ডা আৰু কবিতা।' }
    }
  },
  ur: {
    badge: 'زیرو الگورتھم • وائس اور اسٹیج کینوس',
    taglineLogin: 'موسیقی، شاعری، کامیڈی اور لائیو محفل کے لیے آپ کا ڈیجیٹل ٹھکانہ۔',
    loginTab: 'لاگ ان', signupTab: 'سائن اپ', enterBtn: 'Thek میں داخل ہوں',
    joinBtn: 'شامل ہوں اور 3 دعوت نامے پائیں', resetBtn: 'پاس ورڈ تبدیل کریں',
    liveSuffix: 'لائیو', tidyBtn: 'ترتیب دیں', invitesBtn: 'دعوت نامے', exitBtn: 'باہر نکلیں',
    noteBtn: '+ نوٹ', stageBtn: '🎬 اسٹیج', photoBtn: '📸 تصویر', voiceDropBtn: '🎙 وائس ڈراپ',
    layerSoundBtn: '↳ آواز ملائیں', releaseDropBtn: '● چھوڑ دیں',
    rooms: {
      'default-hangout': { label: 'مرکزی بیٹھک', hint: 'وائس ڈراپ یا ویڈیو شیئر کریں!' },
      'standup-stage': { label: 'کامیڈی اسٹیج', hint: 'اپنے مزاحیہ کلپس شیئر کریں!' },
      'baul-jam': { label: 'لوک موسیقی محفل', hint: 'ایک دھن چھوڑیں اور مل کر گائیں!' },
      'chill-lounge': { label: 'چل لاؤنج', hint: 'رات کی محفل اور شاعری۔' }
    }
  },
  es: {
    badge: 'CERO ALGORITMOS • LIENZO DE VOZ Y ESCENARIO',
    taglineLogin: 'Tu rincón digital para pasar el rato, improvisar y compartir clips sin filtros.',
    loginTab: 'Entrar', signupTab: 'Registro con Invitación', enterBtn: 'Entrar a Thek',
    joinBtn: 'Únete y obtén 3 invitaciones', resetBtn: 'Restablecer contraseña',
    liveSuffix: 'en vivo', tidyBtn: 'Ordenar', invitesBtn: 'Invitar', exitBtn: 'Salir',
    noteBtn: '+ Nota', stageBtn: '🎬 Escenario', photoBtn: '📸 Foto', voiceDropBtn: '🎙 Nota de Voz',
    layerSoundBtn: '↳ Añadir Capa', releaseDropBtn: '● Soltar',
    rooms: {
      'default-hangout': { label: 'Sala Principal', hint: '¡Suelta una nota de voz, video o foto Polaroid!' },
      'standup-stage': { label: 'Escenario Comedia', hint: '¡Comparte tus monólogos y chistes!' },
      'baul-jam': { label: 'Jam Acústica y Folk', hint: 'Suelta un ritmo y únete con + Layer Sound.' },
      'chill-lounge': { label: 'Sala Chill', hint: 'Charlas nocturnas, poesía y momentos reales.' }
    }
  },
  fr: {
    badge: 'ZÉRO ALGORITHME • TOILE VOCALE & SCÈNE',
    taglineLogin: 'Votre coin numérique pour traîner, jammer et partager des sons bruts sans filtre.',
    loginTab: 'Connexion', signupTab: 'Inscription sur Invitation', enterBtn: 'Entrer sur Thek',
    joinBtn: 'Rejoindre & obtenir 3 invitations', resetBtn: 'Réinitialiser le mot de passe',
    liveSuffix: 'en direct', tidyBtn: 'Ranger', invitesBtn: 'Invitations', exitBtn: 'Quitter',
    noteBtn: '+ Note', stageBtn: '🎬 Scène', photoBtn: '📸 Photo', voiceDropBtn: '🎙 Drop Vocal',
    layerSoundBtn: '↳ Superposer', releaseDropBtn: '● Relâcher',
    rooms: {
      'default-hangout': { label: 'Salon Principal', hint: 'Déposez un son, une vidéo ou un Polaroid !' },
      'standup-stage': { label: 'Scène Stand-up', hint: 'Partagez vos sketchs et punchlines !' },
      'baul-jam': { label: 'Jam Folk & Acoustique', hint: 'Lancez un riff et jammez ensemble !' },
      'chill-lounge': { label: 'Salon Chill', hint: 'Discussions nocturnes, poésie et coulisses.' }
    }
  },
  pt: {
    badge: 'ZERO ALGORITMO • TELA DE VOZ E PALCO',
    taglineLogin: 'Seu canto digital para curtir, fazer jam e soltar áudios e clipes sem filtro.',
    loginTab: 'Entrar', signupTab: 'Cadastro com Convite', enterBtn: 'Entrar no Thek',
    joinBtn: 'Entrar e ganhar 3 convites', resetBtn: 'Redefinir senha',
    liveSuffix: 'ao vivo', tidyBtn: 'Organizar', invitesBtn: 'Convites', exitBtn: 'Sair',
    noteBtn: '+ Nota', stageBtn: '🎬 Palco', photoBtn: '📸 Foto', voiceDropBtn: '🎙 Soltar Voz',
    layerSoundBtn: '↳ Adicionar Som', releaseDropBtn: '● Soltar',
    rooms: {
      'default-hangout': { label: 'Thek Principal', hint: 'Solte um áudio, clipe de palco ou Polaroid!' },
      'standup-stage': { label: 'Palco Stand-up', hint: 'Compartilhe suas piadas e cortes!' },
      'baul-jam': { label: 'Jam Folk & Acústica', hint: 'Solte um som e faça jam junto!' },
      'chill-lounge': { label: 'Lounge Chill', hint: 'Papo da madrugada, poesia e bastidores.' }
    }
  },
  de: {
    badge: 'NULL ALGORITHMUS • STIMM- & BÜHNEN-CANVAS',
    taglineLogin: 'Dein digitaler Treffpunkt zum Abhängen, Jammen und Teilen ungefilterter Clips.',
    loginTab: 'Anmelden', signupTab: 'Mit Einladung registrieren', enterBtn: 'Thek betreten',
    joinBtn: 'Beitreten & 3 Einladungen erhalten', resetBtn: 'Passwort zurücksetzen',
    liveSuffix: 'live', tidyBtn: 'Ordnen', invitesBtn: 'Einladungen', exitBtn: 'Beenden',
    noteBtn: '+ Notiz', stageBtn: '🎬 Bühne', photoBtn: '📸 Foto', voiceDropBtn: '🎙 Sprach-Drop',
    layerSoundBtn: '↳ Spur hinzufügen', releaseDropBtn: '● Loslassen',
    rooms: {
      'default-hangout': { label: 'Hauptraum', hint: 'Teile einen Sprach-Drop, Clip oder ein Foto!' },
      'standup-stage': { label: 'Standup-Bühne', hint: 'Teile deine Comedy-Bits und Punchlines!' },
      'baul-jam': { label: 'Folk & Akustik Jam', hint: 'Droppe einen Riff und jammt zusammen!' },
      'chill-lounge': { label: 'Chill Lounge', hint: 'Spätabend-Talks, Poesie und Backstage-Momente.' }
    }
  },
  nl: {
    badge: 'NUL ALGORITME • STEM- & PODIUMCANVAS',
    taglineLogin: 'Jouw digitale hangplek om te jammen en ongefilterde audio & clips te droppen.',
    loginTab: 'Inloggen', signupTab: 'Aanmelden met Uitnodiging', enterBtn: 'Ga naar Thek',
    joinBtn: 'Doe mee & krijg 3 uitnodigingen', resetBtn: 'Wachtwoord resetten',
    liveSuffix: 'live', tidyBtn: 'Ordenen', invitesBtn: 'Uitnodigingen', exitBtn: 'Uitloggen',
    noteBtn: '+ Notitie', stageBtn: '🎬 Podium', photoBtn: '📸 Foto', voiceDropBtn: '🎙 Spraakdrop',
    layerSoundBtn: '↳ Laag toevoegen', releaseDropBtn: '● Loslaten',
    rooms: {
      'default-hangout': { label: 'Thek Hoofdzaal', hint: 'Drop een spraakbericht, clip of Polaroid!' },
      'standup-stage': { label: 'Stand-up Podium', hint: 'Deel je beste grappen en open-mic clips!' },
      'baul-jam': { label: 'Folk & Akoestische Jam', hint: 'Drop een melodie en jam samen!' },
      'chill-lounge': { label: 'Chill Lounge', hint: 'Laatavond-gesprekken, poëzie en backstage.' }
    }
  },
  pl: {
    badge: 'ZERO ALGORYTMÓW • PRZESTRZEŃ GŁOSU I SCENY',
    taglineLogin: 'Twoje cyfrowe miejsce spotkań, jam session i wrzucania klipów bez filtrów.',
    loginTab: 'Zaloguj się', signupTab: 'Rejestracja z zaproszeniem', enterBtn: 'Wejdź do Thek',
    joinBtn: 'Dołącz i odbierz 3 zaproszenia', resetBtn: 'Zresetuj hasło',
    liveSuffix: 'na żywo', tidyBtn: 'Uporządkuj', invitesBtn: 'Zaproszenia', exitBtn: 'Wyjdź',
    noteBtn: '+ Notatka', stageBtn: '🎬 Scena', photoBtn: '📸 Zdjęcie', voiceDropBtn: '🎙 Nagraj Głos',
    layerSoundBtn: '↳ Dograj ścieżkę', releaseDropBtn: '● Puść',
    rooms: {
      'default-hangout': { label: 'Główny Pokój', hint: 'Wrzuć nagranie głosowe, klip lub zdjęcie!' },
      'standup-stage': { label: 'Scena Stand-up', hint: 'Podziel się swoimi żartami i występami!' },
      'baul-jam': { label: 'Jam Folk i Akustyk', hint: 'Wrzuć melodię i dograjcie się razem!' },
      'chill-lounge': { label: 'Strefa Chill', hint: 'Nocne rozmowy, poezja i kulisy.' }
    }
  },
  ar: {
    badge: 'بدون خوارزميات • مساحة الصوت والمسرح',
    taglineLogin: 'مكانك الرقمي المفضل للدردشة والعزف ومشاركة المقاطع الصوتية بدون فلاتر.',
    loginTab: 'تسجيل الدخول', signupTab: 'التسجيل بدعوة', enterBtn: 'ادخل إلى Thek',
    joinBtn: 'انضم واحصل على 3 دعوات', resetBtn: 'إعادة تعيين كلمة المرور',
    liveSuffix: 'مباشر', tidyBtn: 'ترتيب', invitesBtn: 'الدعوات', exitBtn: 'خروج',
    noteBtn: '+ ملاحظة', stageBtn: '🎬 مسرح', photoBtn: '📸 صورة', voiceDropBtn: '🎙 تسجيل صوتي',
    layerSoundBtn: '↳ أضف صوتاً', releaseDropBtn: '● اترك للإرسال',
    rooms: {
      'default-hangout': { label: 'المجلس الرئيسي', hint: 'شارك مقطعاً صوتياً أو فيديو أو صورة!' },
      'standup-stage': { label: 'مسرح الكوميديا', hint: 'شارك فقراتك الكوميدية هنا!' },
      'baul-jam': { label: 'جلسة طرب وفلكلور', hint: 'ابدأ اللحن ودع الآخرين يشاركونك!' },
      'chill-lounge': { label: 'استراحة المساء', hint: 'سوالف الليل، شعر ولحظات عفوية.' }
    }
  },
  id: {
    badge: 'TANPA ALGORITMA • KANVAS SUARA & PANGGUNG',
    taglineLogin: 'Tempat nongkrong digital untuk nge-jam dan berbagi klip suara tanpa filter.',
    loginTab: 'Masuk', signupTab: 'Daftar Undangan', enterBtn: 'Masuk ke Thek',
    joinBtn: 'Gabung & dapat 3 undangan', resetBtn: 'Reset Kata Sandi',
    liveSuffix: 'aktif', tidyBtn: 'Rapikan', invitesBtn: 'Undangan', exitBtn: 'Keluar',
    noteBtn: '+ Catatan', stageBtn: '🎬 Panggung', photoBtn: '📸 Foto', voiceDropBtn: '🎙 Rekam Suara',
    layerSoundBtn: '↳ Tambah Suara', releaseDropBtn: '● Lepas untuk Kirim',
    rooms: {
      'default-hangout': { label: 'Nongkrong Utama', hint: 'Kirim rekaman suara, klip panggung, atau foto!' },
      'standup-stage': { label: 'Panggung Standup', hint: 'Bagikan materi komedi dan punchline kamu!' },
      'baul-jam': { label: 'Jam Akustik & Folk', hint: 'Drop melodi dan nge-jam bareng!' },
      'chill-lounge': { label: 'Ruang Santai', hint: 'Obrolan tengah malam, puisi, dan foto candid.' }
    }
  }
};

// Merge every language safely with EN_BASE fallback so no key is ever missing
export const TRANSLATIONS = Object.fromEntries(
  Object.entries(RAW_TRANSLATIONS).map(([code, dict]) => [
    code,
    {
      ...EN_BASE,
      ...dict,
      rooms: {
        ...EN_BASE.rooms,
        ...(dict.rooms || {})
      }
    }
  ])
);

export function getInitialLang() {
  const saved = localStorage.getItem('thek_lang');
  if (saved && TRANSLATIONS[saved]) return saved;
  const nav = (navigator.language || '').toLowerCase().split('-')[0];
  if (TRANSLATIONS[nav]) return nav;
  return 'en';
}
