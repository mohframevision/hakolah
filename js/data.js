/*
  بيانات المحتوى لكل قسم في الموقع.
  عدّل أو أضف عناصر هنا مباشرة — كل صفحة قسم تقرأ من هذا الملف تلقائياً.
  كل عنصر: id (فريد ضمن القسم), icon (إيموجي), title, desc, tags[], url, cta (نص الزر)
*/

const SITE_DATA = {
  "links-tools": {
    title: "روابط وأدوات مفيدة",
    icon: "🔗",
    items: [
      { id: "lt1", icon: "🖼️", title: "TinyPNG", desc: "ضغط الصور بدون فقدان جودة ملحوظ قبل رفعها لموقعك.", tags: ["تصميم", "صور"], url: "https://tinypng.com" },
      { id: "lt2", icon: "🎨", title: "Coolors", desc: "توليد وتصفح لوحات ألوان متناسقة لتصاميمك بسرعة.", tags: ["تصميم", "ألوان"], url: "https://coolors.co" },
      { id: "lt3", icon: "📝", title: "Notion", desc: "تدوين الملاحظات وتنظيم المهام والمشاريع في مكان واحد.", tags: ["إنتاجية"], url: "https://notion.so" },
      { id: "lt4", icon: "🔒", title: "Have I Been Pwned", desc: "تحقق إذا كان بريدك الإلكتروني ضمن أي تسريب بيانات معروف.", tags: ["أمان"], url: "https://haveibeenpwned.com" },
      { id: "lt5", icon: "📄", title: "iLovePDF", desc: "دمج وتقسيم وضغط وتحويل ملفات PDF مجاناً.", tags: ["مستندات"], url: "https://ilovepdf.com" },
      { id: "lt6", icon: "🌐", title: "DeepL Translate", desc: "ترجمة نصوص بدقة عالية بين العربية والإنجليزية ولغات أخرى.", tags: ["ترجمة"], url: "https://deepl.com" },
      { id: "lt7", icon: "💻", title: "GitHub", desc: "استضافة المشاريع البرمجية والتعاون عليها مجاناً.", tags: ["برمجة"], url: "https://github.com" },
      { id: "lt8", icon: "📊", title: "Google Sheets", desc: "جداول بيانات سحابية مجانية للتعاون الفوري.", tags: ["إنتاجية"], url: "https://sheets.google.com" }
    ]
  },

  "accounts": {
    title: "حسابات واشتراكات مفيدة",
    icon: "💳",
    items: [
      { id: "ac1", icon: "🎬", title: "نتفليكس", desc: "اشتراك مشاهدة الأفلام والمسلسلات — قارن الباقات قبل الاشتراك.", tags: ["ترفيه"], url: "#" },
      { id: "ac2", icon: "🎵", title: "سبوتيفاي", desc: "بث الموسيقى بدون إعلانات مع إمكانية التحميل للاستماع بدون إنترنت.", tags: ["موسيقى"], url: "#" },
      { id: "ac3", icon: "☁️", title: "Google One", desc: "مساحة تخزين إضافية على Google Drive وGmail وصور Google.", tags: ["تخزين"], url: "#" },
      { id: "ac4", icon: "📚", title: "Kindle Unlimited", desc: "قراءة عدد غير محدود من الكتب الإلكترونية شهرياً.", tags: ["قراءة"], url: "#" },
      { id: "ac5", icon: "🎓", title: "Coursera Plus", desc: "اشتراك سنوي يفتح آلاف الدورات مع شهادات إتمام.", tags: ["تعليم"], url: "#" },
      { id: "ac6", icon: "🖥️", title: "Microsoft 365", desc: "برامج Office كاملة مع مساحة تخزين OneDrive.", tags: ["إنتاجية"], url: "#" }
    ]
  },

  "restaurants": {
    title: "مطاعم",
    icon: "🍽️",
    items: [
      {
        id: "rs-joodys",
        icon: "🥪",
        title: "جوديز (Joody's)",
        desc: "سندويشات ووجبات سريعة — \"Eat good, feel jood\". يوفر توصيل وقائمة متنوعة.",
        tags: ["سندويشات", "وجبات سريعة", "السهلة الشمالية"],
        links: {
          maps: "https://maps.app.goo.gl/TvduhLy2wiTjxkrp9",
          instagram: "https://www.instagram.com/joodys_bh/"
        }
      },
      {
        id: "rs-jazeera-bakery",
        icon: "🥖",
        title: "مخبز الجزيرة",
        desc: "مخبز يقدم خبز ومعجنات طازجة.",
        tags: ["مخبز", "معجنات"],
        links: {
          maps: "https://maps.app.goo.gl/XU2brWkaTsKL3yTHA"
        }
      },
      {
        id: "rs-khan-baghdad",
        icon: "🍢",
        title: "خان بغداد",
        desc: "مطعم عراقي متخصص بالمشاوي، يقدم القوزي العراقي والكباب والقيمة النجفية.",
        tags: ["عراقي", "مشاوي"],
        links: {
          maps: "https://maps.app.goo.gl/DRLjU5CY3Nxcqrhn8",
          instagram: "https://www.instagram.com/khan_bghdad"
        }
      },
      {
        id: "rs-adam-subs-1",
        icon: "🍔",
        title: "آدم سابز (بلاضول القديم)",
        desc: "برجر وسندويشات (Subs) متنوعة، مع خدمة توصيل عبر عدة تطبيقات.",
        tags: ["برجر", "سندويشات"],
        links: {
          maps: "https://maps.app.goo.gl/tKwmtVSJeEhnRWdG7",
          instagram: "https://www.instagram.com/adamsubs/"
        }
      },
      {
        id: "rs-adam-subs-2",
        icon: "🍔",
        title: "آدم سابز (الدراز)",
        desc: "فرع الدراز — نفس قائمة البرجر والسندويشات مع خدمة توصيل.",
        tags: ["برجر", "سندويشات"],
        links: {
          maps: "https://maps.app.goo.gl/AemmJZfhNhMAGPrU6",
          instagram: "https://www.instagram.com/adamsubs/"
        }
      },
      {
        id: "rs-karbabad-beach",
        icon: "🌅",
        title: "ساحل كرباباد",
        desc: "ساحل يجمع عربات طعام متنوعة مع منظر بحري جميل — مكان رائع لسهرة أو عشاء خفيف.",
        tags: ["عربات طعام", "شاطئ", "إطلالة"],
        links: {
          maps: "https://maps.app.goo.gl/ynCiWn1kEQo7wrXz7"
        }
      }
    ]
  },

  "stores": {
    title: "متاجر",
    icon: "🛍️",
    items: [
      { id: "st1", icon: "👕", title: "متجر الأناقة", desc: "ملابس رجالية ونسائية بأسعار مناسبة وتشكيلة متجددة.", tags: ["ملابس"], url: "#" },
      { id: "st2", icon: "📱", title: "تك ستور", desc: "إلكترونيات وإكسسوارات جوالات وأجهزة أصلية.", tags: ["إلكترونيات"], url: "#" },
      { id: "st3", icon: "🏠", title: "بيت الديكور", desc: "مستلزمات منزلية وديكورات بأسلوب عصري.", tags: ["منزل"], url: "#" },
      { id: "st4", icon: "🧴", title: "عناية وجمال", desc: "منتجات عناية بالبشرة والشعر من ماركات موثوقة.", tags: ["عناية"], url: "#" },
      { id: "st5", icon: "🧸", title: "عالم الأطفال", desc: "ألعاب وملابس ومستلزمات للأطفال بجودة عالية.", tags: ["أطفال"], url: "#" },
      { id: "st6", icon: "📚", title: "مكتبة المعرفة", desc: "كتب ومستلزمات مكتبية ودراسية متنوعة.", tags: ["كتب", "قرطاسية"], url: "#" }
    ]
  },

  "creators": {
    title: "صناع محتوى",
    icon: "🎥",
    items: [
      { id: "cr1", icon: "🍳", title: "قناة الطبخ السريع", desc: "وصفات سهلة وسريعة لأطباق يومية.", tags: ["طبخ", "يوتيوب"], url: "#" },
      { id: "cr2", icon: "💻", title: "تعلم البرمجة", desc: "شروحات برمجة للمبتدئين بالعربية خطوة بخطوة.", tags: ["برمجة", "تعليم"], url: "#" },
      { id: "cr3", icon: "✈️", title: "رحلاتي حول العالم", desc: "محتوى سفر ومراجعات وجهات سياحية.", tags: ["سفر"], url: "#" },
      { id: "cr4", icon: "💪", title: "لياقة يومية", desc: "تمارين منزلية ونصائح تغذية للياقة البدنية.", tags: ["رياضة", "صحة"], url: "#" },
      { id: "cr5", icon: "🎮", title: "قناة الألعاب", desc: "مراجعات ألعاب وبثوث مباشرة أسبوعية.", tags: ["ألعاب"], url: "#" },
      { id: "cr6", icon: "💰", title: "التمويل الشخصي", desc: "نصائح ادخار واستثمار وإدارة ميزانية بأسلوب مبسط.", tags: ["مال", "تعليم"], url: "#" }
    ]
  }
};
