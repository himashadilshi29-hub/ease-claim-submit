import { createContext, useContext, useState, ReactNode } from "react";

export type Language = "en" | "si" | "ta";

export const translations = {
  en: {
    // Navbar & Common
    logoMain: "Janashakthi",
    logoSub: "Smart Claims System",
    logout: "Logout",

    // Hero Section
    heroTitle: "Janashakthi Smart Claims",
    heroSub: "Submit and track your claims with AI-powered document verification. Fast, secure, and simple.",
    btnSubmitClaim: "Submit New Claim",
    btnDigitalPortal: "Digital Portal",

    // Portal Selection
    choosePortal: "Choose Your Portal",
    branchPortalTitle: "Branch Portal",
    branchPortalSubtitle: "For branch staff and walk-in customers",
    branchPortalDesc: "Submit claims at your nearest branch with assisted document verification",
    btnAccessPortal: "Access Portal",
    digitalPortalTitle: "Digital Portal",
    digitalPortalSubtitle: "For mobile and online submissions",
    digitalPortalDesc: "Submit and track claims anytime, anywhere through our digital platform",
    btnLoginNow: "Login Now",
    adminTitle: "Admin View",
    adminSubtitle: "For administrators and staff",
    adminDesc: "Review and manage all claims with comprehensive analytics and reporting",
    btnAdminLogin: "Admin Login",

    // Stats
    statAI: "AI-Powered Verification",
    stat247: "Available Anytime",
    statLang: "Languages Supported",
    statFast: "Quick Processing",

    // Footer
    footerDesc: "Making insurance claims simple, fast, and transparent with AI-powered verification.",
    quickLinks: "Quick Links",
    linkSubmitOPD: "Submit OPD Claim",
    linkTrackStatus: "Track Claim Status",
    linkDigitalPortal: "Digital Portal",
    contactUs: "Contact Us",
    copyright: "© 2025 Janashakthi Insurance PLC. All rights reserved.",

    // Branch Portal
    customerPortalBranch: "Customer Portal - Branch",
    submitWithAI: "Submit your claim with AI-powered verification",
    
    // Steps
    stepLanguage: "Language",
    stepVerify: "Verify",
    stepDetails: "Details",
    stepUpload: "Upload",
    stepComplete: "Complete",

    // Step 0: Language
    selectLanguage: "Select Language",
    selectLanguageDesc: "Choose your preferred language",
    langEnglish: "English",
    langSinhala: "සිංහල (Sinhala)",
    langTamil: "தமிழ் (Tamil)",

    // Step 1: Verify
    verifyPolicy: "Verify Policy",
    verifyPolicyDesc: "Enter your NIC or Policy Number to verify",
    labelNICPolicy: "NIC or Policy Number",
    placeholderNICPolicy: "Enter NIC (e.g., 123456789V) or Policy Number",
    btnBack: "Back",
    btnContinue: "Continue",

    // Step 2: Details
    claimDetails: "Claim Details",
    claimDetailsDesc: "Provide your claim information",
    labelClaimType: "Claim Type",
    placeholderClaimType: "Select type of claim",
    claimTypeOPD: "OPD (Out-Patient)",
    claimTypeSpectacles: "Spectacles",
    claimTypeDental: "Dental",
    labelRelationship: "Relationship",
    placeholderRelationship: "Select relationship",
    relationSelf: "Self",
    relationSpouse: "Spouse",
    relationChild: "Child",
    relationParent: "Parent",
    labelBankAccount: "Bank Account Number",
    placeholderBankAccount: "1234567890 (BOC)",

    // Step 3: Upload
    uploadDocuments: "Upload Documents",
    uploadDocumentsDesc: "Upload your claim documents for verification",
    dragDropFiles: "Drag & drop files or Browse",
    supportedFormats: "Supports PDF, JPG, PNG",
    btnSubmitClaim2: "Submit Claim",

    // Step 4: Success
    claimSubmitted: "Claim Submitted Successfully!",
    claimReference: "Claim Reference Number:",
    claimReviewMsg: "We will review your claim and notify you via SMS within 24 hours.",
    btnSubmitAnother: "Submit Another Claim",
  },
  si: {
    // Navbar & Common
    logoMain: "ජනශක්ති",
    logoSub: "ස්මාර්ට් හිමිකම් පද්ධතිය",
    logout: "පිටවීම",

    // Hero Section
    heroTitle: "ජනශක්ති ස්මාර්ට් හිමිකම්",
    heroSub: "AI බලයෙන් ලේඛන සත්‍යාපනය සමඟ ඔබගේ හිමිකම් ඉදිරිපත් කර නිරීක්ෂණය කරන්න. වේගවත්, ආරක්ෂිත සහ සරල.",
    btnSubmitClaim: "නව හිමිකම් ඉදිරිපත් කරන්න",
    btnDigitalPortal: "ඩිජිටල් පෝර්ටලය",

    // Portal Selection
    choosePortal: "ඔබේ පෝර්ටලය තෝරන්න",
    branchPortalTitle: "ශාඛා පෝර්ටලය",
    branchPortalSubtitle: "ශාඛා කාර්ය මණ්ඩලය සහ පාරිභෝගිකයින් සඳහා",
    branchPortalDesc: "ආධාරකරු ලේඛන සත්‍යාපනය සමඟ ඔබගේ ආසන්නතම ශාඛාවේ හිමිකම් ඉදිරිපත් කරන්න",
    btnAccessPortal: "පෝර්ටලයට පිවිසෙන්න",
    digitalPortalTitle: "ඩිජිටල් පෝර්ටලය",
    digitalPortalSubtitle: "ජංගම සහ මාර්ගගත ඉදිරිපත් කිරීම් සඳහා",
    digitalPortalDesc: "ඕනෑම වේලාවක, ඕනෑම තැනක ඩිජිටල් වේදිකාව හරහා හිමිකම් ඉදිරිපත් කර නිරීක්ෂණය කරන්න",
    btnLoginNow: "දැන් පිවිසෙන්න",
    adminTitle: "පරිපාලක දසුන",
    adminSubtitle: "පරිපාලකයින් සහ කාර්ය මණ්ඩලය සඳහා",
    adminDesc: "සවිස්තරාත්මක විශ්ලේෂණ සහ වාර්තා සමඟ සියලුම හිමිකම් සමාලෝචනය කර කළමනාකරණය කරන්න",
    btnAdminLogin: "පරිපාලක පිවිසුම",

    // Stats
    statAI: "AI බලයෙන් සත්‍යාපනය",
    stat247: "ඕනෑම වේලාවක ලබා ගත හැක",
    statLang: "භාෂා සහාය",
    statFast: "වේගවත් සැකසීම",

    // Footer
    footerDesc: "AI බලයෙන් සත්‍යාපනය සමඟ රක්ෂණ හිමිකම් සරල, වේගවත් සහ විනිවිද පෙනෙන බවට පත් කිරීම.",
    quickLinks: "ඉක්මන් සබැඳි",
    linkSubmitOPD: "OPD හිමිකම් ඉදිරිපත් කරන්න",
    linkTrackStatus: "හිමිකම් තත්ත්වය නිරීක්ෂණය කරන්න",
    linkDigitalPortal: "ඩිජිටල් පෝර්ටලය",
    contactUs: "අප අමතන්න",
    copyright: "© 2025 ජනශක්ති ඉන්ෂුවරන්ස් පීඑල්සී. සියලු හිමිකම් ඇවිරිණි.",

    // Branch Portal
    customerPortalBranch: "පාරිභෝගික පෝර්ටලය - ශාඛාව",
    submitWithAI: "AI බලයෙන් සත්‍යාපනය සමඟ ඔබේ හිමිකම් ඉදිරිපත් කරන්න",
    
    // Steps
    stepLanguage: "භාෂාව",
    stepVerify: "තහවුරු",
    stepDetails: "විස්තර",
    stepUpload: "උඩුගත",
    stepComplete: "සම්පූර්ණ",

    // Step 0: Language
    selectLanguage: "භාෂාව තෝරන්න",
    selectLanguageDesc: "ඔබ කැමති භාෂාව තෝරන්න",
    langEnglish: "English",
    langSinhala: "සිංහල (Sinhala)",
    langTamil: "தமிழ் (Tamil)",

    // Step 1: Verify
    verifyPolicy: "පොලිසිය තහවුරු කරන්න",
    verifyPolicyDesc: "තහවුරු කිරීමට ඔබගේ ජාතික හැඳුනුම්පත් අංකය හෝ පොලිසි අංකය ඇතුළත් කරන්න",
    labelNICPolicy: "ජා.හැ.අ. හෝ පොලිසි අංකය",
    placeholderNICPolicy: "ජා.හැ.අ. (උදා: 123456789V) හෝ පොලිසි අංකය ඇතුළත් කරන්න",
    btnBack: "ආපසු",
    btnContinue: "ඉදිරියට",

    // Step 2: Details
    claimDetails: "හිමිකම් විස්තර",
    claimDetailsDesc: "ඔබගේ හිමිකම් තොරතුරු සපයන්න",
    labelClaimType: "හිමිකම් වර්ගය",
    placeholderClaimType: "හිමිකම් වර්ගය තෝරන්න",
    claimTypeOPD: "OPD (බාහිර රෝගී)",
    claimTypeSpectacles: "කණ්ණාඩි",
    claimTypeDental: "දන්ත",
    labelRelationship: "සම්බන්ධතාවය",
    placeholderRelationship: "සම්බන්ධතාවය තෝරන්න",
    relationSelf: "තමා",
    relationSpouse: "කලත්‍රයා",
    relationChild: "දරුවා",
    relationParent: "මවු/පිය",
    labelBankAccount: "බැංකු ගිණුම් අංකය",
    placeholderBankAccount: "1234567890 (BOC)",

    // Step 3: Upload
    uploadDocuments: "ලේඛන උඩුගත කරන්න",
    uploadDocumentsDesc: "සත්‍යාපනය සඳහා ඔබගේ හිමිකම් ලේඛන උඩුගත කරන්න",
    dragDropFiles: "ගොනු ඇද දමන්න හෝ Browse කරන්න",
    supportedFormats: "PDF, JPG, PNG සහාය දක්වයි",
    btnSubmitClaim2: "හිමිකම් ඉදිරිපත් කරන්න",

    // Step 4: Success
    claimSubmitted: "හිමිකම් සාර්ථකව ඉදිරිපත් කරන ලදී!",
    claimReference: "හිමිකම් යොමු අංකය:",
    claimReviewMsg: "අපි ඔබගේ හිමිකම් සමාලෝචනය කර පැය 24 ක් ඇතුළත SMS මගින් දැනුම් දෙන්නෙමු.",
    btnSubmitAnother: "තවත් හිමිකමක් ඉදිරිපත් කරන්න",
  },
  ta: {
    // Navbar & Common
    logoMain: "ஜனசக்தி",
    logoSub: "ஸ்மார்ட் உரிமைகோரல் அமைப்பு",
    logout: "வெளியேறு",

    // Hero Section
    heroTitle: "ஜனசக்தி ஸ்மார்ட் உரிமைகோரல்கள்",
    heroSub: "AI ஆல் இயங்கும் ஆவண சரிபார்ப்புடன் உங்கள் உரிமைகோரல்களைச் சமர்ப்பித்து கண்காணிக்கவும். வேகமான, பாதுகாப்பான, எளிமையான.",
    btnSubmitClaim: "புதிய உரிமைகோரலைச் சமர்ப்பிக்கவும்",
    btnDigitalPortal: "டிஜிட்டல் போர்டல்",

    // Portal Selection
    choosePortal: "உங்கள் போர்டலைத் தேர்ந்தெடுக்கவும்",
    branchPortalTitle: "கிளை போர்டல்",
    branchPortalSubtitle: "கிளை ஊழியர்கள் மற்றும் வாடிக்கையாளர்களுக்கு",
    branchPortalDesc: "உதவி ஆவண சரிபார்ப்புடன் உங்கள் அருகிலுள்ள கிளையில் உரிமைகோரல்களைச் சமர்ப்பிக்கவும்",
    btnAccessPortal: "போர்டலை அணுகவும்",
    digitalPortalTitle: "டிஜிட்டல் போர்டல்",
    digitalPortalSubtitle: "மொபைல் மற்றும் ஆன்லைன் சமர்ப்பிப்புகளுக்கு",
    digitalPortalDesc: "எங்கள் டிஜிட்டல் தளம் வழியாக எப்போது வேண்டுமானாலும், எங்கிருந்தும் உரிமைகோரல்களைச் சமர்ப்பித்து கண்காணிக்கவும்",
    btnLoginNow: "இப்போது உள்நுழைக",
    adminTitle: "நிர்வாகி காட்சி",
    adminSubtitle: "நிர்வாகிகள் மற்றும் ஊழியர்களுக்கு",
    adminDesc: "விரிவான பகுப்பாய்வு மற்றும் அறிக்கையிடலுடன் அனைத்து உரிமைகோரல்களையும் மதிப்பாய்வு செய்து நிர்வகிக்கவும்",
    btnAdminLogin: "நிர்வாகி உள்நுழைவு",

    // Stats
    statAI: "AI ஆல் இயங்கும் சரிபார்ப்பு",
    stat247: "எப்போதும் கிடைக்கும்",
    statLang: "மொழிகள் ஆதரவு",
    statFast: "விரைவான செயலாக்கம்",

    // Footer
    footerDesc: "AI ஆல் இயங்கும் சரிபார்ப்புடன் காப்பீட்டு உரிமைகோரல்களை எளிமையாகவும் வேகமாகவும் வெளிப்படையாகவும் செய்தல்.",
    quickLinks: "விரைவு இணைப்புகள்",
    linkSubmitOPD: "OPD கோரிக்கையைச் சமர்ப்பிக்கவும்",
    linkTrackStatus: "கோரிக்கை நிலையைக் கண்காணிக்கவும்",
    linkDigitalPortal: "டிஜிட்டல் போர்டல்",
    contactUs: "எங்களைத் தொடர்பு கொள்ளவும்",
    copyright: "© 2025 ஜனசக்தி இன்சூரன்ஸ் பிஎல்சி. அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.",

    // Branch Portal
    customerPortalBranch: "வாடிக்கையாளர் போர்டல் - கிளை",
    submitWithAI: "AI ஆல் இயங்கும் சரிபார்ப்புடன் உங்கள் கோரிக்கையைச் சமர்ப்பிக்கவும்",
    
    // Steps
    stepLanguage: "மொழி",
    stepVerify: "சரிபார்",
    stepDetails: "விவரங்கள்",
    stepUpload: "பதிவேற்றம்",
    stepComplete: "முடிந்தது",

    // Step 0: Language
    selectLanguage: "மொழியைத் தேர்ந்தெடுக்கவும்",
    selectLanguageDesc: "உங்கள் விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும்",
    langEnglish: "English",
    langSinhala: "සිංහල (Sinhala)",
    langTamil: "தமிழ் (Tamil)",

    // Step 1: Verify
    verifyPolicy: "கொள்கையை சரிபார்க்கவும்",
    verifyPolicyDesc: "சரிபார்க்க உங்கள் தேசிய அடையாள அட்டை எண் அல்லது கொள்கை எண்ணை உள்ளிடவும்",
    labelNICPolicy: "தேசிய அடையாள அட்டை / கொள்கை எண்",
    placeholderNICPolicy: "தே.அ.அ. (எ.கா: 123456789V) அல்லது கொள்கை எண்ணை உள்ளிடவும்",
    btnBack: "பின்செல்",
    btnContinue: "தொடரவும்",

    // Step 2: Details
    claimDetails: "கோரிக்கை விவரங்கள்",
    claimDetailsDesc: "உங்கள் கோரிக்கை தகவலை வழங்கவும்",
    labelClaimType: "கோரிக்கை வகை",
    placeholderClaimType: "கோரிக்கை வகையைத் தேர்ந்தெடுக்கவும்",
    claimTypeOPD: "OPD (வெளிநோயாளி)",
    claimTypeSpectacles: "கண்ணாடி",
    claimTypeDental: "பல்",
    labelRelationship: "உறவு",
    placeholderRelationship: "உறவைத் தேர்ந்தெடுக்கவும்",
    relationSelf: "சுயம்",
    relationSpouse: "கணவன்/மனைவி",
    relationChild: "குழந்தை",
    relationParent: "பெற்றோர்",
    labelBankAccount: "வங்கி கணக்கு எண்",
    placeholderBankAccount: "1234567890 (BOC)",

    // Step 3: Upload
    uploadDocuments: "ஆவணங்களைப் பதிவேற்றவும்",
    uploadDocumentsDesc: "சரிபார்ப்புக்கு உங்கள் கோரிக்கை ஆவணங்களைப் பதிவேற்றவும்",
    dragDropFiles: "கோப்புகளை இழுத்து விடவும் அல்லது Browse செய்யவும்",
    supportedFormats: "PDF, JPG, PNG ஆதரிக்கப்படுகிறது",
    btnSubmitClaim2: "கோரிக்கையைச் சமர்ப்பிக்கவும்",

    // Step 4: Success
    claimSubmitted: "கோரிக்கை வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது!",
    claimReference: "கோரிக்கை குறிப்பு எண்:",
    claimReviewMsg: "உங்கள் கோரிக்கையை மதிப்பாய்வு செய்து 24 மணி நேரத்திற்குள் SMS மூலம் தெரிவிப்போம்.",
    btnSubmitAnother: "மற்றொரு கோரிக்கையைச் சமர்ப்பிக்கவும்",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.en;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("en");

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
