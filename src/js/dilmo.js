(function () {
  var stage = document.getElementById("play"), orb = document.getElementById("orb");
  var shadowEl = document.getElementById("orb-shadow"), bub = document.getElementById("orb-say");
  var body = orb.querySelector(".pb"), face = orb.querySelector(".pf");
  var world = document.getElementById("world");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, TOUCH = matchMedia("(pointer: coarse)").matches;
  var R = 48, HALF = 70, K = 1, G = 40, labels = document.getElementById("labels");
  function clamp(v, a, b) { return Math.min(Math.max(v, a), b); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function spring(v, k, d) { return { v: v, t: v, vel: 0, k: k, d: d }; }

  var EN = document.documentElement.lang === "en";
  function T(ar, en) { return EN ? en : ar; }
  function num(n) { var s = String(n); return EN ? s : s.replace(/\d/g, function (d) { return "٠١٢٣٤٥٦٧٨٩"[d]; }); }
  // phrasebook (fusha): every line = mood opener + core + mood tail, and recent lines are never repeated
  var MOODS_AR = {
    joy: { pre: ["", "", "يا سلام! ", "رائع! ", "مرحى! ", "هيّا! ", "جميل! ", "يا للروعة! "], post: ["", "", " هذا ممتع!", " أعِدها!", " ما ألطفك!", " يومي صار أجمل.", " أنا سعيد!"] },
    surprise: { pre: ["", "", "أوه! ", "ماذا؟! ", "يا للمفاجأة! ", "مهلاً! ", "عجباً! "], post: ["", "", " لم أتوقع ذلك!", " قلبي يدقّ!", " على مهلك!", " ما هذا اليوم!"] },
    annoy: { pre: ["", "", "مهلاً! ", "رجاءً! ", "يا صديقي، ", "أُفّ! ", "حسبك! "], post: ["", "", " دعني قليلاً.", " سأغضب منك.", " هذا يكفي.", " أنا جادّ!"] },
    calm: { pre: ["", "", "آه، ", "هكذا، ", "نعم، ", "أجل، "], post: ["", "", " شكراً لك.", " أشعر بالأمان.", " لا تتوقف.", " ما أجمل الهدوء."] },
    neutral: { pre: ["", "", "حسناً، ", "إذن، ", "لحظة، ", "اسمع، "], post: ["", "", " ما رأيك؟", " أليس كذلك؟", " أخبرني."] },
    sad: { pre: ["", "", "آه، ", "أوه، ", "يا للأسف، "], post: ["", "", " سأنتظرك.", " لا تتأخر.", " المكان هادئ بدونك."] },
    plain: { pre: [""], post: [""] }
  };
  var LINES_AR = {
    greet1: ["joy", ["مرحباً! هذه أول مرة نلتقي.", "أهلاً بك! أنا دلمو، رفيقك في هكوله.", "سعيد بلقائك لأول مرة!", "أهلاً وسهلاً! تشرّفتُ بمعرفتك.", "مرحباً يا صديقي الجديد!", "أخيراً جاء زائر جديد!"]],
    greetN: ["joy", ["أهلاً بعودتك! هذه زيارتك رقم {n}.", "عدتَ من جديد! الزيارة رقم {n}.", "مرحباً مرة أخرى! نلتقي للمرة {n}.", "اشتقتُ إليك! هذه المرة رقم {n}.", "يسعدني رجوعك، زيارتك رقم {n}."]],
    poke: ["joy", ["مرحباً!", "نعم؟", "أنا هنا!", "هل ناديتني؟", "تفضّل!", "ها أنا ذا!", "كيف أساعدك؟", "أهلاً بك!", "لمستني!", "ماذا هناك؟", "حاضر!", "أسمعك!"]],
    annoy: ["annoy", ["كفاني ضغطاً!", "توقّف عن نقري!", "يكفي هذا!", "تعبتُ من النقر!", "سأبتعد عنك قليلاً!", "أصابعك لا تهدأ!", "دعني أرتاح!", "هذا كثير عليّ!", "سأعدّ إلى ثلاثة!", "لستُ زرّاً يا صديقي!"]],
    bored: ["sad", ["أشعر بالملل قليلاً.", "ماذا نفعل الآن؟", "هل ما زلتَ هنا؟", "الوقت يمرّ ببطء.", "لنفعل شيئاً ممتعاً!", "أنا أنتظرك.", "هل نسيتني؟", "ألا تريد أن تلعب معي؟", "سأعدّ النجوم حتى تعود.", "ما أطول الانتظار!"]],
    hum: ["neutral", ["أفكّر في مطعم جديد.", "ترى، أين نأكل اليوم؟", "أحبّ هذا المكان.", "الجو هادئ هنا.", "أنا جاهز متى أردت.", "أبحث عن شيء أفعله.", "سأتمشّى قليلاً.", "هل جرّبتَ «اختار لي»؟"]],
    startle: ["surprise", ["أخفتني!", "أفزعتني!", "ما هذا؟!", "على رسلك!", "كدتُ أقفز من مكاني!", "لم أرك قادماً!", "أسرعتَ كثيراً!", "انتبه!"]],
    lift: ["surprise", ["إلى أين تأخذني؟", "أنا أطير!", "أنزلني برفق!", "أين نذهب؟", "ارتفعتُ عالياً!", "أمسكني جيداً!", "الأرض بعيدة!"]],
    slip: ["joy", ["آخ! أفلتَ خدّي!", "بوينغ! عاد خدّي إلى مكانه.", "طار خدّي من يدك!", "انزلق! خدّي أقوى منك.", "آي! برفق يا صديقي."]],
    cheek: ["joy", ["خدّي! خدّي!", "أعِد خدّي إلى مكانه!", "خدّي يتمدّد!", "صار خدّي طويلاً!", "انتبه لخدّي!", "خدّي ليس مطّاطاً!", "أعِده كما كان!"]],
    stretch: ["surprise", ["صرتُ مثل العلكة!", "سأنفلت!", "أنا أتمدّد!", "صرتُ بيضة!", "إلى متى تمدّني؟", "شكلي تغيّر!", "سأعود كما كنت!", "أنا مرن جداً!"]],
    tickle: ["joy", ["ههه لا! كفى كفى!", "هذا يضحكني!", "لا أتحمّل الضحك!", "توقّف، سأنفجر ضحكاً!", "أنت تُضحكني!", "لا لا لا، ههه!", "ضحكتُ حتى تعبت!"]],
    shy: ["surprise", ["انضغطت!", "أنا محشور!", "صرتُ مسطّحاً!", "خفّف قليلاً!", "لا أستطيع الحركة!", "أنا عالق!"]],
    unshy: ["joy", ["أخيراً حرّرتني!", "عدتُ كما كنت!", "تنفّستُ أخيراً!", "شكراً لأنك تركتني!", "ها أنا حرّ!"]],
    spin: ["joy", ["انظر انظر!", "شاهد هذه الحركة!", "دورة كاملة!", "هل رأيت ذلك؟", "أنا بطل الدوران!", "ما رأيك بهذه؟"]],
    dizzy: ["surprise", ["أنا دائخ…", "الدنيا تدور!", "رأسي يدور!", "أين الأرض؟", "لا أرى جيداً…", "كل شيء يلفّ!", "أحتاج أن أجلس."]],
    shake: ["surprise", ["دوّختني!", "توقّف عن هزّي!", "أنا أرتجّ!", "كل شيء يهتز!"]],
    type: ["neutral", ["ماذا تكتب؟", "أراك تكتب شيئاً.", "هل تبحث عن مطعم؟", "اكتب، أنا أنتظر.", "أصابعك سريعة!", "هل هي رسالة لي؟"]],
    back: ["joy", ["عدت! اشتقتُ إليك.", "أهلاً بعودتك!", "أين كنت؟ افتقدتك!", "أخيراً رجعت!", "انتظرتك طويلاً!", "مرحباً من جديد!"]],
    left: ["sad", ["أين ذهبت؟", "لا تتركني وحدي!", "عُد قريباً!", "اختفيتَ فجأة!", "هل ستعود؟", "بقيتُ وحدي."]],
    eye: ["surprise", ["عيني!", "انتبه لعيني!", "أصبتَ عيني!", "لا تلمس عيني!", "أغمضتُها في الوقت المناسب!"]],
    mouth: ["surprise", ["أُغلق فمي!", "سكتُّ رغماً عني!", "فمي مقفل!", "لا أستطيع الكلام!", "أوقفتَ كلامي!"]],
    pet: ["calm", ["أشعر بالراحة.", "هذا لطيف منك.", "أكمل، هذا مريح.", "ما أجمل هذا!", "أكاد أنام من الراحة.", "يدك خفيفة.", "هذا يهدّئني."]],
    want: ["joy", ["طعام؟ أحضِره هنا!", "هل هذا لي؟", "أنا جائع!", "قرّبه أكثر!", "رائحته شهيّة!", "أسرع، أسرع!", "فمي جاهز!"]],
    eat: ["joy", ["لذيذ! {f}!", "يا سلام على {f}!", "أحببتُ {f}!", "شكراً على {f}!", "{f}؟ من أطيب ما أكلت!", "طعم {f} رائع!", "هنيئاً لي {f}!"]],
    full: ["annoy", ["شبعت! لا أستطيع المزيد.", "بطني ممتلئ!", "يكفيني هذا.", "لا مكان لأي لقمة!", "دعني أهضم أولاً."]],
    catch: ["joy", ["أمسكتُك!", "وجدتُك!", "لن تهرب مني!", "قبضتُ عليك!", "كنتُ أسرع منك!", "ها أنت ذا!", "انتهت المطاردة!"]],
    wake: ["surprise", ["استيقظت!", "كنتُ نائماً!", "أيقظتني!", "هل نمتُ طويلاً؟", "أنا مستيقظ، مستيقظ!", "حلمتُ بمطعم!"]],
    wall: ["surprise", ["التصقتُ بالجدار!", "أنا عالق هنا!", "الجدار لزج!", "سأنزلق الآن!", "صرتُ ملصقاً!"]],
    throw: ["joy", ["ويييي!", "أنا أطير!", "إلى الأعلى!", "يا للسرعة!", "طائر بلا جناحين!"]],
    ouch: ["annoy", ["آخ!", "آه، هذا يؤلم!", "سقطة قوية!", "ارتطمتُ بالأرض!"]],
    buddyPoke: ["joy", ["أهلاً!", "لمستني!", "هيّا نلعب!", "أنا صديقه!", "هل تعرفني؟", "نعم؟"]],
    buddyShyPoke: ["surprise", ["خجلت!", "لا تنظر إليّ هكذا!", "سأختبئ!", "أنا خجول قليلاً."]],
    buddyLift: ["surprise", ["إلى أين؟", "أنزلني!", "أطير!", "خذني إليه!"]],
    buddyThrow: ["joy", ["وييي!", "أنا أطير!", "إلى الأعلى!"]],
    bump: ["surprise", ["انتبه!", "اصطدمنا!", "أوه، آسف!", "طريقي!"]],
    bumpMain: ["surprise", ["أوه، صديقي!", "اصطدمتَ بي!", "على مهلك يا صديقي!", "انتبه لطريقك!"]],
    comfort: ["calm", ["لا تحزن، أنا هنا.", "هل أنت بخير؟", "تعال، سأبقى معك.", "كل شيء سيكون بخير."]],
    thanks: ["calm", ["شكراً لك يا صديقي.", "وجودك يريحني.", "أنت صديق حقيقي.", "صرتُ أفضل الآن."]],
    tagStart: ["joy", ["لنلعب المطاردة!", "سأمسك بك!", "أنت المطارَد!", "استعد!"]],
    tagGot: ["joy", ["أمسكتك! دورك!", "وصلتُ إليك!", "الآن أنت تطاردني!"]],
    buddyWant: ["neutral", ["وأنا؟", "هل بقي شيء لي؟", "رائحته شهيّة!", "أريد قطعة صغيرة."]],
    arrive: ["joy", ["سمعتُ أن هنا أصدقاء طيبين!", "مرحباً! هل يمكنني اللعب معكم؟", "وصلتُ! أنا جمرة."]],
    welcome: ["joy", ["أهلاً بك يا جمرة!", "صديق جديد!", "مرحباً بك بيننا!"]],
    ph_morning: ["joy", ["صباح الخير! يوم جميل للفطور.", "صباح النور! هل شربتَ قهوتك؟", "الصباح هادئ، أحبّه."]],
    ph_noon: ["neutral", ["وقت الغداء تقريباً!", "الشمس قوية الآن، ابحث عن مكان مكيّف.", "الظهيرة حارّة اليوم."]],
    ph_evening: ["calm", ["مساء الخير! وقت الكرك.", "المساء جميل للنزهة.", "الجو بدأ يبرد قليلاً."]],
    ph_night: ["calm", ["تأخّر الوقت… هل وجدتَ مكاناً ما زال مفتوحاً؟", "أصدقائي نائمون، تكلّم بهدوء.", "النجوم جميلة الليلة."]],
    buddyWoke: ["surprise", ["أيقظتني!", "كنتُ أحلم…", "هل أصبح الصباح؟"]],
    favYes: ["joy", ["{f}! هذه أكلتي المفضّلة!", "كيف عرفتَ أني أحبّ {f}؟", "أفضل {f} في العالم!"]],
    favHint: ["neutral", ["شكراً! لكني أحبّ {f} أكثر.", "لذيذ، ولو كان {f} لكان أجمل.", "أتعرف ما أحبّ؟ {f}!"]],
    thanksFood: ["joy", ["شكراً على {f}!", "لذيذ!", "ما ألطفك!"]],
    hsStart: ["joy", ["موجة اختبأت! هل تجدها؟", "لنلعب الغميضة! أين موجة؟", "موجة مختبئة في مكان ما…"]],
    hsFound: ["joy", ["وجدتني!", "كيف عرفتَ مكاني؟", "أنت بارع في البحث!"]],
    hsYou: ["joy", ["أحسنت! وجدتَها.", "عينك حادّة!", "موجة لا تستطيع الاختباء منك!"]],
    hsLost: ["joy", ["لم تجدني!", "كنتُ هنا طوال الوقت!", "فزتُ هذه المرة!"]],
    gotStar: ["joy", ["نجمة! عندك {s} الآن.", "جمعتَ {s} نجوم!", "نجمة جديدة، المجموع {s}."]],
    unlock: ["joy", ["فتحتَ لوناً جديداً لشخصيتك!", "لون جديد بانتظارك!", "مبروك! لون جديد انفتح."]],
    backIn: ["joy", ["عدتُ!", "اشتقتُ إلى المكان!", "ها أنا من جديد!"]],
    arrive2: ["joy", ["رجعتُ!", "مرحباً من جديد!", "أنا هنا!"]],
    pound: ["surprise", ["ارتجّت الأرض!", "يا لها من ضربة!", "قفزتُ من مكاني!", "ما هذه القوة؟!"]],
    playerJoin: ["joy", ["أهلاً بك يا {n}!", "مرحباً {n}، انضمّ إلينا!", "صار عندنا صديق اسمه {n}!", "تشرّفنا بك يا {n}!"]],
    playerBack: ["joy", ["عاد {n}! اشتقنا إليك.", "أهلاً من جديد يا {n}!", "{n} هنا مرة أخرى!"]],
    buddyHiPlayer: ["joy", ["مرحباً {n}!", "هل تلعب معنا يا {n}؟", "لونك جميل يا {n}!", "أنا سعيد بلقائك يا {n}."]],
    playerBye: ["sad", ["مع السلامة يا {n}.", "عُد قريباً يا {n}!", "سنفتقدك يا {n}."]],
    waveBack: ["joy", ["أهلاً {n}!", "نلوّح لك أيضاً!", "مرحباً يا {n}!"]],
    laughBack: ["joy", ["ضحكتك جميلة!", "ههه، أضحكتنا معك!", "ما الذي يضحكك يا {n}؟"]],
    comeToPlayer: ["joy", ["قادمون يا {n}!", "ها نحن!", "حاضر يا {n}!"]],
    toPlayer: ["joy", ["يا {n}، هل نلعب؟", "{n}! تعال إلى هنا.", "أعجبني لونك يا {n}.", "هل أنت بخير يا {n}؟"]],
    replyHi: ["joy", ["أهلاً يا {n}!", "مرحباً بك!", "وعليك أجمل تحية يا {n}."]],
    cBye: ["plain", ["مع السلامة يا {n}!", "إلى اللقاء، عُد قريباً.", "سأنتظرك يا {n}."]],
    cThanks: ["plain", ["العفو يا {n}.", "لا شكر على واجب.", "يسعدني ذلك!"]],
    cHowGood: ["plain", ["أنا بخير، شكراً لسؤالك! وأنت؟", "بأفضل حال ما دمتَ هنا. وأنت؟", "سعيد جداً اليوم! وأنت؟"]],
    cHowTired: ["plain", ["نعسان قليلاً… وأنت؟", "متعب بعض الشيء، لكني بخير. وأنت؟"]],
    cHowGrumpy: ["plain", ["كنتُ منزعجاً قليلاً، لكن سؤالك أسعدني.", "أفضل الآن بعد أن سألت."]],
    cName: ["plain", ["اسمي دلمو!", "أنا دلمو، رفيقك في هكوله.", "دلمو، وهؤلاء أصدقائي."]],
    cAge: ["plain", ["عمري {v}، وُلدتُ في ٢٨ أكتوبر ٢٠٢٦.", "عمري {v} فقط، صغير لكني أعرف أماكن كثيرة."]],
    cHome: ["plain", ["أعيش هنا في هكوله، في البحرين.", "بيتي هذه الساحة، وأحياناً خلف الشجيرة."]],
    cPraise: ["plain", ["شكراً! أحرجتني.", "وأنت ألطف يا {n}!", "كلامك جعل يومي أجمل."]],
    cInsult: ["plain", ["هذا ليس لطيفاً.", "لماذا تقول هذا؟", "سأتظاهر أني لم أسمع."]],
    cSad: ["plain", ["لا تحزن يا {n}، أنا هنا.", "أتمنى أن يتحسّن يومك.", "تعال نلعب قليلاً، قد يخفّف عنك."]],
    cHappy: ["plain", ["رائع! فرحك يفرحني.", "هذا يسعدني يا {n}!", "هذا خبر جميل!"]],
    cBored: ["plain", ["مللت؟ اركل الكرة أو اجمع النجوم!", "هيّا نلعب المطاردة!", "جرّب أن تطعمني شيئاً."]],
    cHungry: ["plain", ["وأنا جائع أيضاً! هل أقترح لك مكاناً؟", "الجوع صعب! هل أساعدك في اختيار مطعم؟"]],
    cWhereEat: ["plain", ["اضغط النرد في الأعلى، فيختار لك مكاناً.", "ابحث في هكوله، فيه مطاعم كثيرة متحقَّق منها.", "صفحة «اختار لي» تحلّ حيرتك!"]],
    cPlay: ["plain", ["هيّا نلعب! اهرب قبل أن يمسكوك!", "لنلعب المطاردة!", "استعد، اللعب بدأ!"]],
    cJoke: ["plain", ["لماذا لا أقف في الزاوية أبداً؟ لأني مستدير!", "سألتُ الكرة عن حالها فقالت: أنا أتدحرج!", "قالت الشجيرة: لا تقلقوا، أنا دائماً خضراء!"]],
    cYesSuggest: ["plain", ["إذن اضغط النرد في الأعلى، وسيختار لك مكاناً!", "جرّب «اختار لي» من الشريط في الأعلى."]],
    cNoSuggest: ["plain", ["حسناً، هل نلعب بدلاً من ذلك؟", "لا بأس، أنا هنا متى احتجتني."]],
    cYes: ["plain", ["جميل!", "اتفقنا!", "رائع!"]],
    cNo: ["plain", ["حسناً.", "كما تريد.", "لا بأس."]],
    cFood: ["plain", ["{f}؟ لذيذ!", "أحبّ {f} كثيراً!", "ذكّرتني بـ{f}، جعتُ الآن!"]],
    cFoodFav: ["plain", ["{f}؟ هذه أكلة {w} المفضّلة!", "{w} تحبّ {f} أكثر من أي شيء!"]],
    cFriendCalled: ["plain", ["نعم يا {n}؟", "ناديتني؟ أنا هنا!", "أهلاً يا {n}!"]],
    cHuh: ["plain", ["لم أفهم تماماً… هل تريد أن أقترح لك مكاناً تأكل فيه؟", "لم أفهم قصدك. هل تبحث عن مكان تأكل فيه؟"]],
    cHuh2: ["plain", ["لم أفهم، لكن كلامك لطيف! هل نلعب؟", "لم أفهم جيداً… هل نلعب المطاردة؟"]],
    pName: ["plain", ["أنا {w}! صديقة دلمو، {a}.", "اسمي {w}، و{a}!"]],
    pHow: ["plain", ["أنا {w} وبخير، شكراً يا {n}!", "بأفضل حال! وأنت؟"]],
    pAge: ["plain", ["عمري؟ هذا سرّ بيني وبين دلمو!", "أصغر من دلمو بقليل، أظن!"]],
    pHome: ["plain", ["أعيش هنا في ساحة دلمو، في هكوله.", "بيتي هذه الساحة مع أصدقائي."]],
    pLikes: ["plain", ["أحبّ {f}، ولوني {c}!", "أكلتي المفضّلة {f}، هل تطعمني؟"]],
    pFriends: ["plain", ["صديقي المقرّب دلمو، وأحبّ اللعب مع الجميع.", "كلنا أصدقاء هنا، وأنت منهم الآن!"]],
    dNew: ["plain", ["آخر ما أُضيف إلى هكوله: «{p}»، والبقية تحت.", "جديد هكوله: «{p}»، وتحت أماكن أخرى جديدة."]],
    dWhich: ["plain", ["عن أي مكان تسأل؟ اكتب اسمه.", "اكتب لي اسم المكان وسأخبرك."]],
    dHours: ["plain", ["«{p}»: {h}", "ساعات «{p}»: {h}"]],
    dHoursNone: ["plain", ["ساعات «{p}» لم نتحقّق منها في هكوله بعد، فلن أخمّنها."]],
    dHoursNoneCall: ["plain", ["ساعات «{p}» لم نتحقّق منها بعد، فلن أخمّنها. اتصل بهم: {t}"]],
    dPhone: ["plain", ["رقم «{p}»: {t}", "تقدر تتصل بـ«{p}» على {t}"]],
    dPhoneNone: ["plain", ["ليس عندي رقم مؤكّد لـ«{p}» بعد."]],
    dLoc: ["plain", ["موقع «{p}» على الخريطة تحت، اضغطه.", "هذا موقع «{p}»، تجده تحت."]],
    dLocNone: ["plain", ["ليس عندي موقع مؤكّد لـ«{p}» بعد."]],
    dNoMenu: ["plain", ["منيو «{p}» ليس في هكوله بعد، فلا أعرف أسعاره."]],
    dNoPrice: ["plain", ["عند «{p}» {d}، لكن سعره غير مؤكّد بعد."]],
    dPriceMenu: ["plain", ["منيو «{p}» فيه {k} صنفاً، مثلاً {d} ({c}). اسألني عن صنف بعينه!"]],
    dPrice: ["plain", ["{d} في «{p}»: {c}", "سعر {d} عند «{p}»: {c}"]],
    cMemName: ["plain", ["تشرّفنا يا {n}! سأتذكّر اسمك.", "{n}؟ اسم جميل، لن أنساه.", "أهلاً يا {n}، حفظتُ اسمك."]],
    cMemForget: ["plain", ["حسناً، نسيتُ كل ما أخبرتني به.", "تمّ، صفحة جديدة بيننا."]],
    cMemWho: ["plain", ["اسمك {n}! لم أنسَ.", "أنت {n} طبعاً!"]],
    cMemNoName: ["plain", ["لم تخبرني باسمك بعد. قل: اسمي…", "أعرفك باسم {n} هنا، لكن ما اسمك الحقيقي؟ قل: اسمي…"]],
    cMemKnow: ["plain", ["أعرف {k}.", "أتذكّر {k}!"]],
    cMemNothing: ["plain", ["لا أعرف عنك شيئاً بعد. أخبرني ماذا تحب!", "لم تخبرني بشيء عنك بعد."]],
    cMemLike: ["plain", ["سأتذكّر أنك تحب {f}!", "حفظتُها: أنت تحب {f}."]],
    cMemHate: ["plain", ["فهمت، لن أقترح عليك {f}.", "حسناً، سأبعد عنك {f}."]],
    cHungryLike: ["plain", ["جائع؟ ما رأيك بشيء من {f} الذي تحبه؟ هل أبحث لك؟", "أعرف أنك تحب {f}… هل أبحث لك عن مكان؟"]],
    cFound: ["plain", ["جرّب «{p}»!", "وجدتُ لك «{p}» في هكوله.", "ما رأيك بـ«{p}»؟"]],
    cFoundMany: ["plain", ["وجدتُ أماكن! أولها «{p}»، والبقية تحت.", "جرّب «{p}»، وعندي غيره تحت."]],
    cFoundDish: ["plain", ["«{p}» عندهم {d} ({c})!", "جرّب {d} من «{p}» ({c})."]],
    cFoundOther: ["plain", ["لم أجد ما طلبته بالضبط، لكن جرّب «{p}».", "ليس تماماً ما طلبت، لكن «{p}» قد يعجبك."]],
    cNotFound: ["plain", ["لم أجد في هكوله مكاناً يطابق هذا بعد.", "بحثتُ في كل الأماكن ولم أجد شيئاً مطابقاً، جرّب كلمة أخرى."]],
    cMemMood: ["plain", ["آخر مرة كنت حزيناً يا {n}… هل أنت أفضل اليوم؟", "اشتقتُ إليك يا {n}. هل تحسّن مزاجك؟"]],
    cMemTried: ["plain", ["هل جرّبتَ «{p}» الذي اقترحته عليك؟", "يا {n}، هل ذهبتَ إلى «{p}»؟"]],
    cTriedYes: ["joy", ["رائع! يسعدني أن اقتراحي نفعك.", "جميل! متى أردتَ مكاناً آخر فاسألني.", "هذا ما أحبّ سماعه!"]],
    cTriedNo: ["plain", ["لا بأس، ما زال ينتظرك. هل أقترح عليك مكاناً آخر؟", "ربما في وقت لاحق. أأقترح عليك غيره؟"]],
    cMemLikeAgain: ["plain", ["أهلاً يا {n}! ما زلتَ تحب {f}؟", "تذكّرتُ أنك تحب {f} يا {n}!"]],
    buddyReply: ["joy", ["أتفق معه!", "وأنا أيضاً يا {n}!", "كلام جميل يا {n}."]],
    sing: ["calm", ["أغنية هادئة لك.", "دعني أغنّي قليلاً.", "استرخِ واستمع.", "لحن للهدوء.", "أغنّي حين أرتاح.", "أغنية صغيرة قبل القيلولة.", "هذا لحني المفضّل."]],
    singEnd: ["calm", ["انتهت الأغنية.", "أتمنى أنها أراحتك.", "شكراً لأنك استمعت.", "كانت أغنية قصيرة.", "سأغنّي لك مرة أخرى لاحقاً."]]
  };
  var MOODS_EN = {
    joy: { pre: ["", "", "Yay! ", "Wow! ", "Hooray! ", "Come on! ", "Nice! ", "How lovely! "], post: ["", "", " This is fun!", " Again!", " You're so kind!", " My day just got better.", " I'm happy!"] },
    surprise: { pre: ["", "", "Oh! ", "What?! ", "What a surprise! ", "Wait! ", "Whoa! "], post: ["", "", " I didn't see that coming!", " My heart is racing!", " Easy there!", " What a day!"] },
    annoy: { pre: ["", "", "Hey! ", "Please! ", "My friend, ", "Ugh! ", "Enough! "], post: ["", "", " Give me a moment.", " I'll get cross.", " That's enough.", " I mean it!"] },
    calm: { pre: ["", "", "Aah, ", "There, ", "Yes, "], post: ["", "", " Thank you.", " I feel safe.", " Don't stop.", " So peaceful."] },
    neutral: { pre: ["", "", "Well, ", "So, ", "Hang on, ", "Listen, "], post: ["", "", " What do you think?", " Right?", " Tell me."] },
    sad: { pre: ["", "", "Ah, ", "Oh, ", "What a pity, "], post: ["", "", " I'll wait for you.", " Don't be long.", " It's quiet without you."] },
    plain: { pre: [""], post: [""] }
  };
  var LINES_EN = {
    greet1: ["joy", ["Hello! This is our first time meeting.", "Welcome! I'm Dilmo, your Hakolah companion.", "Nice to meet you!", "Hi there, new friend!", "Finally, a new visitor!"]],
    greetN: ["joy", ["Welcome back! This is visit number {n}.", "You're back! Visit number {n}.", "Hello again! We've met {n} times now.", "I missed you! That's {n} visits."]],
    poke: ["joy", ["Hi!", "Yes?", "I'm here!", "Did you call me?", "Here I am!", "How can I help?", "You poked me!", "What's up?", "I'm listening!"]],
    annoy: ["annoy", ["Stop poking me!", "That's enough!", "I'm tired of being tapped!", "I'll move away for a bit!", "Your fingers never rest!", "Let me rest!", "I'm counting to three!", "I'm not a button, friend!"]],
    bored: ["sad", ["I'm a little bored.", "What do we do now?", "Are you still there?", "Time is going so slowly.", "Let's do something fun!", "I'm waiting for you.", "Did you forget me?", "Don't you want to play?", "I'll count the stars until you're back."]],
    hum: ["neutral", ["I'm thinking about a new restaurant.", "Where should we eat today?", "I like it here.", "It's calm here.", "I'm ready when you are.", "Looking for something to do.", "I'll take a little walk.", "Have you tried «Pick for me»?"]],
    startle: ["surprise", ["You scared me!", "What was that?!", "Slow down!", "I nearly jumped out of my skin!", "I didn't see you coming!", "Careful!"]],
    lift: ["surprise", ["Where are you taking me?", "I'm flying!", "Put me down gently!", "Where are we going?", "So high up!", "Hold on to me!"]],
    slip: ["joy", ["Ow! My cheek slipped!", "Boing! My cheek snapped back.", "It got away from you!", "Slippery! My cheek wins.", "Ouch! Gently, friend."]],
    cheek: ["joy", ["My cheek! My cheek!", "Put my cheek back!", "My cheek is stretching!", "Mind my cheek!", "My cheek isn't rubber!"]],
    stretch: ["surprise", ["I'm like chewing gum!", "I'm going to slip!", "I'm stretching!", "I'm an egg now!", "How long will you stretch me?", "I'll bounce back!"]],
    tickle: ["joy", ["Haha no! Stop stop!", "That tickles!", "I can't stop laughing!", "Stop, I'll burst!", "You're making me laugh!", "No no no, haha!"]],
    shy: ["surprise", ["I'm squashed!", "I'm stuck!", "I'm flat now!", "Ease up a little!", "I can't move!"]],
    unshy: ["joy", ["Free at last!", "Back to normal!", "I can breathe!", "Thanks for letting go!", "I'm free!"]],
    spin: ["joy", ["Look look!", "Watch this move!", "A full spin!", "Did you see that?", "Spinning champion!"]],
    dizzy: ["surprise", ["I'm dizzy…", "The world is spinning!", "My head is spinning!", "Where's the ground?", "Everything is turning!", "I need to sit down."]],
    shake: ["surprise", ["You made me dizzy!", "Stop shaking me!", "I'm wobbling!", "Everything is shaking!"]],
    type: ["neutral", ["What are you typing?", "I see you typing.", "Looking for a restaurant?", "Type away, I'll wait.", "Fast fingers!", "Is that a message for me?"]],
    back: ["joy", ["You're back! I missed you.", "Welcome back!", "Where were you?", "Finally!", "I waited so long!", "Hello again!"]],
    left: ["sad", ["Where did you go?", "Don't leave me alone!", "Come back soon!", "You vanished!", "Will you come back?", "All alone now."]],
    eye: ["surprise", ["My eye!", "Mind my eye!", "You got my eye!", "Don't touch my eye!", "I closed it just in time!"]],
    mouth: ["surprise", ["My mouth is shut!", "You stopped me talking!", "I can't speak!", "Mouth closed!"]],
    pet: ["calm", ["That feels nice.", "That's kind of you.", "Keep going, it's relaxing.", "How lovely!", "I could fall asleep.", "Your hand is so light.", "That calms me down."]],
    want: ["joy", ["Food? Bring it here!", "Is that for me?", "I'm hungry!", "Bring it closer!", "It smells so good!", "Hurry, hurry!", "My mouth is ready!"]],
    eat: ["joy", ["Delicious {f}!", "Oh, {f}!", "I loved the {f}!", "Thanks for the {f}!", "That {f} was one of the best things I've eaten!", "The {f} tastes great!"]],
    full: ["annoy", ["I'm full! No more.", "My tummy is full!", "That's enough for me.", "Not one more bite!", "Let me digest first."]],
    catch: ["joy", ["Got you!", "Found you!", "You can't escape me!", "Caught you!", "I was faster!", "There you are!"]],
    wake: ["surprise", ["I'm awake!", "I was sleeping!", "You woke me up!", "Did I sleep long?", "Awake, awake!", "I dreamt of a restaurant!"]],
    wall: ["surprise", ["I'm stuck to the wall!", "I'm stuck here!", "This wall is sticky!", "I'm sliding down!", "I'm a sticker now!"]],
    throw: ["joy", ["Wheee!", "I'm flying!", "Up we go!", "So fast!", "A bird without wings!"]],
    ouch: ["annoy", ["Ouch!", "Ow, that hurts!", "Hard landing!", "I hit the ground!"]],
    buddyPoke: ["joy", ["Hi!", "You poked me!", "Let's play!", "I'm his friend!", "Do you know me?", "Yes?"]],
    buddyShyPoke: ["surprise", ["I'm shy!", "Don't look at me like that!", "I'll hide!", "I'm a little shy."]],
    buddyLift: ["surprise", ["Where to?", "Put me down!", "I'm flying!", "Take me to him!"]],
    buddyThrow: ["joy", ["Wheee!", "I'm flying!", "Up we go!"]],
    bump: ["surprise", ["Watch out!", "We bumped!", "Oh, sorry!", "Coming through!"]],
    bumpMain: ["surprise", ["Oh, my friend!", "You bumped into me!", "Easy, friend!", "Watch where you're going!"]],
    comfort: ["calm", ["Don't be sad, I'm here.", "Are you okay?", "Come here, I'll stay with you.", "Everything will be fine."]],
    thanks: ["calm", ["Thank you, my friend.", "Having you here helps.", "You're a true friend.", "I feel better now."]],
    tagStart: ["joy", ["Let's play tag!", "I'm going to catch you!", "You're it!", "Get ready!"]],
    tagGot: ["joy", ["Got you! Your turn!", "Tagged!", "Now you chase me!"]],
    buddyWant: ["neutral", ["What about me?", "Is there any left for me?", "That smells good!", "Just a small piece for me?"]],
    arrive: ["joy", ["I heard there are nice friends here!", "Hi! Can I play with you?", "I'm here! I'm Jamra."]],
    welcome: ["joy", ["Welcome, Jamra!", "A new friend!", "Glad you're here!"]],
    ph_morning: ["joy", ["Good morning! A nice day for breakfast.", "Morning! Had your coffee yet?", "Mornings are calm, I like them."]],
    ph_noon: ["neutral", ["It's nearly lunchtime!", "The sun is strong, find somewhere with AC.", "Hot afternoon today."]],
    ph_evening: ["calm", ["Good evening! Karak time.", "Evenings are nice for a walk.", "It's getting a little cooler."]],
    ph_night: ["calm", ["It's late… found somewhere still open?", "My friends are asleep, speak softly.", "The stars are pretty tonight."]],
    buddyWoke: ["surprise", ["You woke me up!", "I was dreaming…", "Is it morning already?"]],
    favYes: ["joy", ["Ooh, {f}! That's my favourite!", "How did you know I love {f}?", "The best {f} in the world!"]],
    favHint: ["neutral", ["Thanks! But I like {f} more.", "Tasty, but {f} would be even better.", "You know what I love? {f}!"]],
    thanksFood: ["joy", ["Thanks for the {f}!", "Delicious!", "How kind of you!"]],
    hsStart: ["joy", ["Mawja is hiding! Can you find her?", "Hide and seek! Where's Mawja?", "Mawja is hiding somewhere…"]],
    hsFound: ["joy", ["You found me!", "How did you know where I was?", "You're good at this!"]],
    hsYou: ["joy", ["Well done! You found her.", "Sharp eyes!", "Mawja can't hide from you!"]],
    hsLost: ["joy", ["You didn't find me!", "I was here all along!", "I win this time!"]],
    gotStar: ["joy", ["A star! You have {s} now.", "{s} stars collected!", "New star, {s} in total."]],
    unlock: ["joy", ["You unlocked a new colour for your character!", "A new colour is waiting for you!", "Congrats! A new colour opened up."]],
    backIn: ["joy", ["I'm back!", "I missed this place!", "Here I am again!"]],
    arrive2: ["joy", ["I'm back!", "Hello again!", "I'm here!"]],
    pound: ["surprise", ["The ground shook!", "What a stomp!", "I jumped right up!", "Such power!"]],
    playerJoin: ["joy", ["Welcome, {n}!", "Hi {n}, join us!", "We have a new friend called {n}!", "Nice to meet you, {n}!"]],
    playerBack: ["joy", ["{n} is back! We missed you.", "Welcome back, {n}!", "{n} is here again!"]],
    buddyHiPlayer: ["joy", ["Hi {n}!", "Will you play with us, {n}?", "Nice colour, {n}!", "Happy to meet you, {n}."]],
    playerBye: ["sad", ["Goodbye, {n}.", "Come back soon, {n}!", "We'll miss you, {n}."]],
    waveBack: ["joy", ["Hi {n}!", "We're waving too!", "Hello, {n}!"]],
    laughBack: ["joy", ["What a nice laugh!", "Haha, now we're laughing too!", "What's so funny, {n}?"]],
    comeToPlayer: ["joy", ["Coming, {n}!", "Here we are!", "On our way, {n}!"]],
    toPlayer: ["joy", ["{n}, shall we play?", "{n}! Come over here.", "I like your colour, {n}.", "Are you okay, {n}?"]],
    replyHi: ["joy", ["Hi, {n}!", "Hello to you!", "Good to see you, {n}."]],
    cBye: ["plain", ["Bye, {n}!", "See you, come back soon.", "I'll wait for you, {n}."]],
    cThanks: ["plain", ["You're welcome, {n}.", "Any time.", "Happy to help!"]],
    cHowGood: ["plain", ["I'm good, thanks for asking! And you?", "Great, now that you're here. And you?", "Very happy today! And you?"]],
    cHowTired: ["plain", ["A little sleepy… and you?", "A bit tired, but fine. And you?"]],
    cHowGrumpy: ["plain", ["I was a bit grumpy, but your question cheered me up.", "Better now that you asked."]],
    cName: ["plain", ["My name is Dilmo!", "I'm Dilmo, your Hakolah companion.", "Dilmo, and these are my friends."]],
    cAge: ["plain", ["I'm {v} old. I was born on 28 October 2026.", "Just {v} old, young but I know lots of places."]],
    cHome: ["plain", ["I live here in Hakolah, in Bahrain.", "This playground is my home, and sometimes behind the bush."]],
    cPraise: ["plain", ["Thank you! You're making me blush.", "You're even nicer, {n}!", "That made my day."]],
    cInsult: ["plain", ["That's not nice.", "Why would you say that?", "I'll pretend I didn't hear that."]],
    cSad: ["plain", ["Don't be sad, {n}, I'm here.", "I hope your day gets better.", "Let's play a little, it might help."]],
    cHappy: ["plain", ["Great! Your happiness makes me happy.", "That's lovely, {n}!", "Good news!"]],
    cBored: ["plain", ["Bored? Kick the ball or collect stars!", "Let's play tag!", "Try feeding me something."]],
    cHungry: ["plain", ["I'm hungry too! Shall I suggest a place?", "Hunger is hard! Want help picking a restaurant?"]],
    cWhereEat: ["plain", ["Tap the dice at the top and it picks a place for you.", "Search Hakolah, it has lots of checked restaurants.", "The «Pick for me» page will decide for you!"]],
    cPlay: ["plain", ["Let's play! Run before they catch you!", "Tag time!", "Get ready, the game is on!"]],
    cJoke: ["plain", ["Why do I never stand in a corner? Because I'm round!", "I asked the ball how it was. It said: just rolling along!", "The bush said: don't worry, I'm always green!"]],
    cYesSuggest: ["plain", ["Then tap the dice at the top and it'll pick a place for you!", "Try «Pick for me» in the bar at the top."]],
    cNoSuggest: ["plain", ["Okay, shall we play instead?", "No problem, I'm here when you need me."]],
    cYes: ["plain", ["Nice!", "Deal!", "Great!"]],
    cNo: ["plain", ["Okay.", "As you like.", "No problem."]],
    cFood: ["plain", ["Ooh, {f}? Yum!", "I love {f}!", "You made me think of {f}, now I'm hungry!"]],
    cFoodFav: ["plain", ["Ooh, {f}? That's {w}'s favourite!", "{w} loves {f} more than anything!"]],
    cFriendCalled: ["plain", ["Yes, {n}?", "You called? I'm here!", "Hi, {n}!"]],
    cHuh: ["plain", ["I didn't quite get that… want me to suggest a place to eat?", "Not sure what you mean. Looking for somewhere to eat?"]],
    cHuh2: ["plain", ["I didn't get that, but it sounded nice! Shall we play?", "Didn't quite catch that… play tag?"]],
    pName: ["plain", ["I'm {w}! Dilmo's friend, {a}.", "My name is {w}, {a}!"]],
    pHow: ["plain", ["I'm {w} and I'm fine, thanks {n}!", "Doing great! And you?"]],
    pAge: ["plain", ["My age? That's a secret between me and Dilmo!", "A little younger than Dilmo, I think!"]],
    pHome: ["plain", ["I live here in Dilmo's playground, on Hakolah.", "This playground is home, with my friends."]],
    pLikes: ["plain", ["I love {f}, and my colour is {c}!", "My favourite food is {f}, will you feed me?"]],
    pFriends: ["plain", ["My best friend is Dilmo, and I like playing with everyone.", "We're all friends here, and now you are too!"]],
    dNew: ["plain", ["Newest on Hakolah: «{p}», more below.", "Just added: «{p}», and other new places below."]],
    dWhich: ["plain", ["Which place do you mean? Type its name.", "Tell me the place's name and I'll check."]],
    dHours: ["plain", ["«{p}»: {h}", "Hours for «{p}»: {h}"]],
    dHoursNone: ["plain", ["We haven't confirmed «{p}»'s hours yet, so I won't guess."]],
    dHoursNoneCall: ["plain", ["We haven't confirmed «{p}»'s hours yet, so I won't guess. Call them: {t}"]],
    dPhone: ["plain", ["«{p}»'s number: {t}", "You can call «{p}» on {t}"]],
    dPhoneNone: ["plain", ["I don't have a confirmed number for «{p}» yet."]],
    dLoc: ["plain", ["«{p}» on the map is below, tap it.", "Here's where «{p}» is, below."]],
    dLocNone: ["plain", ["I don't have a confirmed location for «{p}» yet."]],
    dNoMenu: ["plain", ["«{p}»'s menu isn't on Hakolah yet, so I don't know its prices."]],
    dNoPrice: ["plain", ["«{p}» has {d}, but its price isn't confirmed yet."]],
    dPriceMenu: ["plain", ["«{p}»'s menu has {k} items, e.g. {d} ({c}). Ask me about a specific one!"]],
    dPrice: ["plain", ["{d} at «{p}»: {c}", "{d} costs {c} at «{p}»."]],
    cMemName: ["plain", ["Nice to meet you, {n}! I'll remember your name.", "{n}? Lovely name, I won't forget it.", "Hi {n}, I've saved your name."]],
    cMemForget: ["plain", ["Okay, I've forgotten everything you told me.", "Done, a fresh start between us."]],
    cMemWho: ["plain", ["Your name is {n}! I didn't forget.", "You're {n}, of course!"]],
    cMemNoName: ["plain", ["You haven't told me your name yet. Say: my name is…", "I know you as {n} here, but what's your real name? Say: my name is…"]],
    cMemKnow: ["plain", ["I know that {k}.", "I remember that {k}!"]],
    cMemNothing: ["plain", ["I don't know anything about you yet. Tell me what you like!", "You haven't told me anything about you yet."]],
    cMemLike: ["plain", ["I'll remember that you like {f}!", "Noted: you like {f}."]],
    cMemHate: ["plain", ["Got it, no {f} suggestions for you.", "Okay, I'll keep {f} away from you."]],
    cHungryLike: ["plain", ["Hungry? How about some {f}, you like that! Shall I look for a place?", "I know you like {f}… want me to find a place?"]],
    cFound: ["plain", ["Try «{p}»!", "I found «{p}» on Hakolah.", "How about «{p}»?"]],
    cFoundMany: ["plain", ["Found some! First is «{p}», the rest are below.", "Try «{p}», I've got more below."]],
    cFoundDish: ["plain", ["«{p}» has {d} ({c})!", "Try the {d} at «{p}» ({c})."]],
    cFoundOther: ["plain", ["Not exactly what you asked for, but try «{p}».", "Not quite that, but you might like «{p}»."]],
    cNotFound: ["plain", ["I couldn't find a place on Hakolah that matches that yet.", "I searched every place and found nothing, try another word."]],
    cMemMood: ["plain", ["You were sad last time, {n}… feeling better today?", "I missed you, {n}. Are you in a better mood?"]],
    cMemTried: ["plain", ["Did you try «{p}», the place I suggested?", "{n}, did you go to «{p}»?"]],
    cTriedYes: ["joy", ["Great! Glad my tip helped.", "Nice! Ask me whenever you want another place.", "That's what I like to hear!"]],
    cTriedNo: ["plain", ["No problem, it's still there. Want another suggestion?", "Maybe later then. Shall I suggest something else?"]],
    cMemLikeAgain: ["plain", ["Hi {n}! Still a fan of {f}?", "I remembered that you like {f}, {n}!"]],
    buddyReply: ["joy", ["I agree with him!", "Me too, {n}!", "Well said, {n}."]],
    sing: ["calm", ["A calm song for you.", "Let me sing a little.", "Relax and listen.", "A tune to settle down.", "I sing when I'm relaxed.", "A little song before a nap.", "This is my favourite tune."]],
    singEnd: ["calm", ["That's the end of the song.", "I hope it relaxed you.", "Thanks for listening.", "A short one.", "I'll sing for you again later."]]
  };
  var MOODS = EN ? MOODS_EN : MOODS_AR, LINES = EN ? LINES_EN : LINES_AR;
  var recent = [];
  function line(ev, vars) {
    var e = LINES[ev], m = MOODS[e[0]], s, tries = 0;
    // the mood's little openers/closers («رائع!»، «يومي صار أجمل.») season a line now and then, not every line
    do { var pre = Math.random() < .3 ? pick(m.pre) : "", core = pick(e[1]), post = Math.random() < .2 ? pick(m.post) : ""; if (post && recent.some(function (x) { return x.slice(-post.length) === post; })) post = "";
      if (EN && /, $/.test(pre) && !/^I[ ']/.test(core)) core = core.charAt(0).toLowerCase() + core.slice(1); s = pre + core + post; } while (recent.indexOf(s) >= 0 && ++tries < 25);
    recent.push(s); if (recent.length > 80) recent.shift();
    for (var k in vars || {}) s = s.split("{" + k + "}").join(vars[k]);
    return s;
  }
  var sp = {
    sx: spring(1, .18, .7), sy: spring(1, .18, .7), tilt: spring(0, .1, .75), spin: spring(0, .05, .82),
    lx: spring(0, .15, .7), ly: spring(0, .15, .7), ey: spring(0, .15, .7),
    erx: spring(6.4, .2, .65), ery: spring(9.1, .2, .65),
    mrx: spring(4.3, .2, .65), mry: spring(5.7, .2, .65), mx: spring(0, .12, .75)
  };
  var mood = { joy: .2, startle: 0, dizzy: 0, annoy: 0, sleepy: 0, shy: 0, tickle: 0, curious: 0, fear: 0, sad: 0, love: 0, conf: 0, heart: 0 };
  var FK = null, hbPulse = 0, lastDraw = 0;  // Dilmo's face kit (made at start), his heartbeat pulse
  var W = 0, ground = 0, pos = { x: 0, y: 0, vx: 0, vy: 0 };
  var ptr = { x: 0, y: 0, has: false, out: false }, drag = null;
  var t0 = performance.now(), last = t0, lastInput = t0, running = false, raf = 0;
  var gaze = { x: 0, y: 0, until: 0 }, nextIdle = t0 + 3000, nextBlink = t0 + 2500, blinkAt = -1e4;
  var rubSign = 0, rubTimes = [], pokes = [], typing = -1e4, side = 1, lastSay = {}, hiddenAt = 0, lastScroll = scrollY;

  // soft body: N rim points on springs, drawn as a smooth closed curve
  var bodyPath = orb.querySelector(".pbody"), grainPath = orb.querySelector(".pgrain");
  var N = 48, pts = [], cheek = null, wink = [-1e4, -1e4], mouthAt = -1e4;
  for (var q = 0; q < N; q++) pts.push({ a: q / N * Math.PI * 2, x: 0, y: 0, vx: 0, vy: 0 });
  mood.calm = 0; mood.pinch = 0; mood.hungry = 0; mood.friend = 0; mood.listen = 0;
  var talkUntil = 0, eatUntil = 0, meals = [], foodDrag = null, stick = null, chaseT = 0, greeted = false;
  // remembers visits + friendship in this browser only
  var store = { visits: 0, friend: 0 };
  try { store = Object.assign(store, JSON.parse(localStorage.getItem("hk-dilmo") || "{}")); store.visits++; localStorage.setItem("hk-dilmo", JSON.stringify(store)); } catch { store.visits = 1; }
  mood.friend = store.friend;
  function befriend(n) {
    mood.friend = clamp(mood.friend + n, 0, 1); store.friend = mood.friend;
    if (mood.friend >= .5) unlockFriend();
    try { localStorage.setItem("hk-dilmo", JSON.stringify(store)); } catch { /* private window: forget */ }
  }
  // sound: tiny synthesized blips (Web Audio), nothing downloaded; starts only after the first touch or key
  var echo = null, ac = null, master = null, soundOn = true, unlocked = false, lastSfx = {}, nextSnore = 0;
  function unlock() {
    if (unlocked) return; unlocked = true;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = .3; master.connect(ac.destination);
      // soft echo for the melodic notes
      echo = ac.createDelay(1); echo.delayTime.value = .28;
      var fb = ac.createGain(), lp = ac.createBiquadFilter(), wet = ac.createGain();
      fb.gain.value = .3; lp.type = "lowpass"; lp.frequency.value = 1800; wet.gain.value = .3;
      echo.connect(lp); lp.connect(fb); fb.connect(echo); lp.connect(wet); wet.connect(master);
    } catch { ac = null; }
  }
  addEventListener("pointerdown", unlock, true);
  addEventListener("keydown", unlock, true);
  function tone(f0, f1, dur, type, vol, delay) {
    if (!ac || !soundOn) return;
    var t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(f1, 30), t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .03);
  }
  function hiss(dur, vol, freq, delay) {
    if (!ac || !soundOn) return;
    var t = ac.currentTime + (delay || 0), n = Math.ceil(ac.sampleRate * dur), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    var s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = buf; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = 1.2;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + .02);
  }
  function sfx(name, v) {
    var now = performance.now();
    if (now - (lastSfx[name] || 0) < (name === "squeak" ? 70 : 120)) return;
    lastSfx[name] = now;
    if (name === "pop") tone(480, 920, .09, "sine", .35);
    else if (name === "boing") tone(150 + v * 5, 80, .22, "sine", Math.min(.4, .08 + v * .015));
    else if (name === "squeak") tone(420 + v * 520, 460 + v * 560, .06, "triangle", .06);
    else if (name === "snap") { tone(300, 760, .1, "sine", .3); tone(760, 520, .12, "sine", .15, .08); }
    else if (name === "whoosh") hiss(.35, .18, 1400);
    else if (name === "splat") { hiss(.12, .3, 500); tone(150, 70, .16, "sine", .3); }
    else if (name === "munch") { for (var i = 0; i < 3; i++) hiss(.06, .25, 900 + i * 150, i * .2); }
    else if (name === "beat") { tone(62, 48, .09, "sine", .05 + .07 * (v || 0)); tone(58, 44, .08, "sine", .03 + .05 * (v || 0), .16); }  // lub-dub
    else if (name === "snore") { tone(110, 90, 1.1, "sine", .05); hiss(1, .03, 300, .1); }
  }
  // speech: the line is split into rough syllables, each with a vowel shape read from the letters
  // (ا → aa open, و → oo round, ي → ee wide, else a short a). The chirps and the mouth both follow it.
  var speech = null, SYL = 115;
  var MOUTH = { aa: [1.4, .3], oo: [.9, -.3], ee: [.6, .35], a: [.9, .15] };  // [extra height, extra width] at full open
  function syllables(text) {
    if (EN) {  // English: one syllable per vowel group, shaped by its first vowel
      return (text.toLowerCase().match(/[aeiouy]+/g) || []).slice(0, 12).map(function (v) { return { v: /[ou]/.test(v[0]) ? "oo" : /[eiy]/.test(v[0]) ? "ee" : "aa" }; });
    }
    var out = [], cur = null;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (/\s/.test(ch)) cur = null;
      else if (/[اآأإى]/.test(ch)) { if (cur) cur.v = "aa"; }
      else if (ch === "و" && cur && cur.v === "a") cur.v = "oo";
      else if (ch === "ي" && cur && cur.v === "a") cur.v = "ee";
      else if (/[ء-ي]/.test(ch)) { cur = { v: "a" }; out.push(cur); }
    }
    return out.slice(0, 12);
  }
  // one chirp per syllable; pitch follows the vowel and the mood, and rises at the end of a question
  function babble(sy, q) {
    var base = 430 + 220 * Math.max(mood.joy, 0) + 160 * mood.startle - 140 * mood.annoy - 160 * mood.sleepy;
    sy.forEach(function (s, i) {
      var last = q && i === sy.length - 1, f = base * (s.v === "ee" ? 1.15 : s.v === "oo" ? .88 : s.v === "aa" ? 1.05 : 1) * (last ? 1.2 : 1);
      tone(f, f * (last ? 1.2 : .94), .09, "triangle", .07, i * SYL / 1000);
    });
  }
  var singAt = -1e4;
  function noteFx() {
    if (reduce) return;
    var s = document.createElement("span");
    s.className = "note-fx"; s.textContent = "♪"; s.setAttribute("aria-hidden", "true");
    s.style.setProperty("--x", (pos.x - 6 + (Math.random() - .5) * 30).toFixed(1) + "px");
    s.style.setProperty("--y", (pos.y - R - 10).toFixed(1) + "px");
    s.style.setProperty("--dx", ((Math.random() - .5) * 40).toFixed(1) + "px");
    world.appendChild(s); s.addEventListener("animationend", function () { s.remove(); });
  }
  // singing: a soft digital voice (triangle + vibrato through vowel formants) gliding through slow lullaby phrases in C major
  var song = null, nextSong = performance.now() + 60000;  // he sings on his own only after a while (you can still ask: «غنّ»)
  // songbook: [scale degree, beats]; degree 0 = C4, 7 = C5, negatives go below C4 (C major)
  // public-domain children's melodies + originals; when the list runs out he improvises new ones forever
  var MAJ = [0, 2, 4, 5, 7, 9, 11];
  function cents(i) { var o = Math.floor(i / 7), d = ((i % 7) + 7) % 7; return (o * 12 + MAJ[d]) * 100; }
  var SONGBOOK = [
    { name: T("تلألأ يا نجم صغير", "Twinkle, Twinkle, Little Star"), beat: .42, n: [[0, 1], [0, 1], [4, 1], [4, 1], [5, 1], [5, 1], [4, 2], [3, 1], [3, 1], [2, 1], [2, 1], [1, 1], [1, 1], [0, 2]] },
    { name: T("تهويدة برامز", "Brahms' Lullaby"), beat: .38, n: [[2, 1], [2, 1], [4, 3], [2, 1], [2, 1], [4, 3], [2, 1], [4, 1], [7, 2], [6, 2], [5, 2], [5, 2], [4, 2], [1, 1], [2, 1], [3, 2], [1, 2], [1, 1], [2, 1], [3, 4]] },
    { name: T("الأخ جاك", "Frère Jacques"), beat: .4, n: [[0, 1], [1, 1], [2, 1], [0, 1], [0, 1], [1, 1], [2, 1], [0, 1], [2, 1], [3, 1], [4, 2], [2, 1], [3, 1], [4, 2], [4, .5], [5, .5], [4, .5], [3, .5], [2, 1], [0, 1], [4, .5], [5, .5], [4, .5], [3, .5], [2, 1], [0, 1], [0, 1], [-3, 1], [0, 2]] },
    { name: T("نشيد الفرح", "Ode to Joy"), beat: .4, n: [[2, 1], [2, 1], [3, 1], [4, 1], [4, 1], [3, 1], [2, 1], [1, 1], [0, 1], [0, 1], [1, 1], [2, 1], [2, 1.5], [1, .5], [1, 2], [2, 1], [2, 1], [3, 1], [4, 1], [4, 1], [3, 1], [2, 1], [1, 1], [0, 1], [0, 1], [1, 1], [2, 1], [1, 1.5], [0, .5], [0, 2]] },
    { name: T("ماري وحَمَلها الصغير", "Mary Had a Little Lamb"), beat: .4, n: [[2, 1], [1, 1], [0, 1], [1, 1], [2, 1], [2, 1], [2, 2], [1, 1], [1, 1], [1, 2], [2, 1], [4, 1], [4, 2], [2, 1], [1, 1], [0, 1], [1, 1], [2, 1], [2, 1], [2, 1], [2, 1], [1, 1], [1, 1], [2, 1], [1, 1], [0, 4]] },
    { name: T("نم يا صغيري", "Hush, Little Baby"), beat: .42, n: [[4, 1], [2, 1], [2, 1], [2, 1], [3, 1], [2, 1], [1, 2], [1, 1], [1, 1], [1, 1], [2, 1], [1, 1], [0, 2], [4, 1], [2, 1], [2, 1], [3, 1], [2, 1], [1, 1], [0, 3]] },
    { name: T("جدِّف بقاربك", "Row, Row, Row Your Boat"), beat: .42, n: [[0, 1], [0, 1], [0, .75], [1, .25], [2, 1], [2, .75], [1, .25], [2, .75], [3, .25], [4, 2], [7, .33], [7, .33], [7, .34], [4, .33], [4, .33], [4, .34], [2, .33], [2, .33], [2, .34], [0, .33], [0, .33], [0, .34], [4, .75], [3, .25], [2, .75], [1, .25], [0, 2]] },
    { name: T("نسمة المساء", "Evening Breeze"), beat: .4, n: [[0, 2], [2, 1], [4, 1], [3, 2], [2, 2], [1, 1], [2, 1], [0, 4]] },
    { name: T("قمر هادئ", "Quiet Moon"), beat: .4, n: [[4, 2], [5, 1], [4, 1], [2, 2], [3, 1], [2, 1], [1, 2], [0, 4]] },
    { name: T("غيمة صغيرة", "Little Cloud"), beat: .4, n: [[2, 1], [3, 1], [4, 2], [4, 1], [5, 1], [4, 2], [2, 2], [3, 1], [1, 1], [0, 4]] },
    { name: T("خطوات ناعمة", "Soft Steps"), beat: .4, n: [[0, 1], [1, 1], [2, 2], [0, 1], [1, 1], [2, 2], [4, 2], [3, 1], [2, 1], [0, 4]] },
    { name: T("ضوء الشمعة", "Candlelight"), beat: .4, n: [[7, 2], [5, 1], [4, 1], [5, 2], [4, 1], [2, 1], [3, 2], [1, 2], [0, 4]] },
    { name: T("نجمة تغفو", "Sleepy Star"), beat: .4, n: [[4, 2], [2, 1], [3, 1], [4, 2], [7, 2], [6, 1], [5, 1], [4, 2], [2, 2], [3, 1], [1, 1], [0, 4]] },
    { name: T("مطر خفيف", "Light Rain"), beat: .4, n: [[0, .5], [2, .5], [4, 1], [2, .5], [4, .5], [7, 1], [5, 1], [4, 1], [3, 1], [2, 1], [1, 2], [0, .5], [2, .5], [1, 1], [0, 3]] }
  ];
  // improvised tune: two calm stepwise phrases, the first resting on G, the second on C
  function improvise() {
    var n = [], d = 0;
    for (var ph = 0; ph < 2; ph++) {
      for (var beats = 0; beats < 7;) {
        d = clamp(d + pick([-2, -1, -1, 0, 1, 1, 2]), -1, 7);
        var du = pick([1, 1, 1, 2, .5]); n.push([d, du]); beats += du;
      }
      d = ph ? 0 : 4; n.push([d, ph ? 4 : 2]);
    }
    return { name: T("ارتجال جديد", "A new improvisation"), beat: .4, n: n };
  }
  var songQueue = [];
  function nextTune() {
    if (!songQueue.length) {  // shuffled pass through the whole book, then one improvisation
      songQueue = SONGBOOK.map(function (_, i) { return i; }).sort(function () { return Math.random() - .5; });
      songQueue.push("imp");
    }
    var q = songQueue.shift();
    return q === "imp" ? improvise() : SONGBOOK[q];
  }
  var VOWELS = { oo: [550, 900], aa: [850, 1300], ee: [600, 2300] };
  function sing() {
    if (song || mainAway) return;
    var tune = nextTune(), beat = tune.beat, at = 0, notes = [];
    tune.n.forEach(function (n, k) { notes.push({ i: n[0], start: at, dur: n[1] * beat, v: k % 3 === 2 ? "aa" : k % 2 ? "ee" : "oo" }); at += n[1] * beat; });
    song = { t0: performance.now() + 400, notes: notes, len: at, cur: -1 };
    talkUntil = song.t0 + at * 1000;
    buddies.forEach(function (b) { b.next = 0; });  // friends come over to sing along
    quietSay(line("sing") + " ♪ " + tune.name, song.t0 + at * 1000 - 700);
    if (!ac || !soundOn) return;
    var T = ac.currentTime + .4, o = ac.createOscillator(), sh = ac.createOscillator(), lfo = ac.createOscillator();
    var lg = ac.createGain(), shg = ac.createGain(), dry = ac.createGain(), mix = ac.createGain(), env = ac.createGain();
    var f1 = ac.createBiquadFilter(), f2 = ac.createBiquadFilter();
    o.type = "triangle"; sh.type = "sine"; shg.gain.value = .06; dry.gain.value = .25; mix.gain.value = 1.6;
    f1.type = f2.type = "bandpass"; f1.Q.value = 3; f2.Q.value = 5;
    lfo.frequency.value = 5.2; lg.gain.value = 0; lfo.connect(lg); lg.connect(o.frequency);
    o.connect(f1); o.connect(f2); o.connect(dry); f1.connect(mix); f2.connect(mix); dry.connect(mix); sh.connect(shg); shg.connect(mix);
    mix.connect(env); env.connect(master); if (echo) env.connect(echo);
    env.gain.setValueAtTime(.0001, T);
    notes.forEach(function (n, k) {
      var f = 261.63 * Math.pow(2, cents(n.i) / 1200), s = T + n.start, e = s + n.dur, vw = VOWELS[n.v];
      if (k === 0) { o.frequency.setValueAtTime(f, s); sh.frequency.setValueAtTime(f * 2, s); }
      else { o.frequency.setTargetAtTime(f, s - .03, .04); sh.frequency.setTargetAtTime(f * 2, s - .03, .04); }  // little glide
      f1.frequency.setTargetAtTime(vw[0], s, .03); f2.frequency.setTargetAtTime(vw[1], s, .03);
      env.gain.setTargetAtTime(.26, s, .035); env.gain.setTargetAtTime(.0001, e - .09, .03);
      lg.gain.setTargetAtTime(0, s, .01); lg.gain.setTargetAtTime(f * .012, s + .15, .1);  // vibrato blooms on held notes
    });
    var oscs = [o, sh, lfo];
    // friends hum along in harmony, each on its own interval (third above, sixth below, fifth above)
    buddies.forEach(function (b) {
      var bo = ac.createOscillator(), bg = ac.createGain();
      bo.type = "sine"; bg.gain.setValueAtTime(.0001, T); bo.connect(bg); bg.connect(master); if (echo) bg.connect(echo);
      notes.forEach(function (n, k) {
        var f = 261.63 * Math.pow(2, cents(n.i + b.f.harm) / 1200), s = T + n.start;
        if (k === 0) bo.frequency.setValueAtTime(f, s); else bo.frequency.setTargetAtTime(f, s - .03, .04);
        bg.gain.setTargetAtTime(.07, s, .04); bg.gain.setTargetAtTime(.0001, s + n.dur - .09, .03);
      });
      oscs.push(bo);
    });
    oscs.forEach(function (x) { x.start(T); x.stop(T + at + .4); });
    song.nodes = { env: env, oscs: oscs };
  }
  function stopSong() {
    if (!song) return;
    if (song.nodes) {
      var T = ac.currentTime; song.nodes.env.gain.cancelScheduledValues(T); song.nodes.env.gain.setTargetAtTime(.0001, T, .05);
      song.nodes.oscs.forEach(function (o) { try { o.stop(T + .3); } catch { /* already stopping */ } });
    }
    song = null; talkUntil = 0; nextSong = performance.now() + 30000; bub.hidden = true;
  }
  // secret ways to make him sing (deliberately not explained on the page):
  // pet him until fully calm, rock him gently while holding him, circle him twice with the pointer,
  // or type «غني» / "sing"
  var typed = "", circ = { sum: 0, last: null, t: 0 };
  addEventListener("keydown", function (e) {
    if (e.key.length !== 1) return;
    typed = (typed + e.key).slice(-8);
    if (/(غني|غنّي|sing)$/i.test(typed) && !song) { typed = ""; sing(); }
  });
  function songNote(t) {
    var se = (t - song.t0) / 1000;
    for (var k = 0; k < song.notes.length; k++) { var n = song.notes[k]; if (se >= n.start && se < n.start + n.dur) return { n: n, k: k, p: (se - n.start) / n.dur }; }
    return null;
  }
  document.getElementById("snd").addEventListener("click", function () {
    soundOn = !soundOn; this.setAttribute("aria-pressed", String(soundOn));
    this.textContent = soundOn ? T("الصوت: يعمل", "Sound: on") : T("الصوت: متوقّف", "Sound: off");
    if (soundOn) sfx("pop"); else stopSong();
  });
  // «الكلام: متوقّف»: nobody talks and no text bubbles appear; faces, play and sounds stay
  var quiet = !!store.quiet, talkBtn = document.getElementById("talk"), root = stage.closest(".dilmo") || document.body;
  function applyQuiet() {
    talkBtn.setAttribute("aria-pressed", String(!quiet)); talkBtn.textContent = quiet ? T("الكلام: متوقّف", "Talking: off") : T("الكلام: يعمل", "Talking: on");
    root.classList.toggle("chat-off", quiet);
    if (quiet) { bub.hidden = true; buddies.forEach(function (b) { b.bub.hidden = true; }); talkUntil = 0; }
  }
  talkBtn.addEventListener("click", function () { quiet = !quiet; store.quiet = quiet; saveStore(); applyQuiet(); });
  function quietSay(text, t) { if (quiet || keepBub(performance.now())) return; bub.textContent = text; bub.hidden = false; bub.dataset.until = t + 700; bub._since = performance.now(); }
  function foodCenter() {
    var r = foodDrag.el.getBoundingClientRect();
    return toStage({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
  }
  function adiff(a, b) { var d = a - b; return Math.atan2(Math.sin(d), Math.cos(d)); }
  function local(px, py) {
    var dx = px - pos.x, dy = py - pos.y, r = -(sp.spin.v + sp.tilt.v) * Math.PI / 180;
    return { x: dx * Math.cos(r) - dy * Math.sin(r), y: dx * Math.sin(r) + dy * Math.cos(r) };
  }
  function newRim() { var a = []; for (var q = 0; q < N; q++) a.push({ a: q / N * Math.PI * 2, x: 0, y: 0, vx: 0, vy: 0 }); return a; }
  function dent(lx, ly, amt, P) {
    var a = Math.atan2(ly, lx);
    (P || pts).forEach(function (p) { var w = Math.exp(-Math.pow(adiff(p.a, a), 2) / .3); p.vx -= Math.cos(p.a) * amt * w; p.vy -= Math.sin(p.a) * amt * w; });
  }
  function softStep(t, dt) {
    var reachA = 0, reachAmt = 0;
    var tp = foodDrag ? foodCenter() : (!drag && ptr.has && !ptr.out && mood.sleepy < .6 && t - ptr.moveT > 300 ? ptr : null);
    if (tp) {
      var d = Math.hypot(tp.x - pos.x, tp.y - pos.y), lim = foodDrag ? 140 : 80;
      if (d > R + 4 && d < R + lim) { var l = local(tp.x, tp.y); reachA = Math.atan2(l.y, l.x); reachAmt = (1 - (d - R) / lim) * (foodDrag ? 16 : 12); }
    }
    rim(pts, dt, cheek, reachA, reachAmt);
  }
  // each rim point springs toward where the cheek pull (or a reach toward food) wants it, then relaxes toward its neighbours
  function rim(P, dt, cheek, reachA, reachAmt) {
    P.forEach(function (p) {
      var tx = 0, ty = 0, w;
      if (cheek) { w = .3 + .7 * Math.exp(-Math.pow(adiff(p.a, cheek.a), 2) / .9); tx = cheek.px * w; ty = cheek.py * w; }
      else if (reachAmt) { w = Math.exp(-Math.pow(adiff(p.a, reachA), 2) / .2); tx = Math.cos(p.a) * reachAmt * w; ty = Math.sin(p.a) * reachAmt * w; }
      p.vx = p.vx * Math.pow(.8, dt) + (tx - p.x) * .22 * dt; p.x += p.vx * dt;
      p.vy = p.vy * Math.pow(.8, dt) + (ty - p.y) * .22 * dt; p.y += p.vy * dt;
    });
    // relax each rim point toward its neighbours so no corner ever forms
    var ox = P.map(function (p) { return p.x; }), oy = P.map(function (p) { return p.y; });
    P.forEach(function (p, i) {
      var a = (i - 1 + N) % N, b = (i + 1) % N;
      p.x = .5 * ox[i] + .25 * (ox[a] + ox[b]); p.y = .5 * oy[i] + .25 * (oy[a] + oy[b]);
    });
  }
  function pathD(rimPts, rr) {
    rr = rr || R;
    var P = (rimPts || pts).map(function (p) { return [Math.cos(p.a) * rr + p.x, Math.sin(p.a) * rr + p.y]; });
    var s = "M" + P[0][0].toFixed(2) + " " + P[0][1].toFixed(2);
    for (var i = 0; i < N; i++) {
      var p0 = P[(i - 1 + N) % N], p1 = P[i], p2 = P[(i + 1) % N], p3 = P[(i + 2) % N];
      s += "C" + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(2) + " " + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(2) + " " +
        (p2[0] - (p3[0] - p1[0]) / 6).toFixed(2) + " " + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(2) + " " + p2[0].toFixed(2) + " " + p2[1].toFixed(2);
    }
    return s + "Z";
  }

  function measure() {
    // small stages scale the whole world down (K), so the characters keep room to move; physics stays in world px
    var w = stage.clientWidth, h = stage.clientHeight;
    K = clamp(Math.min(w / 600, h / 440), .55, 1); world.style.setProperty("--k", K);
    G = clamp(h * .13, 30, 96);  // the ground band at the bottom, in screen px
    W = w / K; ground = (h - G) / K - R;
    if (!pos.x) { pos.x = W / 2; pos.y = ground; }
    pos.x = clamp(pos.x, R, W - R); pos.y = Math.min(pos.y, ground);
  }
  // client px → world px: divides out both the world scale (K) and the page zoom on wide screens (--page-zoom)
  function toStage(e) { var r = world.getBoundingClientRect(), z = r.width / world.offsetWidth || 1; return { x: (e.clientX - r.left) / z, y: (e.clientY - r.top) / z }; }
  function say(text, key, gap) {
    var t = performance.now();
    if (quiet || (key !== "pchat" && keepBub(t))) return;  // his answer to you stays readable; bumps and chatter wait
    if (key) { if (lastSay[key] && t - lastSay[key] < (gap || 4000)) return; lastSay[key] = t; }
    if (mainAway) { var fr = others(); if (fr.length) bsay(pick(fr), text); return; }  // he left: a friend speaks instead
    bub.classList.remove("link"); bub.removeAttribute("title");
    bub.textContent = text; bub.hidden = false; bub.dataset.until = t + clamp(text.length * 65, 1900, 7000); bub._since = t;
    bub._keep = key === "pchat" ? +bub.dataset.until : 0;
    if (text !== "Zzz…") {
      var sy = syllables(text), q = /[؟?]\s*$/.test(text);
      speech = { t0: t, syl: sy }; talkUntil = t + sy.length * SYL + 150; babble(sy, q);
    }
  }
  function keepBub(t) { return !bub.hidden && bub._keep && t < bub._keep; }
  function stir() {
    lastInput = performance.now();
    if (mood.sleepy > .6) { mood.sleepy = 0; mood.startle = 1; pos.vy = -9; bub.hidden = true; say(line("wake"), "wake", 3000); }
    else mood.sleepy = Math.max(0, mood.sleepy - .3);
  }
  function poke(lx, ly) {
    var t = performance.now(), fx = sp.lx.v * 7, fy = sp.ly.v * 5;
    for (var i = 0; i < 2; i++) {
      if (Math.hypot(lx - (i ? 15 : -15) - fx, ly + 4 - fy) < 11) { wink[i] = t; mood.annoy = Math.min(1, mood.annoy + .1); say(line("eye"), "eye", 2500); return; }
    }
    if (Math.hypot(lx - fx, ly - 18 - fy) < 8) { mouthAt = t; say(line("mouth"), "mouth", 2500); return; }
    dent(lx, ly, 10); sfx("pop");
    pokes = pokes.filter(function (x) { return t - x < 2500; }); pokes.push(t);
    sp.sy.vel -= .25; sp.sx.vel += .2;
    if (pokes.length >= 5) {
      side = ptr.x < pos.x ? 1 : -1;
      mood.annoy = 1; mood.joy = Math.max(-.5, mood.joy - .4); pos.vx = side * 9; pos.vy = -8; befriend(-.08);
      say(line("annoy"), "annoy", 3000);
    } else {
      mood.joy = Math.min(1, mood.joy + .3); pos.vy = -6;
      if (pokes.length === 1) say(line("poke"), "poke", 1500);
    }
  }
  function idleAct(idle) {
    var r = Math.random(), t = performance.now();
    if (r < .12 && !hs && t > hsNext && !isNight) { startHideSeek(t); return; }
    if (idle > 20000) say(line("bored"), "bored", 25000);
    if (r < .35) gaze = { x: Math.random() * 2 - 1, y: Math.random() * 1.2 - .7, until: t + 900 + Math.random() * 1400 };
    else if (r < .55 && !reduce) pos.vy = -4 - Math.random() * 4;
    else if (r < .7 && !reduce) { var hd = roomSide(pos.x, R); if (hd) { pos.vx = hd * (2 + Math.random() * 3); pos.vy = -3; } }  // a little hop, toward the side with room
    else if (r < .85 && others().length) {  // glances at one of his friends
      var o = pick(others()), dx = o.x - pos.x, dy = o.y - pos.y, d = Math.hypot(dx, dy) || 1;
      gaze = { x: dx / d, y: dy / d, until: t + 1600 };
    } else if (idle > 25000 && t > nextSong) sing(); else if (idle > 12000) say(line("hum"), "hum", 15000);
  }

  addEventListener("pointermove", function (e) {
    var p = toStage(e), dx = p.x - ptr.x, speed = ptr.has ? Math.hypot(dx, p.y - ptr.y) : 0;
    ptr.x = p.x; ptr.y = p.y; ptr.has = true; ptr.out = false; ptr.moveT = performance.now();
    if (!running) return;
    stir();
    if (foodDrag) return;
    var d = Math.hypot(p.x - pos.x, p.y - pos.y), now = performance.now();
    if (!drag && d > R + 10 && d < R + 100) {  // circling him
      var ang = Math.atan2(p.y - pos.y, p.x - pos.x);
      circ.sum = circ.last != null && now - circ.t < 600 ? circ.sum + adiff(ang, circ.last) : 0;
      circ.last = ang; circ.t = now;
      if (Math.abs(circ.sum) > Math.PI * 4 && !song) { circ.sum = 0; sing(); }
    } else { circ.last = null; circ.sum = 0; }
    if (!drag && d < 170 && speed > 45) { mood.startle = Math.min(1, mood.startle + .7); feel(mood, "fear", .4); mood.heart = Math.min(1, mood.heart + .3); say(line("startle"), "startle", 6000); }
    if (drag && cheek) {
      var l = local(p.x, p.y), cx = l.x - cheek.gx, cy = l.y - cheek.gy, len = Math.hypot(cx, cy) || 1;
      if (len > 110) {  // pulled too far: the cheek slips out of your fingers and springs back (grab his middle to carry him)
        cheek = null; mood.pinch = 0; drag.slipped = true; sfx("snap"); sp.sx.vel += .06; sp.sy.vel -= .05; say(line("slip"), "slip", 3000);
      }
      else {
        var k = 34 * Math.tanh(len / 45) / len; cheek.px = cx * k; cheek.py = cy * k; mood.pinch = Math.min(1, len / 60); sfx("squeak", mood.pinch);
        if (len > 14) say(line(cheek.side ? "cheek" : "stretch"), "pinch", 3500);
      }
    } else if (drag && !drag.slipped) {
      if (!drag.moved && Math.hypot(p.x - drag.sx, p.y - drag.sy) > 6) { drag.moved = true; mood.shy = 0; say(line("lift"), "lift", 5000); }
      if (drag.moved) {
        var nx = clamp(p.x - drag.ox, R, W - R), ny = clamp(p.y - drag.oy, R, ground);
        drag.vx = nx - pos.x; drag.vy = ny - pos.y; pos.x = nx; pos.y = ny;
        var sg = Math.abs(drag.vx) > 8 ? Math.sign(drag.vx) : 0;
        if (sg && sg !== drag.lastSign) { drag.lastSign = sg; drag.rev.push(now); }
        drag.rev = drag.rev.filter(function (x) { return now - x < 1000; });
        if (drag.rev.length >= 4) { mood.dizzy = Math.min(1, mood.dizzy + .05); mood.conf = Math.min(1, mood.conf + .04); mood.annoy = Math.min(1, mood.annoy + .015); say(line("shake"), "shake", 3000); }
        // rocking him slowly side to side, like a cradle
        var rs = Math.abs(drag.vx) > 1.2 && Math.abs(drag.vx) < 7 ? Math.sign(drag.vx) : 0;
        if (rs && rs !== drag.cSign) { drag.cSign = rs; drag.crad.push(now); }
        drag.crad = drag.crad.filter(function (x) { return now - x < 4000; });
        if (drag.crad.length >= 5 && !drag.rev.length && !song) { drag.crad = []; sing(); }
      }
    } else if (d < R) {
      var lp = local(p.x, p.y);
      if (lp.y < -8 && speed > .5 && speed < 9) { mood.calm = Math.min(1, mood.calm + .02); mood.love = Math.min(1, mood.love + .006); if (mood.calm > .5) feel(mood, "shy", .35); befriend(.003); if (mood.calm > .9 && !song && performance.now() > nextSong) sing(); else if (mood.calm > .6 && !song) say(line("pet"), "pet", 6000); }
      var s = Math.sign(dx);
      if (s && s !== rubSign) { rubSign = s; rubTimes.push(now); }
      rubTimes = rubTimes.filter(function (t) { return now - t < 900; });
      if (rubTimes.length >= 5) { mood.tickle = 1; mood.joy = Math.min(1, mood.joy + .04); befriend(.002); say(line("tickle"), "tickle", 3000); }
    }
    buddies.forEach(function (b) {
      if (b.drag || Math.hypot(p.x - b.x, p.y - b.y) > b.f.r) return;
      var s2 = Math.sign(dx);
      if (s2 && s2 !== b.rubSign) { b.rubSign = s2; b.rubs = (b.rubs || []).filter(function (x) { return now - x < 900; }); b.rubs.push(now); }
      if ((b.rubs || []).length >= 5) {
        b.rubs = []; b.joy = 1; b.tickleUntil = now + 900;
        if (!b.f.player && now - (b.tickAt || 0) > 3000) { b.tickAt = now; bsay(b, line("tickle")); if (!b.f.player) bfAdd(b, .01); }
      } else if (p.y < b.y - b.f.r * .3 && speed > .5 && speed < 9 && ++b.petN > 40) {  // slow strokes on the top of the head
        b.petN = 0; b.joy = Math.min(1, b.joy + .3); feel(b.em, "love", .55); feel(b.em, "shy", .4);
        if (!b.f.player && now - (b.petAt || 0) > 6000) { b.petAt = now; bsay(b, line("pet")); bfAdd(b, .01); }
      }
    });
  }, { passive: true });
  orb.addEventListener("pointerdown", function (e) {
    var p = toStage(e); stir(); stick = null;
    drag = { sx: p.x, sy: p.y, ox: p.x - pos.x, oy: p.y - pos.y, t: performance.now(), moved: false, shy: false, vx: 0, vy: 0, rev: [], lastSign: 0, crad: [], cSign: 0 };
    var l = local(p.x, p.y); drag.lx = l.x; drag.ly = l.y;
    cheek = Math.hypot(l.x, l.y) > R * .6 ? { a: Math.atan2(l.y, l.x), gx: l.x, gy: l.y, px: 0, py: 0, side: Math.abs(l.x) > Math.abs(l.y) } : null;
    orb.setPointerCapture(e.pointerId); e.preventDefault();
  });
  function release() {
    if (!drag) return;
    var d = drag; drag = null;
    if (cheek) {
      var pulled = Math.hypot(cheek.px, cheek.py); cheek = null; mood.pinch = 0;
      if (pulled > 8) { mood.joy = Math.min(1, mood.joy + .2); sfx("snap"); return; }
    }
    if (d.moved) {
      pos.vx = clamp(d.vx, -45, 45); pos.vy = clamp(d.vy, -45, 45);
      var s = Math.hypot(pos.vx, pos.vy);
      if (s > 20) { mood.dizzy = Math.min(1, mood.dizzy + s / 60); feel(mood, "fear", Math.min(1, s / 40)); mood.heart = Math.min(1, mood.heart + .5); sfx("whoosh"); say(line("throw"), "throw", 2500); }
    } else if (d.shy) { mood.shy = 0; pos.vy = -7; sp.sy.vel += .15; say(line("unshy"), "unshy", 4000); }
    else if (performance.now() - d.t < 300) poke(d.lx, d.ly);
  }
  orb.addEventListener("pointerup", release);
  orb.addEventListener("pointercancel", release);
  orb.addEventListener("dblclick", function () { sp.spin.t += 360; mood.joy = 1; feel(mood, "conf", .7); pos.vy = -12; say(line("spin"), "spin", 2000); });

  // feeding: drag a food chip into his mouth
  var foods = document.getElementById("foods");
  foods.addEventListener("pointerdown", function (e) {
    var el = e.target.closest(".food"); if (!el || el.style.opacity === "0") return;
    stir(); e.preventDefault(); el.setPointerCapture(e.pointerId); el.classList.add("dragging");
    foodDrag = { el: el, sx: e.clientX, sy: e.clientY };
  });
  foods.addEventListener("pointermove", function (e) {
    if (!foodDrag) return;
    var z = stage.getBoundingClientRect().width / stage.offsetWidth || 1;
    foodDrag.el.style.transform = "translate(" + (e.clientX - foodDrag.sx) / z + "px," + (e.clientY - foodDrag.sy) / z + "px)";
  });
  function dropFood() {
    if (!foodDrag) return;
    var c = foodCenter(), el = foodDrag.el; foodDrag = null; el.classList.remove("dragging");
    var friend = null;  // any friend can be fed too; each has a favourite
    buddies.forEach(function (b) { if (!b.f.player && Math.hypot(c.x - b.x, c.y - b.y) < b.f.r + 16) friend = b; });
    if (!mainAway && Math.hypot(c.x - pos.x, c.y - pos.y) < R + 14 && mood.sleepy < .85) eat(el);
    else if (friend) feedBuddy(friend, el);
    else el.style.transform = "";
  }
  foods.addEventListener("pointerup", dropFood);
  foods.addEventListener("pointercancel", dropFood);
  function eat(el) {
    var t = performance.now();
    meals = meals.filter(function (x) { return t - x < 25000; });
    el.style.transform = "";
    if (meals.length >= 3) {
      mood.annoy = Math.min(1, mood.annoy + .3); gaze = { x: 1, y: -.3, until: t + 1500 };
      say(line("full"), "full", 3000); return;
    }
    meals.push(t); eatUntil = t + 1300; sfx("munch"); mood.joy = 1; befriend(.06);
    el.style.opacity = "0"; setTimeout(function () { el.style.opacity = ""; }, 5000);
    say(line("eat", { f: el.textContent }), "eat", 1000);
    if (buddies.length) { var hb = pick(buddies); setTimeout(function () { bsay(hb, line("buddyWant")); }, 1400); }
  }
  addEventListener("scroll", function () {
    var dy = scrollY - lastScroll; lastScroll = scrollY;
    if (!running) return;
    stir();
    mood.dizzy = Math.min(1, mood.dizzy + Math.min(.06, Math.abs(dy) * .0007));
    if (mood.dizzy > .5) say(line("dizzy"), "dizzy", 5000);
  }, { passive: true });
  addEventListener("keydown", function (e) {
    if (!running || (player && /^(Arrow|Space$|Key[WASD]$)/.test(e.code)) || /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
    stir(); typing = performance.now(); sp.sy.vel -= .06;
    mood.curious = Math.min(1, mood.curious + .15); say(line("type"), "type", 8000);
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { hiddenAt = performance.now(); return; }
    if (hiddenAt && performance.now() - hiddenAt > 2500) { lastInput = performance.now(); mood.sleepy = 0; mood.joy = 1; pos.vy = -12; say(line("back"), "back", 1000); }
  });
  document.documentElement.addEventListener("mouseleave", function () {
    ptr.out = true;
    if (running) { mood.joy = Math.max(-.5, mood.joy - .15); feel(mood, "sad", .45); say(line("left"), "left", 8000); }
  });

  // ---- friends: smaller orbs with their own colour, voice and temperament ----
  var FRIENDS = [
    { id: "shams", name: T("شمس", "Shams"), c1: "#f6cf6a", c2: "#e0a82e", c3: "#a8740f", r: 30, pitch: 620, energy: 1.25, shy: false, harm: 2, fav: "karak" },
    { id: "mawja", name: T("موجة", "Mawja"), c1: "#8cc4ec", c2: "#4a90c8", c3: "#24547d", r: 26, pitch: 360, energy: .7, shy: true, harm: -3, fav: "samosa" },
    { id: "jamra", name: T("جمرة", "Jamra"), c1: "#f2a58f", c2: "#e07a5f", c3: "#9c4630", r: 28, pitch: 500, energy: 1, shy: false, harm: 4, fav: "burger" },
    // only on wide screens: a phone stage has room for three friends at most
    { id: "lulua", name: T("لؤلؤة", "Lulua"), c1: "#fbe3ec", c2: "#eaa6c0", c3: "#b0607f", r: 25, pitch: 700, energy: 1.1, shy: false, harm: 7, fav: "sweets", wide: true },
    { id: "ramla", name: T("رملة", "Ramla"), c1: "#f6e6c2", c2: "#d9b46a", c3: "#9a7634", r: 33, pitch: 300, energy: .6, shy: false, harm: -5, fav: "machboos", wide: true },
    { id: "najma", name: T("نجمة", "Najma"), c1: "#c4c8f7", c2: "#6b73d9", c3: "#3a3f91", r: 24, pitch: 760, energy: 1.4, shy: false, harm: 9, fav: "juice", wide: true },
    { id: "ghaima", name: T("غيمة", "Ghaima"), c1: "#f4f6f9", c2: "#c9d1db", c3: "#8592a3", r: 29, pitch: 420, energy: .8, shy: true, harm: -1, fav: "pizza", wide: true }
  ];
  var ABOUT = EN ? { shams: ["full of energy", "gold"], mawja: ["a little shy", "blue"], jamra: ["always up for a chase", "coral"], lulua: ["sweet and chatty", "pearl pink"],
      ramla: ["big, slow and calm", "sand"], najma: ["the fastest of us all", "night blue"], ghaima: ["quiet, I drift around", "cloud grey"] }
    : { shams: ["نشيطة جداً", "ذهبي"], mawja: ["خجولة قليلاً", "أزرق"], jamra: ["أحبّ المطاردة دائماً", "مرجاني"], lulua: ["لطيفة وأحبّ الكلام", "وردي لؤلؤي"],
      ramla: ["كبيرة وهادئة وبطيئة", "رملي"], najma: ["الأسرع بيننا", "أزرق ليلي"], ghaima: ["هادئة، أتنقّل بخفّة", "رمادي غيمي"] };
  var WIDE = false;  // decided once the stage is measured
  function friendHere(f, i) { return f.wide ? WIDE : i < 2 || thirdArrived; }
  var DIALOGS = EN ? [
    ["Tried a new restaurant today?", "Not yet. Any ideas?"], ["Lovely weather today!", "Yes, perfect for a walk."],
    ["I'm a little hungry.", "Me too! What shall we eat?"], ["Who's moving the pointer?", "That's our visitor friend."],
    ["Have you heard my new song?", "Not yet, sing it for me later."], ["Where were you? I looked for you.", "I was here waiting for visitors."],
    ["Karak or tea, which is better?", "That's a hard one!"], ["I love playing with you.", "Me too, my friend."],
    ["Race you to the wall?", "Maybe later, I'm tired."], ["Your colour looks nice today.", "Thanks! So does yours."]
  ] : [
    ["هل جرّبتَ مطعماً جديداً اليوم؟", "ليس بعد. هل تقترح شيئاً؟"], ["الجو جميل اليوم!", "نعم، مناسب للنزهة."],
    ["أنا جائع قليلاً.", "وأنا أيضاً! ماذا نأكل؟"], ["من الذي يحرّك المؤشر؟", "إنه صديقنا الزائر."],
    ["هل سمعتَ أغنيتي الجديدة؟", "ليس بعد، غنِّها لي لاحقاً."], ["أين كنت؟ بحثتُ عنك.", "كنتُ هنا أنتظر الزوّار."],
    ["هل الكرك أطيب أم الشاي؟", "سؤال صعب جداً!"], ["أحبّ اللعب معك.", "وأنا كذلك يا صديقي."],
    ["هل نتسابق إلى الجدار؟", "ربما لاحقاً، أنا متعب."], ["لونك جميل اليوم.", "شكراً! ولونك أيضاً."]
  ];
  var buddies = [], lastChat = 0, thirdArrived = false, lastBump = 0;
  function floorY(b) { return ground + R - b.f.r; }
  function anyBuddyDrag() { return buddies.some(function (b) { return b.drag && b.drag.moved; }); }
  function makeBuddy(f, x, fromEdge) {
    var S = 2 * f.r + 40, gid = "fb" + (++fbSeq), NS = "http://www.w3.org/2000/svg", r = f.r;
    var el = document.createElementNS(NS, "svg");
    el.setAttribute("viewBox", [-S / 2, -S / 2, S, S].join(" ")); el.setAttribute("class", "orb"); el.style.width = el.style.height = S + "px";
    el.setAttribute("role", "img"); el.setAttribute("aria-label", T("صديقه ", "His friend ") + f.name);
    var eye = function (sx) { return '<ellipse class="pe" cx="' + sx * r * .31 + '" cy="' + -r * .08 + '" rx="' + r * .13 + '" ry="' + r * .19 + '"/>'; };
    el.innerHTML = '<defs><radialGradient id="' + gid + '" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="' + f.c1 + '"/><stop offset=".55" stop-color="' + f.c2 + '"/><stop offset="1" stop-color="' + f.c3 + '"/></radialGradient>' +
      '</defs>' +
      '<g class="bb"><path class="bp" fill="url(#' + gid + ')" filter="url(#pg-sf)"/><path class="grain bg" transform="scale(.97)" filter="url(#pg-gn)"/>' +
      '<g class="bf">' + eye(-1) + eye(1) + '<ellipse class="pm" cy="' + r * .37 + '" rx="' + r * .09 + '" ry="' + r * .12 + '"/></g></g>';
    var sh = document.createElement("div"); sh.className = "orb-shadow"; sh.style.width = r * 1.6 + "px";
    var bb = document.createElement("p"); bb.className = "orb-say"; bb.hidden = true;
    if (f.player) { world.appendChild(sh); world.appendChild(el); }
    else { world.insertBefore(sh, orb); world.insertBefore(el, orb); }
    labels.appendChild(bb);
    var tag = document.createElement("div"); tag.className = "name-tag";
    labels.appendChild(tag);
    if (f.player) { el.setAttribute("aria-label", T("شخصيتك ", "Your character ") + f.name); el.style.zIndex = 4; }  // the visitor walks in front of the bushes
    var b = { f: f, el: el, sh: sh, bub: bb, body: el.querySelector(".bb"), face: el.querySelector(".bf"),
      x: x, y: ground + R - r - (fromEdge ? 140 : 0), vx: fromEdge ? -5 : 0, vy: 0, sx: 1, sy: 1, svx: 0, svy: 0, tilt: 0, lx: 0, ly: 0, joy: .2,
      next: performance.now() + 1500 + Math.random() * 2500, blink: -1e4, nextBlink: 0, sayUntil: 0, speech: null, mode: "wander", tx: null, other: null, drag: null, size: S, lastBump: 0, tag: tag, home: x,
      petN: 0, pts: newRim(), bp: el.querySelector(".bp"), bg: el.querySelector(".bg"), cheek: null, spin: 0, spinA: 0, flat: false,
      em: { anger: 0, fear: 0, sad: 0, shy: 0, love: 0, conf: 0, heart: 0 }, lastDraw: 0 };
    b.FK = faceKit(b.face, b.body);
    var sc = r / R;  // everything a pull or poke does to him, scaled to this body's size
    updateTag(b);
    el.addEventListener("pointerdown", function (e) {
      var p = toStage(e), l = blocal(b, p.x, p.y); stir(); e.preventDefault(); e.stopPropagation(); el.setPointerCapture(e.pointerId);
      b.drag = { ox: p.x - b.x, oy: p.y - b.y, sx: p.x, sy: p.y, moved: false, vx: 0, vy: 0, lx: l.x, ly: l.y };
      // grabbed near the edge: that's a cheek to pull, like Dilmo's
      b.cheek = Math.hypot(l.x, l.y) > r * .6 ? { a: Math.atan2(l.y, l.x), gx: l.x, gy: l.y, px: 0, py: 0, side: Math.abs(l.x) > Math.abs(l.y) } : null;
    });
    el.addEventListener("pointermove", function (e) {
      var d = b.drag; if (!d) return;
      var p = toStage(e), now = performance.now();
      if (b.cheek) {
        var l = blocal(b, p.x, p.y), cx = l.x - b.cheek.gx, cy = l.y - b.cheek.gy, len = Math.hypot(cx, cy) || 1;
        if (len > 110 * sc) { b.cheek = null; d.slipped = true; b.joy = 1; sfx("snap"); b.svx += .06; b.svy -= .05; if (!f.player) bsay(b, line("slip")); }  // slips back, like Dilmo's
        else {
          var k = 34 * sc * Math.tanh(len / (45 * sc)) / len; b.cheek.px = cx * k; b.cheek.py = cy * k; sfx("squeak", Math.min(1, len / (60 * sc)));
          if (len > 14 * sc && !f.player && now - (b.pinchAt || 0) > 3500) { b.pinchAt = now; bsay(b, line(b.cheek.side ? "cheek" : "stretch")); }
        }
        return;
      }
      if (d.slipped) return;
      if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) > 6) { d.moved = true; bsay(b, line("buddyLift")); }
      if (d.moved) { var nx = clamp(p.x - d.ox, r, W - r), ny = clamp(p.y - d.oy, r, floorY(b)); d.vx = nx - b.x; d.vy = ny - b.y; b.x = nx; b.y = ny; }
    });
    function up() {
      var d = b.drag; if (!d) return; b.drag = null;
      if (b.cheek) { var pulled = Math.hypot(b.cheek.px, b.cheek.py); b.cheek = null; if (pulled > 8 * sc) { b.joy = 1; sfx("snap"); return; } }
      if (d.moved) { b.vx = clamp(d.vx, -40, 40); b.vy = clamp(d.vy, -40, 40); var ts = Math.hypot(b.vx, b.vy); if (ts > 18) { feel(b.em, "fear", Math.min(1, ts / 35)); b.em.heart = Math.min(1, b.em.heart + .5); bsay(b, line("buddyThrow")); } return; }
      if (hs && hs.b === b) { endHideSeek(true); return; }
      b.awakeUntil = performance.now() + 20000;
      if (b.asleep) { b.asleep = false; b.vy = -6; bsay(b, line("buddyWoke")); return; }
      b.vy = -7 * f.energy; b.joy = 1; b.svy -= .2; sfx("pop"); dent(d.lx, d.ly, 10 * sc, b.pts);
      if (f.player) return;  // your own character just squishes, it doesn't talk back at you
      bsay(b, line(f.shy ? "buddyShyPoke" : "buddyPoke"));
      if (f.shy) { b.mode = "hide"; b.tx = clamp(pos.x + (b.x < pos.x ? 1 : -1) * (R + r + 10), r, W - r); b.next = performance.now() + 2500; }
    }
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    el.addEventListener("dblclick", function () { b.spin += 360; b.joy = 1; feel(b.em, "conf", .7); b.vy = -9 * f.energy; if (!f.player) bsay(b, line("spin")); });
    b.bp.setAttribute("d", pathD(b.pts, r)); b.bg.setAttribute("d", pathD(b.pts, r));
    buddies.push(b); return b;
  }
  function blocal(b, px, py) {  // a point in this body's own (tilted, spinning) frame
    var dx = px - b.x, dy = py - b.y, a = -(b.tilt + b.spinA) * Math.PI / 180;
    return { x: dx * Math.cos(a) - dy * Math.sin(a), y: dx * Math.sin(a) + dy * Math.cos(a) };
  }
  function bsay(b, text) {
    if (quiet) return;
    var t = performance.now(), sy = syllables(text);
    b.bub.textContent = text; b.bub.hidden = false; b.sayUntil = t + clamp(text.length * 65, 2000, 7000); b.bub._since = t; b.speech = { t0: t, syl: sy };
    sy.forEach(function (s, i) { var f = b.f.pitch * (s.v === "ee" ? 1.15 : s.v === "oo" ? .88 : 1); tone(f, f * .94, .08, "sine", .05, i * SYL / 1000); });
  }
  function spawnFriends() {
    var cast = store.cast || {}, xs = [.2, .82, .65, .36, .93, .08, .55];
    WIDE = stage.clientWidth >= 700;
    if (store.friend >= .5) thirdArrived = true;
    FRIENDS.forEach(function (f, i) { if (friendHere(f, i) && cast[f.id] !== false) makeBuddy(f, W * xs[i], false); });
    if (cast.main === false) setMain(false);
    renderCast();
    if (store.player && store.player.name) joinAs(store.player, true);
  }
  // a third friend visits once the friendship meter passes half
  function unlockFriend() {
    if (thirdArrived || !W) return;
    thirdArrived = true;
    var b = makeBuddy(FRIENDS[2], W - 40, true); renderCast();
    setTimeout(function () { bsay(b, line("arrive")); }, 600);
    setTimeout(function () { say(line("welcome"), "welcome", 1000); }, 2200);
  }
  function chat(b, t) {
    if (t - lastChat < 7000 || (!bub.hidden && t < +bub.dataset.until)) return;
    lastChat = t; var pair = pick(DIALOGS);
    b.tx = clamp(pos.x + (b.x < pos.x ? -1 : 1) * (R + b.f.r + 30), b.f.r, W - b.f.r); b.mode = "chat"; b.next = t + 4000;
    setTimeout(function () { bsay(b, pair[0]); }, 700);
    setTimeout(function () { say(pair[1], "chat", 1000); }, 2500);
  }
  function startTag(b, t) {
    var o = pick(buddies.filter(function (x) { return x !== b && !x.drag; })); if (!o) return;
    b.mode = "tag"; b.other = o; o.mode = "flee"; o.other = b; b.next = o.next = t + 4500;
    bsay(b, line("tagStart"));
  }
  function think(b, t) {
    var r = b.f.r;
    b.next = t + (1800 + Math.random() * 2600) / b.f.energy; b.mode = "wander"; b.other = null;
    if (song) { b.mode = "sing"; b.tx = clamp(pos.x + (b.x < pos.x ? -1 : 1) * (R + r + 14), r, W - r); b.next = t + 800; return; }
    if (isNight && t > (b.awakeUntil || 0)) { b.mode = "sleep"; b.tx = b.home; b.next = t + 6000; return; }  // bedtime in Bahrain
    if (player && bfOf(b) >= .5 && Math.random() < .5) { b.mode = "follow"; b.next = t + 5000; return; }  // close friends tag along
    if (mood.annoy > .5 || mood.joy < -.2) { b.mode = "comfort"; b.tx = clamp(pos.x + (b.x < pos.x ? -1 : 1) * (R + r + 12), r, W - r); b.next = t + 2500; return; }
    if (b.f.shy && ptr.has && !ptr.out && Math.hypot(ptr.x - b.x, ptr.y - b.y) < 140) {  // hides behind him, on the side away from the pointer
      b.mode = "hide"; b.tx = clamp(pos.x + (ptr.x < pos.x ? 1 : -1) * (R + r + 10), r, W - r); feel(b.em, "shy", .7); feel(b.em, "fear", .3); return;
    }
    if (player && Math.random() < .18 && !buddies.some(function (x) { return x.mode === "visit"; })) {  // one at a time goes over to talk to the visitor's character
      b.mode = "visit"; b.tx = clamp(player.x + (b.x < player.x ? -1 : 1) * (player.f.r + r + 20), r, W - r); feel(b.em, "shy", b.f.shy ? .7 : .35);
      setTimeout(function () { if (player) bsay(b, line("toPlayer", { n: player.f.name })); }, 900);
      return;
    }
    var k = Math.random();
    if (k < .3) b.tx = roomy(b);
    else if (k < .5 && !mainAway) chat(b, t);
    else if (k < .55 && buddies.length > 2 && !crowd(b) && !buddies.some(function (x) { return x.mode === "tag"; })) startTag(b, t);  // a short game of tag now and then, one at a time
    else if (k < .75 && !reduce) b.vy = -6 * b.f.energy;
    else if (k < .88 && buddies.filter(function (x) { return x.mode === "ball"; }).length < 2) { b.mode = "ball"; b.next = t + 3500; }  // two chasing the ball is a game, seven is a pile
    else b.tx = null;
  }
  // a spot to wander to: of a few tries, the one farthest from everyone else
  function roomy(b, dir) {  // dir: only look that way (after bumping into someone)
    var r = b.f.r, xs = buddies.filter(function (x) { return x !== b; }).map(function (x) { return x.x; }).concat(mainAway ? [] : [pos.x]), best = b.x, bd = -1;
    for (var i = 0; i < 4; i++) {
      var x = clamp(b.x + (dir ? dir * (80 + Math.random() * 260) : (Math.random() - .5) * 520), r, W - r), d = xs.reduce(function (m, o) { return Math.min(m, Math.abs(o - x)); }, 1e9);
      if (d > bd) { bd = d; best = x; }
    }
    return best;
  }
  // free floor ahead of b in direction dir before it would touch Dilmo or a friend (the visitor walks through)
  function gapAhead(b, dir) {
    var L = buddies.filter(function (x) { return x !== b && !x.f.player; }).map(function (x) { return { x: x.x, y: x.y, r: x.f.r }; });
    if (!mainAway) L.push({ x: pos.x, y: pos.y, r: R });
    return L.reduce(function (m, o) { var d = (o.x - b.x) * dir; return d > 0 && Math.abs(o.y - b.y) < b.f.r + o.r ? Math.min(m, d - b.f.r - o.r - 6) : m; }, 1e9);
  }
  // which way has room for a hop from x: -1, 1, or 0 when both sides are taken
  function roomSide(x, r) {
    var xs = buddies.filter(function (b) { return !b.f.player; }).map(function (b) { return [b.x, b.f.r]; });
    var free = function (dir) { return x + dir * (r + 60) > r && x + dir * (r + 60) < W - r && !xs.some(function (o) { var d = (o[0] - x) * dir; return d > 0 && d < r + o[1] + 70; }); };
    var a = free(-1), c = free(1);
    return a && c ? (Math.random() < .5 ? -1 : 1) : a ? -1 : c ? 1 : 0;
  }
  function slot(b, mode) { return buddies.filter(function (x) { return x.mode === mode; }).indexOf(b); }
  // the nearest body standing almost on top of this one (Dilmo, a friend or the visitor), if any
  function crowd(b) {
    var L = buddies.filter(function (x) { return x !== b; }).map(function (x) { return { x: x.x, y: x.y, r: x.f.r }; });
    if (!mainAway) L.push({ x: pos.x, y: pos.y, r: R });
    var best = null, bd = 1e9;
    L.forEach(function (o) { var d = Math.abs(o.x - b.x); if (d < o.r + b.f.r + 10 && Math.abs(o.y - b.y) < o.r + b.f.r && d < bd) { bd = d; best = o; } });
    return best;
  }
  function buddyStep(b, t, dt) {
    var r = b.f.r, fy = surfaceY(b);
    b.joy += (.15 - b.joy) * .004 * dt;
    b.asleep = b.mode === "sleep" && Math.abs(b.x - b.home) < 20 && b.y >= fy - 1;
    if (b.asleep && !quiet && t > (b.zzzAt || 0)) { b.zzzAt = t + 7000; b.bub.textContent = "Zzz…"; b.bub.hidden = false; b.bub._since = t; b.sayUntil = t + 2500; b.speech = null; }
    if (!b.drag || !b.drag.moved) {
      if (b.f.player) playerControl(b, fy, dt, t); else if (!b.drag && t > b.next) think(b, t);
      if (b.mode === "flee") { feel(b.em, "fear", .3); b.em.heart = Math.max(b.em.heart, .45); }  // being chased: a playful fright
      if (b.f.player) b.tx = null;  // the visitor steers their own character, even during tag
      else if (b.mode === "tag" && b.other) b.tx = b.other.x;
      else if (b.mode === "flee" && b.other) {  // run away from the chaser, toward open floor (not into the others)
        var away = b.x < b.other.x ? -1 : 1, rs = gapAhead(b, away) > 40 ? away : gapAhead(b, -away) > 120 ? -away : away;
        b.tx = clamp(b.x + rs * 120, r, W - r);
      }
      else if (b.mode === "follow" && player) b.tx = clamp(player.x + (b.x < player.x ? -1 : 1) * (player.f.r + r + 16 + slot(b, "follow") * 46), r, W - r);
      else if (b.mode === "ball") b.tx = ball.x;
      if (b.mode === "comfort" && Math.hypot(pos.x - b.x, pos.y - b.y) < R + r + 24) {
        b.mode = "wander"; feel(b.em, "love", .45); bsay(b, line("comfort")); mood.annoy *= .4; mood.joy = Math.max(mood.joy, .3); befriend(.01);
        setTimeout(function () { say(line("thanks"), "thanks", 4000); }, 1500);
      }
      if (b.tx == null && b.y >= fy - 1 && !b.f.player && /^(wander|follow|ball)$/.test(b.mode) && t > (b.roomAt || 0)) {  // too crowded here: step aside
        b.roomAt = t + 900;
        var near = crowd(b);
        if (near) b.tx = clamp(b.x + (b.x < near.x ? -1 : 1) * (60 + Math.random() * 60), r, W - r);
      }
      if (b.tx != null && b.y >= fy - 1) {  // walks in little hops
        var dx = b.tx - b.x;
        if (Math.abs(dx) > 14) {
          // each hop is sized to the room ahead and the distance left, so they walk up to someone and stop
          // beside them (or land on their spot) instead of hopping into them and bouncing around
          var dir = Math.sign(dx), chase = b.mode === "tag" || b.mode === "flee", hvy = 3 + 1.5 * b.f.energy, airT = 2 * hvy / .75;
          var room = gapAhead(b, dir), step = Math.min(2.5 + 2.5 * b.f.energy, Math.abs(dx) / airT, room / airT);
          if (room < 6 && chase) { b.vx = dir * (3 + 2.5 * b.f.energy); b.vy = -9 - 2 * b.f.energy; }  // in a chase: leap over
          else if (step < .6) { b.vx = 0; if (!chase) { b.tx = b.mode === "wander" ? roomy(b, -dir) : null; if (b.mode !== "wander") b.next = Math.min(b.next, t + 900); } }  // someone's right there: turn round (or wait beside them)
          else { b.vx = dir * step; b.vy = -hvy; }
        } else if (b.mode !== "tag" && b.mode !== "flee") b.tx = null;
      }
      var me2 = b.f.player;
      b.vy += (me2 ? playerGravity(b) : .75) * dt; if (me2 && !b.pound) b.vy = Math.min(b.vy, 18);  // terminal velocity
      b.x += b.vx * dt; b.y += b.vy * dt; if (!me2) b.vx *= Math.pow(.99, dt);
      if (b.y > fy) {  // the visitor's character lands dead, no bounce; friends stay bouncy
        var hit = b.vy; b.y = fy; b.vy = hit > 2.5 && !me2 ? -hit * .45 : 0; if (!me2) b.vx *= .8;
        if (hit > 2.5) { b.svy -= Math.min(hit, 18) * .012; b.svx += Math.min(hit, 18) * .009; dent(0, r, Math.min(hit, 20) * .5 * r / R, b.pts); }
        if (me2 && hit > 9) dust(b.x, fy + r);
      }
      if (b.x < r || b.x > W - r) { b.x = clamp(b.x, r, W - r); b.vx = me2 ? 0 : -b.vx * .6; }
      if (b.y < r) { b.y = r; b.vy = -b.vy * .5; }
    }
    if (b.drag && b.drag.moved && b.y < surfaceY(b) - 120) { b.em.fear = Math.min(1, b.em.fear + .006 * dt); b.em.heart = Math.min(1, b.em.heart + .005 * dt); }
    var air = Math.min(.18, Math.abs(b.vy) * .01);
    b.svx = b.svx * Math.pow(.7, dt) + (1 - air * .6 + (b.crouch ? .14 : 0) - b.sx) * .18 * dt; b.sx += b.svx * dt;
    b.svy = b.svy * Math.pow(.7, dt) + (1 + air - (b.crouch ? .22 : 0) - b.sy) * .18 * dt; b.sy += b.svy * dt;
    b.tilt += (clamp(b.vx * 1.4, -25, 25) + (song ? Math.sin(t / 650 + r) * 7 : 0) - b.tilt) * .15 * dt;
    var tg = ptr.has && !ptr.out && Math.hypot(ptr.x - b.x, ptr.y - b.y) < 200 ? ptr : (b.other || (mainAway ? (b === player ? b : player || b) : pos));
    var ldx = tg.x - b.x, ldy = tg.y - b.y, ld = Math.hypot(ldx, ldy) || 1, k = Math.min(1, ld / 200);
    b.lx += (ldx / ld * k - b.lx) * .15 * dt; b.ly += (ldy / ld * k - b.ly) * .15 * dt;
    if (t > b.nextBlink) { b.blink = t; b.nextBlink = t + 2000 + Math.random() * 4500; }
    b.spinA += (b.spin - b.spinA) * .08 * dt;
    rim(b.pts, dt, b.cheek, 0, 0);
  }
  var lastBumpTalk = 0;
  function bumped(A, B, s, t) {
    if (t - lastBump < 500) return;
    lastBump = t; sfx("boing", s);
    // only a real knock gets a remark, and only one remark every few seconds for the whole stage (a crowd bumping is not news)
    var talk = s > 10 && t - lastBumpTalk > 7000 && talking() < 2, said = false;
    [A, B].forEach(function (X, i) {
      if (X.ball) return;
      var Y = i ? A : B;
      if (X.main) { var l = local(Y.o.x, Y.o.y); dent(l.x, l.y, Math.min(s, 20) * .5); if (talk && !said) { said = true; say(line("bumpMain"), "bump", 4000); } }
      else if (!X.b.f.player) { X.b.svy -= .12; if (s > 12) { feel(X.b.em, t - (X.b.hardAt || 0) < 3000 ? "anger" : "conf", .55); X.b.hardAt = t; } if (talk && !said && t - X.b.lastBump > 2500) { said = true; X.b.lastBump = t; bsay(X.b, line("bump")); } }
    });
    if (said) lastBumpTalk = t;
  }
  function talking() { return [bub].concat(buddies.map(function (b) { return b.bub; })).filter(function (e) { return !e.hidden; }).length; }
  function tagContact(A, B, t) {
    if (!A.b || !B.b) return;
    var x = A.b.mode === "tag" && A.b.other === B.b ? A.b : B.b.mode === "tag" && B.b.other === A.b ? B.b : null;
    if (!x || t - (x.tagAt || 0) < 900) return;
    var y = x.other; x.mode = "flee"; y.mode = "tag"; x.tagAt = y.tagAt = t; x.joy = 1; feel(y.em, "conf", .45); if (talking() < 2) bsay(x, line("tagGot"));
  }
  // everyone pushes everyone: circle-circle collisions, heavier = bigger, held ones don't budge
  function collideAll(t) {
    var L = mainAway ? [] : [{ o: pos, r: R, fixed: !!(drag && drag.moved), main: true }];
    buddies.forEach(function (b) { L.push({ o: b, r: b.f.r, fixed: !!(b.drag && b.drag.moved), b: b }); });
    L.push({ o: ball, r: ball.r, ball: true });
    for (var i = 0; i < L.length; i++) for (var j = i + 1; j < L.length; j++) {
      var A = L[i], B = L[j], dx = B.o.x - A.o.x, dy = B.o.y - A.o.y, d = Math.hypot(dx, dy) || .01, min = A.r + B.r;
      if (d >= min) continue;
      var nx = dx / d, ny = dy / d, ma = A.fixed ? 0 : 1 / (A.r * A.r), mb = B.fixed ? 0 : 1 / (B.r * B.r), ms = ma + mb;
      // the visitor walks past others (like NPCs in a platformer) and only collides when landing on or under them
      if (((A.b && A.b.f.player) || (B.b && B.b.f.player)) && !A.ball && !B.ball && Math.abs(ny) < .6) continue;
      var kicker = A.ball ? B : B.ball ? A : null;  // whoever runs into the ball gives it a kick
      if (kicker && kicker.o.vx && Math.abs(ny) < .8) { ball.vx += kicker.o.vx * .5; if (ball.y >= ground + R - ball.r - 1) ball.vy -= 2.5; }
      if (!ms) continue;
      var over = min - d;
      A.o.x -= nx * over * ma / ms; A.o.y -= ny * over * ma / ms; B.o.x += nx * over * mb / ms; B.o.y += ny * over * mb / ms;
      var rv = (B.o.vx - A.o.vx) * nx + (B.o.vy - A.o.vy) * ny;
      if (rv < 0) {
        var jm = -1.5 * rv / ms;
        A.o.vx -= jm * ma * nx; A.o.vy -= jm * ma * ny; B.o.vx += jm * mb * nx; B.o.vy += jm * mb * ny;
        if (-rv > 7) bumped(A, B, -rv, t);
      }
      tagContact(A, B, t);
      // standing on someone counts as ground for jumping
      if (A.b && A.b.f.player && ny > .6) A.b.supportT = t;
      if (B.b && B.b.f.player && ny < -.6) B.b.supportT = t;
    }
  }
  // speech bubbles never overlap: whoever spoke first keeps its spot, later ones are nudged up (or below if there's no room)
  function layoutBubbles() {
    var L = [bub].concat(buddies.map(function (b) { return b.bub; })).filter(function (e) { return !e.hidden && e._w; });
    L.sort(function (a, b) { return (a._since || 0) - (b._since || 0); });
    for (var i = 1; i < L.length; i++) for (var pass = 0; pass < 4; pass++) {
      var moved = false, B = L[i];
      for (var j = 0; j < i; j++) {
        var A = L[j];
        if (B._x < A._x + A._w + 4 && B._x + B._w + 4 > A._x && B._y < A._y + A._h + 4 && B._y + B._h + 4 > A._y) {
          B._y = A._y - B._h - 6; if (B._y < 8) B._y = A._y + A._h + 6; moved = true;
        }
      }
      if (!moved) break;
    }
    L.forEach(function (e) { e.style.transform = "translate(" + e._x.toFixed(1) + "px," + e._y.toFixed(1) + "px)"; });
  }

  // ---- faces: eyes with lids, a mouth that smiles or frowns, brows, blush, a tint, and little signs ----
  // one kit for everyone, drawn in Dilmo's units (r = 48) and scaled by k = r / 48
  var SVGNS = "http://www.w3.org/2000/svg";
  function mkS(tag, cls, parent, before) { var e = document.createElementNS(SVGNS, tag); e.setAttribute("class", cls); parent.insertBefore(e, before || null); return e; }
  function faceKit(faceG, bodyG) {
    faceG.querySelectorAll("ellipse").forEach(function (e) { e.remove(); });
    var P = { tint: mkS("path", "ptint", bodyG, faceG) };
    P.blush = [mkS("ellipse", "pk", faceG), mkS("ellipse", "pk", faceG)];
    P.eyes = [mkS("path", "pe", faceG), mkS("path", "pe", faceG)];
    P.brows = [mkS("path", "pbr", faceG), mkS("path", "pbr", faceG)];
    P.mouth = mkS("path", "pm", faceG);
    var fx = mkS("g", "pfx", bodyG);
    P.sweat = mkS("path", "fx-sweat", fx); P.tear = mkS("path", "fx-tear", fx); P.vein = mkS("path", "fx-vein", fx);
    P.q = mkS("text", "fx-q", fx); P.q.textContent = "?"; P.heart = mkS("path", "fx-heart", fx);
    P.hb = 0;  // heartbeat phase
    return P;
  }
  // an ellipse squeezed between two lines: lids for eyes, a flat top (smile) or flat bottom (frown) for the mouth
  function blob(k, cx, cy, rx, ry, top, bot) {
    var d = "";
    for (var i = 0; i < 32; i++) {
      var a = i / 32 * Math.PI * 2, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
      if (top) y = Math.max(y, top(x)); if (bot) y = Math.min(y, bot(x));
      d += (i ? "L" : "M") + (x * k).toFixed(2) + " " + (y * k).toFixed(2);
    }
    return d + "Z";
  }
  function vis(e, o) { e.style.opacity = o > .02 ? Math.min(1, o).toFixed(2) : "0"; return o > .02; }
  // E: joy anger fear sad shy love conf heart sleepy (0..1).  g: the face as the old code shaped it (eye y, sizes, mouth),
  // so talking, eating and singing keep working underneath the expression.  Returns the heartbeat pulse (0..1).
  function renderFace(P, k, E, g, t, dt, beat) {
    var happy = clamp((E.joy - .45) / .3, 0, 1) * (1 - E.fear) * (1 - E.anger) * (1 - E.sad);
    var lidTop = .45 * E.sleepy + .22 * E.anger + .12 * E.sad, slant = 1.1 * E.anger - .8 * Math.max(E.sad, E.fear);
    var grow = 1 + .18 * E.fear;
    for (var i = 0; i < 2; i++) {
      var s = i ? 1 : -1, cx = 15 * s, cy = g.ey, rx = g.rx * grow, ry = g.ry[i] * grow * (1 + (i ? -.22 : .22) * E.conf);
      var top = (function (cx, cy, rx, ry, s) { return function (x) { return cy - ry + 2 * ry * lidTop + slant * .62 * ry * ((x - cx) / rx) * -s; }; })(cx, cy, rx, ry, s);
      var bot = happy > .02 ? (function (cy, ry) { return function () { return cy + ry - 2 * ry * .55 * happy; }; })(cy, ry) : null;
      P.eyes[i].setAttribute("d", blob(k, cx, cy, rx, ry, lidTop || slant ? top : null, bot));
      // brows sit above the eye: anger tips the inner end down, fear and sadness lift it, confusion raises one
      var bshow = Math.max(E.anger, E.fear * .9, E.sad * .85, E.conf * .9);
      if (vis(P.brows[i], bshow * 1.4)) {
        var ang = E.anger - .9 * Math.max(E.fear, E.sad), lift = (i ? 0 : 5 * E.conf) + 2 * E.fear, by = cy - ry - 5 - lift;
        var ox = s * 23, ix = s * 7, oy = by - ang * 1.5, iy = by + ang * 4.5 - (i ? 0 : 1.5 * E.conf);
        P.brows[i].setAttribute("d", "M" + (ox * k).toFixed(2) + " " + (oy * k).toFixed(2) + "Q" + ((ox + ix) / 2 * k).toFixed(2) + " " + ((Math.min(oy, iy) - 2.2) * k).toFixed(2) + " " + (ix * k).toFixed(2) + " " + (iy * k).toFixed(2));
        P.brows[i].style.strokeWidth = (2.6 * k).toFixed(2);
      }
      if (vis(P.blush[i], .85 * Math.max(E.shy, E.love * .8, happy * .25))) {
        P.blush[i].setAttribute("cx", (s * 25 * k).toFixed(2)); P.blush[i].setAttribute("cy", ((cy + 11) * k).toFixed(2));
        P.blush[i].setAttribute("rx", (6.5 * k).toFixed(2)); P.blush[i].setAttribute("ry", (3.6 * k).toFixed(2));
      }
    }
    // mouth: a smile flattens its top into a "D", a frown flattens its bottom
    var curve = g.busy ? 0 : clamp(.85 * E.joy - .95 * E.sad - .6 * E.anger - .25 * E.fear, -1, 1);
    var mrx = g.mrx * (1 + .35 * Math.max(curve, 0) + .6 * Math.max(-curve, 0)), mry = g.mry * (1 - .15 * Math.max(-curve, 0)), mcy = g.mcy + (curve < 0 ? 2.5 * -curve : 0);
    P.mouth.setAttribute("d", blob(k, g.mx, mcy, mrx, mry,
      curve > .05 ? function () { return mcy - mry * (1 - .85 * curve); } : null,
      curve < -.05 ? function () { return mcy + mry * (1 + .85 * curve); } : null));
    // a flush of red when angry, pale when scared
    var red = E.anger > E.fear;
    if (vis(P.tint, red ? E.anger * .16 : E.fear * .38)) { P.tint.setAttribute("d", g.dd); P.tint.setAttribute("fill", red ? "#ff2020" : "#eef3ff"); }
    // signs
    if (vis(P.sweat, (Math.max(E.fear, E.shy * .7) - .35) * 2)) { var sy = -26 + (t % 1400) / 1400 * 8; P.sweat.setAttribute("d", drop(k, 33, sy, 4)); }
    if (vis(P.tear, (E.sad - .45) * 2.5)) { var ty = g.ey + g.ry[1] + 5 + (t % 1600) / 1600 * 14; P.tear.setAttribute("d", drop(k, 17, ty, 3)); }
    if (vis(P.vein, (E.anger - .55) * 3)) {
      var vs = 1 + .12 * Math.sin(t / 90), v = function (a, b) { return ((a * vs + 30) * k).toFixed(2) + " " + ((b * vs - 36) * k).toFixed(2); };
      P.vein.setAttribute("d", "M" + v(-6, -2) + "Q" + v(-2, -2) + " " + v(-2, -6) + "M" + v(2, -6) + "Q" + v(2, -2) + " " + v(6, -2) + "M" + v(6, 2) + "Q" + v(2, 2) + " " + v(2, 6) + "M" + v(-2, 6) + "Q" + v(-2, 2) + " " + v(-6, 2));
      P.vein.style.strokeWidth = (2.2 * k).toFixed(2);
    }
    if (vis(P.q, (E.conf - .35) * 2.5)) {
      P.q.setAttribute("x", (27 * k).toFixed(2)); P.q.setAttribute("y", ((-44 + Math.sin(t / 300) * 2) * k).toFixed(2));
      P.q.style.fontSize = (20 * k).toFixed(1) + "px"; P.q.style.strokeWidth = (3 * k).toFixed(1) + "px";
    }
    // heartbeat: faster as fear or love rises ("lub-dub"), the heart sign beats with it
    var bpm = 64 + 116 * E.heart, prev = P.hb; P.hb += dt * 16.67 * bpm / 60000;
    var f = P.hb % 1, pulse = Math.exp(-Math.pow(f * 13, 2)) + .6 * Math.exp(-Math.pow((f - .23) * 13, 2));
    if (Math.floor(P.hb) !== Math.floor(prev) && E.heart > .45 && beat) beat(E.heart);
    var ha = Math.max((E.heart - .3) * 2, (E.love - .35) * 2);
    if (vis(P.heart, ha)) {
      var hs = (.85 + .4 * pulse) * k, hx = -31, hy = -40;
      P.heart.setAttribute("d", "M0 3C-6 -2 -7 -7 -3.5 -7.5C-1.5 -7.8 0 -6 0 -4.5C0 -6 1.5 -7.8 3.5 -7.5C7 -7 6 -2 0 3Z");
      P.heart.setAttribute("transform", "translate(" + (hx * k).toFixed(2) + " " + (hy * k).toFixed(2) + ") scale(" + (hs * 1.5).toFixed(3) + ")");
    }
    return E.heart * pulse;
  }
  function drop(k, x, y, r) {  // a teardrop pointing up
    var X = function (v) { return (v * k).toFixed(2); };
    return "M" + X(x) + " " + X(y - r * 1.8) + "C" + X(x + r) + " " + X(y - r * .4) + " " + X(x + r) + " " + X(y + r) + " " + X(x) + " " + X(y + r) + "C" + X(x - r) + " " + X(y + r) + " " + X(x - r) + " " + X(y - r * .4) + " " + X(x) + " " + X(y - r * 1.8) + "Z";
  }
  // feelings fade on their own, each at its own pace
  var FADE = { anger: .997, fear: .996, sad: .998, shy: .995, love: .997, conf: .997, heart: .998 };  // per frame: about 3 to 6 s to fade by half
  function fadeFeel(E, dt) { for (var k2 in FADE) if (E[k2]) E[k2] *= Math.pow(FADE[k2], dt); }
  function feel(E, k2, v) { E[k2] = Math.min(1, Math.max(E[k2] || 0, v)); }

  function drawBuddy(b, t) {
    var r = b.f.r, S = b.size, i;
    var jit = t < (b.tickleUntil || 0) && !reduce ? (Math.random() - .5) * 3 : 0;
    b.el.style.transform = "translate(" + (b.x - S / 2 + jit).toFixed(1) + "px," + (b.y - S / 2).toFixed(1) + "px)";
    var mx = 0; for (i = 0; i < b.pts.length; i++) mx = Math.max(mx, Math.abs(b.pts[i].x), Math.abs(b.pts[i].y));
    if (mx > .05 || !b.flat) { var dd = pathD(b.pts, r); b.bp.setAttribute("d", dd); b.bg.setAttribute("d", dd); b.flat = mx <= .05; }
    b.body.setAttribute("transform", "rotate(" + b.spinA.toFixed(1) + ") translate(0 " + r + ") rotate(" + b.tilt.toFixed(2) + ") scale(" + clamp(b.sx, .8, 1.25).toFixed(3) + " " + clamp(b.sy, .75, 1.22).toFixed(3) + ") translate(0 " + -r + ")");
    b.face.setAttribute("transform", "translate(" + (b.lx * r * .15).toFixed(2) + " " + (b.ly * r * .1).toFixed(2) + ")");
    var bl = t - b.blink < 240 ? Math.sin(Math.PI * (t - b.blink) / 240) : 0;
    var k = r / R, erx = 6.24, ery = Math.max(9.12 * (1 - .34 * bl) * (1 + .12 * b.joy) * (song ? .8 : 1), erx * (bl ? .95 : 1.08));
    var mrx = 4.32, mry = 5.76, sp3 = b.speech && b.speech.syl[Math.floor((t - b.speech.t0) / SYL)], sn = song && songNote(t);
    if (sp3) { var o3 = Math.pow(Math.sin(Math.PI * ((t - b.speech.t0) % SYL) / SYL), .6), F = MOUTH[sp3.v]; mry *= .7 + F[0] * o3; mrx *= 1 + F[1] * o3; }
    else if (sn) { var o4 = Math.sqrt(Math.min(1, Math.sin(Math.PI * clamp(sn.p, 0, 1)) * 1.6)); mry *= 1 + 1.2 * o4; }
    var bdt = clamp((t - b.lastDraw) / 16.67, 0, 4); b.lastDraw = t; fadeFeel(b.em, bdt);
    var E = b.em, hp = renderFace(b.FK, k, { joy: b.joy, anger: E.anger, fear: E.fear, sad: E.sad, shy: E.shy, love: E.love, conf: E.conf, heart: E.heart, sleepy: b.asleep ? 1.7 : 0 },
      { ey: -3.84, rx: erx, ry: [ery, ery], mx: 0, mcy: 17.76, mrx: mrx, mry: Math.max(mry, mrx * 1.02), dd: b.bp.getAttribute("d"), busy: !!sp3 || !!sn }, t, bdt);
    if (hp) b.body.setAttribute("transform", b.body.getAttribute("transform") + " scale(" + (1 + .035 * hp).toFixed(3) + ")");
    if (b.tag) b.tag.style.opacity = b.bub.hidden ? "" : "0";  // the name steps aside while its owner talks
    if (b.tag) b.tag.style.transform = "translate(" + (b.x * K - b.tag.offsetWidth / 2).toFixed(1) + "px," + ((b.y - r) * K - 20).toFixed(1) + "px)";
    var fy = surfaceY(b), sc = clamp(1 - (fy - b.y) / 300, .35, 1);
    b.sh.style.transform = "translate(" + (b.x - r * .8).toFixed(1) + "px," + (fy + r - 6).toFixed(1) + "px) scale(" + sc.toFixed(2) + ")"; b.sh.style.opacity = sc.toFixed(2);
    if (!b.bub.hidden) {
      if (t > b.sayUntil) b.bub.hidden = true;
      else {
        var bw = b.bub.offsetWidth, bh = b.bub.offsetHeight, bx = clamp(b.x * K - bw / 2, 8, Math.max(8, W * K - bw - 8)), by = (b.y - r) * K - 12 - bh;
        if (by < 8) by = (b.y + r) * K + 12;
        b.bub._x = bx; b.bub._y = by; b.bub._w = bw; b.bub._h = bh;
      }
    }
  }

  // ---- the visitor's own playable character ----
  var player = null, keys = { left: false, right: false, down: false, jumpAt: 0, jumpHeld: false }, hitStopUntil = 0;
  // jump from designer numbers, not a guessed gravity (Pittman, GDC 2016): g = 2h/t², v0 = 2h/t
  var JUMP_H = 110, JUMP_T = 15, PG = 2 * JUMP_H / (JUMP_T * JUMP_T), PV = 2 * JUMP_H / JUMP_T;
  function playerGravity(b) {
    return b.vy > 0 ? PG * 2 : PG;  // quick rise, heavier fall: no floating
  }
  // the last three colours unlock with collected stars
  var PCOLORS = [["#d9c2f5", "#9b6fd6", "#5e3b96"], ["#f6b2c9", "#e5799d", "#9e3f62"], ["#dcef9c", "#a8cc3f", "#5f7a17"], ["#d3d9e0", "#8e99a6", "#525c68"], ["#f0d9b5", "#d4a96a", "#8a6233"],
    ["#b5f0e8", "#3cbfb0", "#1d7469"], ["#fff3b8", "#f0be46", "#a87b12"], ["#ffd6f2", "#a98bff", "#3f5bd8"]];
  var NEED = { 5: 5, 6: 10, 7: 20 };
  var PSIZES = [24, 30, 36], pp = { c: 0, s: 1 };
  var panel = document.getElementById("player-panel"), pui = document.getElementById("player-ui"), hud = document.getElementById("pp-hud");
  // 12 more free colours around the hue wheel, any colour from a picker, and your own photo from 15 stars
  for (var hh = 0; hh < 360; hh += 30) PCOLORS.push(["hsl(" + hh + ",75%,84%)", "hsl(" + hh + ",58%,58%)", "hsl(" + hh + ",52%,32%)"]);
  function hexMix(hex, to, k) {
    var n = parseInt(hex.slice(1), 16), m = function (v) { return Math.round(v + (to - v) * k); };
    return "rgb(" + m(n >> 16) + "," + m((n >> 8) & 255) + "," + m(n & 255) + ")";
  }
  function look(c) {  // a colour index or a custom "#hex"
    if (typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c)) return { c1: hexMix(c, 255, .45), c2: c, c3: hexMix(c, 0, .45) };
    var p = PCOLORS[c] || PCOLORS[0]; return { c1: p[0], c2: p[1], c3: p[2] };
  }
  function swatchBg(c) { var l = look(c); return "radial-gradient(circle at 38% 32%, " + l.c1 + ", " + l.c2 + " 55%, " + l.c3 + ")"; }
  function renderSwatches() {
    var stars = store.stars || 0;
    [["pp-colors", function () { return pp.c; }, function (c) { pp.c = c; }], ["pp-recolor", function () { return player ? store.player.c : -1; }, restylePlayer]].forEach(function (cfg) {
      var box = document.getElementById(cfg[0]), cur = cfg[1](); box.textContent = "";
      var add = function (id, label, bg, sel, need, onPick) {
        var s = document.createElement("button"), locked = stars < need;
        s.type = "button"; s.id = cfg[0] + "-" + id; s.setAttribute("aria-pressed", String(sel));
        s.setAttribute("aria-label", locked ? T("مقفل، يُفتح عند " + num(need) + " نجمة", "Locked, opens at " + need + " stars") : label);
        if (bg) s.style.background = bg;
        if (locked) { s.disabled = true; s.textContent = num(need) + "★"; }
        s.addEventListener("click", onPick); box.appendChild(s); return s;
      };
      PCOLORS.forEach(function (c, i) { add(i, T("اللون ", "Colour ") + num(i + 1), swatchBg(i), cur === i, NEED[i] || 0, function () { cfg[2](i); renderSwatches(); }); });
      var custom = typeof cur === "string" && cur[0] === "#" ? cur : null;
      var picker = document.createElement("input"); picker.type = "color"; picker.className = "sw-picker"; picker.tabIndex = -1; picker.value = custom || "#3fa480";
      picker.addEventListener("change", function () { cfg[2](picker.value); renderSwatches(); });
      add("custom", T("لون من اختيارك", "Any colour you like"), custom ? swatchBg(custom) : "conic-gradient(#f66, #fb4, #ee5, #6d6, #5cd, #68f, #c6e, #f66)", !!custom, 0, function () { picker.click(); });
      box.appendChild(picker);
    });
  }
  function makePlayer(cfg, x, fromEdge) {
    var l = look(cfg.c), r = PSIZES[cfg.s] || 30;
    return makeBuddy({ id: "me", name: cfg.name, c1: l.c1, c2: l.c2, c3: l.c3, r: r, pitch: 560 - (r - 24) * 15, energy: 1, shy: false, harm: 7, player: true }, x, fromEdge);
  }
  function restylePlayer(c) {  // rebuild the character in place with its new colour or photo
    if (!player) return;
    var keep = { x: player.x, y: player.y }; store.player.c = c; saveStore();
    [player.el, player.sh, player.bub, player.tag].forEach(function (x) { x.remove(); });
    buddies.splice(buddies.indexOf(player), 1);
    player = makePlayer(store.player, keep.x, false); player.y = keep.y;
    buddies.forEach(function (b) { if (b.other && !buddies.includes(b.other)) { b.other = null; b.mode = "wander"; } });
    bsay(player, T("لون جديد!", "New colour!"));
  }
  document.getElementById("pp-size").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    pp.s = +b.dataset.s; this.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
  });
  function saveStore() { try { localStorage.setItem("hk-dilmo", JSON.stringify(store)); } catch { /* private window */ } }
  function joinAs(cfg, returning) {
    if (player || !W) return;
    player = makePlayer(cfg, (PSIZES[cfg.s] || 30) + 6, true);
    player.vx = 5;
    store.player = cfg; saveStore();
    panel.hidden = true; pui.hidden = false; hud.textContent = ""; renderSwatches();
    if (!returning && innerWidth <= 700) stage.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });  // back from the name field to the stage
    setTimeout(function () { say(line(returning ? "playerBack" : "playerJoin", { n: cfg.name }), "pjoin", 1000); }, 900);
    setTimeout(function () { var o = pick(buddies.filter(function (x) { return x !== player; })); if (o && player) bsay(o, line("buddyHiPlayer", { n: cfg.name })); }, 2700);
    if (returning) setTimeout(function () { if (player) recall(); }, 5200);
    renderTrain();
    loadWords();
    if (window.loadMenus) window.loadMenus().then(function () { index = null; }, function () { /* offline: search places without menus */ });  // dishes become searchable
  }
  function leaveGame() {
    if (!player) return;
    var n = player.f.name;
    [player.el, player.sh, player.bub, player.tag].forEach(function (x) { x.remove(); });
    buddies.splice(buddies.indexOf(player), 1); buddies.forEach(function (b) { feel(b.em, "sad", .6); if (b.other === player) { b.other = null; b.mode = "wander"; } });
    player = null; store.player = null; saveStore();
    panel.hidden = false; pui.hidden = true; renderTrain();
    say(line("playerBye", { n: n }), "pbye", 1000);
  }
  document.getElementById("pp-join").addEventListener("click", function () {
    var n = document.getElementById("pp-name").value.trim().slice(0, 12) || T("ضيف", "Guest");
    joinAs({ name: n, c: pp.c, s: pp.s }, false);
  });
  document.getElementById("pp-leave").addEventListener("click", leaveGame);
  // platformer feel: acceleration, jump buffer + coyote time, variable jump height, one air jump,
  // S = crouch (hold, then Space = high jump) or ground-pound in the air
  function playerControl(b, fy, dt, t) {
    var onF = b.y >= fy - 1 || t - (b.supportT || 0) < 60;
    if (onF) { b.coyote = t; if (b.vy >= 0) b.jumps = 0; }
    var dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), charged = b.crouchT && t - b.crouchT > 300;
    if (!keys.down) b.poundLock = false;
    b.crouch = keys.down && onF;
    if (b.crouch) b.crouchT = b.crouchT || t; else if (onF && !keys.down) b.crouchT = 0;
    // separate acceleration, turn speed and deceleration, weaker in the air (GMTK Platformer Toolkit)
    if (dir && !b.crouch) {
      var turning = b.vx * dir < 0;
      b.vx += (dir * 6 - b.vx) * (onF ? (turning ? .55 : .3) : (turning ? .25 : .15)) * dt;
      if (onF && turning && Math.abs(b.vx) > 3 && t - (b.dustAt || 0) > 250) { b.dustAt = t; dust(b.x, b.y + b.f.r); }
    } else b.vx *= Math.pow(onF ? .7 : .97, dt);
    if (t - keys.jumpAt < 120) {
      if (t - (b.coyote || 0) < 100 && !b.jumps) {
        b.vy = charged ? -PV * 1.3 : -PV; b.jumps = 1; b.cut = false; keys.jumpAt = 0; b.svy += .25; b.crouchT = 0;
        tone(charged ? 260 : 320, charged ? 820 : 620, .14, "sine", .12);
      } else if (b.jumps < 2) { b.vy = -PV * .85; b.jumps = 2; b.cut = false; keys.jumpAt = 0; dust(b.x, b.y + b.f.r); tone(520, 940, .12, "sine", .1); }
    }
    if (!keys.jumpHeld && b.vy < 0 && !b.cut && !b.pound) { b.vy *= .5; b.cut = true; }  // let go early = short hop
    if (keys.down && !onF && !b.pound && !b.poundLock) { b.pound = true; b.vx *= .3; tone(700, 200, .2, "sine", .08); }
    if (b.pound) { if (onF) { b.pound = false; slam(b); } else b.vy = Math.max(b.vy, 17); }
    if (b.other && b.other.mode !== (b.mode === "tag" ? "flee" : "tag")) { b.mode = "wander"; b.other = null; }
    var h = b.mode === "tag" && b.other ? T("أنت المطارِد! المس " + b.other.f.name + ".", "You're it! Tag " + b.other.f.name + ".") : b.mode === "flee" && b.other ? T("اهرب! " + b.other.f.name + " يطاردك.", "Run! " + b.other.f.name + " is chasing you.") :
      TOUCH ? T("◀ ▶ للحركة · «قفز» للقفز (مرة ثانية في الهواء) · ▼ في الهواء ضربة أرضية، واضغطه مع «قفز» لقفزة عالية", "◀ ▶ to move · Jump (again in the air) · ▼ in the air slams down; hold it, then Jump, for a high jump") :
      T("A وD للحركة · المسافة للقفز (مرة ثانية في الهواء) · S في الهواء ضربة أرضية، وعلى الأرض تجمّع لقفزة عالية", "A and D to move · Space to jump (again in the air) · S in the air slams down, on the ground it charges a high jump");
    if (hud.textContent !== h) hud.textContent = h;
  }
  // e.code, not e.key: WASD stay in the same place on an Arabic keyboard layout
  function moveKey(e, down) {
    if (!player || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    var c = e.code;
    if (c === "KeyA" || c === "ArrowLeft") keys.left = down;
    else if (c === "KeyD" || c === "ArrowRight") keys.right = down;
    else if (c === "KeyS" || c === "ArrowDown") keys.down = down;
    else if (c === "Space") { if (down && !e.repeat) keys.jumpAt = performance.now(); keys.jumpHeld = down; }
    else return;
    e.preventDefault();
  }
  function slam(b) {
    var fy = floorY(b), hit = false;
    b.vy = -3; b.svy -= .3; b.svx += .25; b.poundLock = true; sfx("splat");
    hitStopUntil = performance.now() + 70;  // a few frozen frames sell the impact
    dust(b.x, fy + b.f.r);
    [pos].concat(others()).forEach(function (o) {
      var d = Math.abs(o.x - b.x); if (d > 170) return;
      var k = 1 - d / 170; o.vy -= 9 * k; o.vx += (o.x < b.x ? -1 : 1) * 4 * k; hit = true;
    });
    if (hit) say(line("pound"), "pound", 2500);
  }
  function dust(x, y) {
    if (reduce) return;
    for (var i = 0; i < 6; i++) {
      var d = document.createElement("span"); d.className = "dust";
      d.style.setProperty("--x", (x - 5) + "px"); d.style.setProperty("--y", (y - 8) + "px"); d.style.setProperty("--dx", ((i - 2.5) * 14) + "px");
      world.appendChild(d); d.addEventListener("animationend", function () { this.remove(); });
    }
  }
  addEventListener("keydown", function (e) { moveKey(e, true); });
  addEventListener("keyup", function (e) { moveKey(e, false); });
  addEventListener("blur", function () { keys.left = keys.right = keys.down = keys.jumpHeld = false; });  // no stuck keys after switching windows
  // touch buttons: hold to move
  function holdBtn(id, on, off) {
    var bt = document.getElementById(id);
    bt.addEventListener("pointerdown", function (e) { e.preventDefault(); on(); });
    ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) { bt.addEventListener(ev, off); });
  }
  holdBtn("pp-left", function () { keys.left = true; }, function () { keys.left = false; });
  holdBtn("pp-right", function () { keys.right = true; }, function () { keys.right = false; });
  holdBtn("pp-down", function () { keys.down = true; }, function () { keys.down = false; });
  holdBtn("pp-jump", function () { keys.jumpAt = performance.now(); keys.jumpHeld = true; }, function () { keys.jumpHeld = false; });
  function others() { return buddies.filter(function (x) { return x !== player; }); }

  // ---- who is in the place: remove anyone (even him), play alone, bring them back one by one ----
  var mainAway = false, fbSeq = 0;
  function setMain(on) {
    if (mainAway === !on) return;
    mainAway = !on; orb.style.display = shadowEl.style.display = on ? "" : "none"; bub.hidden = true;
    if (on) { pos.x = W / 2; pos.y = R; pos.vx = pos.vy = 0; mood.sleepy = 0; setTimeout(function () { say(line("backIn"), "backIn", 1000); }, 700); }
  }
  function removeFriend(id) {
    var b = others().filter(function (x) { return x.f.id === id; })[0]; if (!b) return;
    [b.el, b.sh, b.bub, b.tag].forEach(function (x) { x.remove(); });
    buddies.splice(buddies.indexOf(b), 1);
    buddies.forEach(function (x) { if (x.other === b) { x.other = null; x.mode = "wander"; } });
    feel(mood, "sad", .5);
    if (hs && hs.b === b) hs = null;
  }
  function addFriend(id) {
    if (others().some(function (x) { return x.f.id === id; })) return;
    var b = makeBuddy(FRIENDS.filter(function (f) { return f.id === id; })[0], W - 40, true);
    setTimeout(function () { bsay(b, line("arrive2")); }, 700);
  }
  function castItems() {
    return ["main"].concat(FRIENDS.filter(friendHere).map(function (f) { return f.id; }));
  }
  function toggleCast(key, on) {
    store.cast = store.cast || {}; store.cast[key] = on; saveStore();
    if (key === "main") setMain(on); else if (on) addFriend(key); else removeFriend(key);
  }
  function renderCast() {
    var box = document.getElementById("cast-list"); box.textContent = "";
    castItems().forEach(function (k, i) {
      var on = k === "main" ? !mainAway : others().some(function (x) { return x.f.id === k; });
      var bt = document.createElement("button"); bt.type = "button"; bt.id = "cast-" + i; bt.textContent = k === "main" ? T("دلمو", "Dilmo") : FRIENDS.filter(function (f) { return f.id === k; })[0].name;
      bt.setAttribute("aria-pressed", String(on));
      bt.addEventListener("click", function () { toggleCast(k, !on); renderCast(); });
      box.appendChild(bt);
    });
  }
  document.getElementById("cast-solo").addEventListener("click", function () { castItems().forEach(function (k) { toggleCast(k, false); }); renderCast(); });
  document.getElementById("cast-all").addEventListener("click", function () {
    castItems().forEach(function (k, i) { setTimeout(function () { toggleCast(k, true); renderCast(); }, i * 700); });  // they arrive one after another
  });
  document.getElementById("pp-wave").addEventListener("click", function () {
    if (!player) return; stir(); player.vy = -7; bsay(player, T("مرحباً!", "Hello!"));
    setTimeout(function () { if (player) say(line("waveBack", { n: player.f.name }), "wave", 1500); }, 1100);
  });
  document.getElementById("pp-laugh").addEventListener("click", function () {
    if (!player) return; stir(); player.svy -= .2; bsay(player, T("ههههه!", "Hahaha!"));
    var o = pick(others()); setTimeout(function () { if (o && player) bsay(o, line("laughBack", { n: player.f.name })); }, 1100);
  });
  document.getElementById("pp-call").addEventListener("click", function () {
    if (!player) return; stir(); bsay(player, T("تعالوا!", "Come here!"));
    others().forEach(function (b, i) { b.mode = "visit"; b.tx = clamp(player.x + (i % 2 ? 1 : -1) * (player.f.r + b.f.r + 10 + i * 20), b.f.r, W - b.f.r); b.next = performance.now() + 4000; });
    pos.vx = Math.sign(player.x - pos.x) * 6; pos.vy = -6;
    setTimeout(function () { if (player) say(line("comeToPlayer", { n: player.f.name }), "call", 1500); }, 700);
  });
  // chatting without AI: the message is normalised, then matched against keyword lists (fusha, Gulf dialect
  // and English, tolerant of small typos) to find what it's about, plus any food or friend it mentions.
  // He remembers a few things about you (name, likes, mood) in this browser, and can search Hakolah's
  // real places and menus to answer "where can I find…".
  function norm(t) {
    return t.toLowerCase().replace(/[ً-ْـ]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
      .replace(/ؤ/g, "و").replace(/ئ/g, "ي").replace(/([ء-ي])\1+/g, "$1").replace(/([a-z])\1{2,}/g, "$1")
      .replace(/[^a-z0-9ء-ي]+/g, " ").trim();
  }
  var INTENTS = {
    sing: ["غني", "غن", "غنيلي", "انشد", "sing", "song"],
    whoAmI: ["شنو اسمي", "ما اسمي", "تعرف اسمي", "what is my name", "whats my name", "what s my name", "who am i"],
    know: ["تعرف عني", "تذكرني", "تتذكرني", "know about me", "remember me", "do you remember"],
    forget: ["انساني", "انسني", "انس كل", "انسى كل", "forget me", "forget everything"],
    hi: ["مرحبا", "هلا", "اهلا", "السلام عليكم", "سلام", "صباح الخير", "مساء الخير", "هاي", "hi", "hello", "hey", "salam", "good morning", "good evening"],
    bye: ["مع السلامه", "باي", "وداعا", "اشوفك", "فمان الله", "الى اللقاء", "bye", "goodbye", "see you", "cya"],
    thanks: ["شكرا", "مشكور", "يعطيك العافيه", "تسلم", "thanks", "thank you", "thx", "ty"],
    how: ["كيفك", "كيف حالك", "شلونك", "شخبارك", "شحالك", "علومك", "اخبارك", "how are you", "how r u", "hru", "how is it going"],
    name: ["اسمك", "اسمج", "شنو اسمك", "شنو اسمج", "ما اسمك", "من انت", "من انتي", "منو انت", "منو انتي", "your name", "who are you", "who r u"],
    age: ["عمرك", "كم عمرك", "how old"],
    home: ["وين ساكن", "اين تعيش", "وين بيتك", "من وين", "where do you live", "where are you from"],
    praise: ["حلو", "جميل", "كيوت", "ظريف", "احبك", "احسن", "رهيب", "لطيف", "يجنن", "cute", "nice", "love you", "cool", "awesome", "sweet"],
    insult: ["غبي", "سخيف", "اكرهك", "وخر", "ثقيل", "بايخ", "stupid", "hate you", "ugly", "dumb", "idiot"],
    sad: ["حزين", "زعلان", "ضايق", "متضايق", "تعبان", "مكتئب", "sad", "upset", "tired", "depressed"],
    happy: ["مبسوط", "فرحان", "سعيد", "وناسه", "تمام", "بخير", "زين", "happy", "great", "fine", "good"],
    bored: ["طفشان", "ملل", "مليت", "زهقان", "طفش", "bored", "boring"],
    hungry: ["جوعان", "جعان", "جوع", "جائع", "hungry", "starving"],
    whereEat: ["وين اكل", "وين اروح", "وين احصل", "وين القى", "وين الاقي", "اين اجد", "اقترح", "تنصحني", "دلني", "where to eat", "where can i", "recommend", "suggest"],
    play: ["نلعب", "العب", "لعبه", "play", "game", "tag"],
    joke: ["نكته", "ضحكني", "سولف", "joke", "funny"],
    dHours: ["متى يفتح", "متى يسكر", "متى يغلق", "ساعات العمل", "ساعات", "يفتح", "يسكر", "يغلق", "مفتوح", "فاتح", "open", "opens", "close", "closes", "hours", "opening hours"],
    dPhone: ["رقم", "رقمهم", "تلفون", "تليفون", "هاتف", "اتصل", "phone", "number", "call", "contact"],
    dPrice: ["بكم", "كم سعر", "سعر", "اسعار", "price", "prices", "cost", "how much"],
    dLoc: ["وين موقع", "موقع", "لوكيشن", "عنوان", "خريطه", "location", "address", "map", "directions", "where is"],
    dNew: ["شنو الجديد", "اخر الاماكن", "اماكن جديده", "جديد", "الجديد", "new places", "whats new", "what s new", "newest", "latest"],
    yes: ["اي", "نعم", "ايه", "اكيد", "يب", "طيب", "اوكي", "yes", "yeah", "yep", "sure", "ok", "okay"],
    no: ["لا", "لاء", "مب", "ما ابي", "no", "nope", "nah"]
  };
  // foods and dishes, each with the words people use for it (search treats them as one)
  var FOODS = { karak: ["كرك", "karak", "chai"], samosa: ["سمبوسه", "سنبوسه", "samosa"], burger: ["برجر", "برقر", "burger", "burgers"],
    shawarma: ["شاورما", "شورما", "shawarma"], machboos: ["مجبوس", "مكبوس", "كبسه", "machboos", "kabsa"], coffee: ["قهوه", "كوفي", "coffee", "latte", "لاتيه"],
    tea: ["شاي", "tea"], pizza: ["بيتزا", "pizza"], sweets: ["حلويات", "حلوى", "حلى", "كيك", "sweets", "dessert", "cake"],
    pastry: ["معجنات", "فطاير", "فطائر", "مناقيش", "منقوشه", "pastry", "pastries", "manakish"], breakfast: ["فطور", "ريوق", "breakfast"],
    grill: ["مشويات", "مشاوي", "كباب", "تكه", "grill", "grills", "kebab"], fish: ["سمك", "اسماك", "روبيان", "fish", "seafood", "shrimp"],
    chicken: ["دجاج", "بروستد", "chicken", "broasted"], juice: ["عصير", "عصائر", "juice"], sandwich: ["سندويش", "ساندويتش", "سندويشات", "sandwich"] };
  var FOOD_NAME = EN ? { karak: "karak", samosa: "samosa", burger: "burgers", shawarma: "shawarma", machboos: "machboos", coffee: "coffee", tea: "tea", pizza: "pizza", sweets: "sweets",
      pastry: "pastries", breakfast: "breakfast", grill: "grills", fish: "seafood", chicken: "chicken", juice: "juice", sandwich: "sandwiches" }
    : { karak: "الكرك", samosa: "السمبوسة", burger: "البرجر", shawarma: "الشاورما", machboos: "المجبوس", coffee: "القهوة", tea: "الشاي", pizza: "البيتزا", sweets: "الحلويات",
      pastry: "المعجنات", breakfast: "الفطور", grill: "المشويات", fish: "المأكولات البحرية", chicken: "الدجاج", juice: "العصائر", sandwich: "السندويشات" };
  var CALLS = { main: ["دلمو", "dilmo"], shams: ["شمس", "shams"], mawja: ["موجه", "mawja"], jamra: ["جمره", "jamra"], lulua: ["لؤلؤه", "لولوه", "لولو", "lulua", "lulu"],
    ramla: ["رمله", "ramla"], najma: ["نجمه", "najma"], ghaima: ["غيمه", "ghaima"] };
  // words that point to a section of the site rather than to a place
  var KINDS = { restaurants: ["مطعم", "مطاعم", "اكل", "غدا", "عشا", "restaurant", "restaurants", "food", "eat", "lunch", "dinner"],
    cafes: ["كافيه", "كافي", "مقهي", "قهوه", "cafe", "cafes", "coffee"], bakeries: ["مخبز", "مخابز", "خبز", "bakery", "bakeries", "bread"],
    places: ["زياره", "اماكن", "سياحه", "معلم", "اطلع", "visit", "places", "sightseeing", "outing"], stores: ["متجر", "متاجر", "محل", "محلات", "اشتري", "store", "shop", "buy"],
    "car-shops": ["سياره", "سيارتي", "كراج", "قراج", "ورشه", "car", "garage", "mechanic"] };
  var STOP = norm("وش ايش شو شرايك رايك تتوقع تفكر في من على عن الى الي انا انت ابي ابغي اريد ودي بغيت وين اين شنو ماذا ممكن لو سمحت شي مكان احد حد اليوم الحين الان زين حلو افضل احسن قريب مني عندكم يكون فيه هل كيف اقدر احصل القى الاقي اجد دلني اقترح تنصحني بالبحرين البحرين" +
    " the a an in to i want what think opinion about need find where is are some any place good best nice near me around can you please for of at with on bahrain").split(" ");
  var LOVE = ["احب", "حب", "يعجبني", "اعشق", "اموت", "مفضل", "مفضله", "love", "like", "favourite", "favorite"].map(norm);
  var HATE = ["ما احب", "مااحب", "لا احب", "ما يعجبني", "اكره", "مب حلو", "hate", "dont like", "do not like", "not a fan"].map(norm);
  [INTENTS, FOODS, CALLS, KINDS].forEach(function (d) { for (var k in d) d[k] = d[k].map(norm); });
  var wordsSrc = (document.currentScript || {}).src || "", wordsP = null;
  function loadWords() {
    if (wordsP || !wordsSrc) return wordsP;
    wordsP = new Promise(function (res) {
      var sc = document.createElement("script"); sc.src = wordsSrc.replace("dilmo.js", "dilmo-words.js");
      sc.onload = function () {
        var D = window.DILMO_WORDS, k; if (!D) return res();
        for (k in D.more) INTENTS[k] = (INTENTS[k] || []).concat(D.more[k].map(norm));
        for (k in D.topics) INTENTS[k] = D.topics[k].map(norm);
        for (k in D.foods) FOODS[k] = D.foods[k].map(norm);
        Object.assign(FOOD_NAME, EN ? D.foodNames.en : D.foodNames.ar); Object.assign(LINES, EN ? D.en : D.ar);
        TAUGHT = (D.taught || []).map(function (L) { return { k: L.k.map(norm), a: EN ? L.en : L.ar }; });
        res();
      };
      sc.onerror = function () { wordsP = null; res(); };
      document.head.appendChild(sc);
    });
    return wordsP;
  }
  function lev(a, b, max) {  // edit distance, gives up once it's past max
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var row = [], i, j;
    for (j = 0; j <= b.length; j++) row[j] = j;
    for (i = 1; i <= a.length; i++) {
      var prev = row[0], best = row[0] = i;
      for (j = 1; j <= b.length; j++) {
        var cur = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; best = Math.min(best, row[j]);
      }
      if (best > max) return max + 1;
    }
    return row[b.length];
  }
  function forms(w) { return [w, w.replace(/^و/, ""), w.replace(/^(و|ف)?(ال|بال|كال|لل)/, "")]; }
  // a word matches a keyword exactly, without its Arabic prefixes (و، ال، بال…), or with one typo (two for long words)
  function wordHit(w, k) {
    var f = forms(w);
    for (var i = 0; i < f.length; i++) {
      var x = f[i]; if (x.length < 2) continue;
      if (x === k) return true;
      if (k.length >= 5 && x.length >= 5 && lev(x, k, k.length >= 8 ? 2 : 1) <= (k.length >= 8 ? 2 : 1)) return true;
    }
    return false;
  }
  function hits(text, words, list) {
    var n = 0;
    list.forEach(function (k) {
      if (k.indexOf(" ") >= 0) { if ((" " + text + " ").indexOf(" " + k + " ") >= 0) n += 2; }
      else if (words.some(function (w) { return wordHit(w, k); })) n++;
    });
    return n;
  }
  function anyHit(text, words, list) { return hits(text, words, list) > 0; }
  function understand(msg) {
    var text = norm(msg), words = text.split(" "), best = null, top = 0, k;
    for (k in INTENTS) { var sc = hits(text, words, INTENTS[k]); if (sc > top) { top = sc; best = k; } }
    if (!best && INTENTS.t_laugh && /(هه|ههه|(ha){2,}|lo+l|😂|🤣)/i.test(msg)) best = "t_laugh";
    var food = null, call = null, kind = null;
    for (k in FOODS) if (hits(text, words, FOODS[k])) { food = k; break; }
    for (k in CALLS) if (hits(text, words, CALLS[k])) { call = k; break; }
    for (k in KINDS) if (hits(text, words, KINDS[k])) { kind = k; break; }
    var hate = anyHit(text, words, HATE), love = !hate && anyHit(text, words, LOVE);
    var nm = /(?:اسمي|ناديني|my name is|call me)\s+([^\s،,.!؟?]{1,12})/i.exec(msg);
    return { raw: msg, text: text, words: words, intent: best, food: food, call: call, kind: kind, love: love, hate: hate, name: nm && nm[1], q: /[؟?]\s*$/.test(msg) };
  }

  // ---- memory: kept in this browser only (hk-dilmo), "انساني" / "forget me" clears it ----
  var me = store.me = store.me || {};
  me.likes = me.likes || []; me.dislikes = me.dislikes || [];
  function myName() { return me.name || (player ? player.f.name : ""); }
  function remember(k, v) { me[k] = v; saveStore(); }
  function foodList(a) { return a.map(function (k) { return FOOD_NAME[k]; }).join(T("، ", ", ")); }

  // ---- search: the site's own data (SITE_DATA, and the menus once loaded), scored word by word ----
  var SECTIONS = ["restaurants", "cafes", "bakeries", "places", "stores", "car-shops"], index = null;
  function buildIndex() {
    index = [];
    if (typeof SITE_DATA === "undefined") return;
    SECTIONS.forEach(function (sec) {
      ((SITE_DATA[sec] || {}).items || []).forEach(function (it) {
        var menu = window.menuOf ? window.menuOf(it) : [];
        index.push({ it: it, sec: sec, title: norm((it.title || "") + " " + (it.title_en || "")).split(" "),
          tags: norm((it.tags || []).join(" ") + " " + (it.group || "") + " " + (it.keywords || "")).split(" "),
          desc: norm((it.desc || "") + " " + (it.desc_en || "")).split(" "),
          menu: menu.map(function (m) { return { m: m, w: norm(m.name + " " + (m.name_en || "")).split(" ") }; }) });
      });
    });
  }
  function inWords(list, alts) { return list.some(function (w) { return alts.some(function (a) { return wordHit(w, a); }); }); }
  // query terms: the message's own words minus small talk, each with its synonyms when it names a food
  function terms(u) {
    var out = [];
    u.words.forEach(function (w) {
      if (w.length < 2 || STOP.indexOf(w) >= 0 || forms(w).some(function (f) { return STOP.indexOf(f) >= 0; })) return;
      for (var k in KINDS) if (KINDS[k].some(function (x) { return wordHit(w, x); })) return;
      for (var i in INTENTS) if (INTENTS[i].some(function (x) { return x.indexOf(" ") < 0 && wordHit(w, x); })) return;
      if (LOVE.some(function (x) { return wordHit(w, x); })) return;
      var alts = [w];
      for (var f in FOODS) if (FOODS[f].some(function (x) { return wordHit(w, x); })) alts = FOODS[f];
      out.push(alts);
    });
    return out;
  }
  function search(qs, kind) {
    if (!index) buildIndex();
    var avoid = me.dislikes.map(function (k) { return FOODS[k]; });
    var res = index.map(function (e) {
      var sc = 0, got = 0, dish = null, dn = 0, used = false;
      e.menu.forEach(function (m) {  // the dish that matches most words, priced ones first
        var c = qs.filter(function (alts) { return inWords(m.w, alts); }).length + (m.m.price ? .5 : 0);
        if (c > dn && c >= 1) { dn = c; dish = m; }
      });
      qs.forEach(function (alts) {
        var s = inWords(e.title, alts) ? 3 : inWords(e.tags, alts) ? 2 : inWords(e.desc, alts) ? 1.5 : 0;
        if (!s && dish && inWords(dish.w, alts)) { s = 2; used = true; }
        if (s) { sc += s; got++; }
      });
      dish = used && dish.m.price ? dish.m : null;  // only shown when the menu is why this place matched
      if (qs.length && !got) return null;
      sc += got * 2 + (kind ? (e.sec === kind ? 2 : -1.5) : 0);
      if (avoid.some(function (alts) { return inWords(e.tags, alts) || inWords(e.title, alts); })) return null;
      return { e: e, sc: sc + (dish ? .6 : 0) + Math.random() * .5, dish: dish };
    }).filter(function (r) { return r && r.sc >= 2 && (!kind || qs.length || r.e.sec === kind); });
    if (kind) { var same = res.filter(function (r) { return r.e.sec === kind; }); if (!same.length && qs.length) return search([], kind).map(function (r) { r.other = true; return r; }); res = same; }
    res.sort(function (a, b) { return b.sc - a.sc; });
    return res.slice(0, 3);
  }
  function itemName(it) { return EN ? it.title_en || it.title : it.title; }
  function itemUrl(r) { var it = r.e.it; return (EN && it.detailUrlEn) || it.detailUrl || r.e.sec + ".html?q=" + encodeURIComponent(itemName(it)); }
  var resultsEl = document.getElementById("pp-results"), bubLink = null;
  // his suggestion is a link: tap the bubble and he takes you to that place
  bub.addEventListener("click", function () { if (bub.classList.contains("link")) location.href = bub.dataset.href; });
  // he says "the rest are below": when that list is out of view, a button in his world takes you to it
  var resHint = document.createElement("button"); resHint.type = "button"; resHint.className = "res-hint"; resHint.hidden = true;
  resHint.textContent = T("↓ النتائج", "↓ Results"); stage.appendChild(resHint);
  resHint.addEventListener("click", function () { resultsEl.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" }); resHint.hidden = true; });
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { if (es[0].isIntersecting) resHint.hidden = true; }).observe(resultsEl);
  function showResults(list) {
    resultsEl.textContent = "";
    list.forEach(function (r) {
      var a = document.createElement("a"), b = document.createElement("b"), s = document.createElement("span"), sec = SITE_DATA[r.e.sec];
      a.href = r.href || itemUrl(r); b.textContent = itemName(r.e.it);
      if (r.href) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
      s.textContent = r.sub ? r.sub : (EN ? sec.title_en : sec.title) + (r.dish ? " · " + (EN ? r.dish.name_en || r.dish.name : r.dish.name) + (r.dish.price ? " ⁦" + r.dish.price + "⁩" : "") : "");
      a.appendChild(b); a.appendChild(s); resultsEl.appendChild(a);
    });
    resultsEl.hidden = !list.length; bubLink = list.length ? list[0].href || itemUrl(list[0]) : null;
    requestAnimationFrame(function () { var r = resultsEl.getBoundingClientRect(); resHint.hidden = !list.length || (r.top < innerHeight && r.bottom > 0); });
  }
  // answers a "where can I find…" message with real places; null when there's nothing to look for
  function findPlaces(u, force) {
    var qs = terms(u);
    if (!qs.length && !u.kind && !force) return null;
    if (!qs.length && !u.kind && me.likes.length) qs = [FOODS[pick(me.likes)]];  // nothing specific: his guess is what you like
    var list = search(qs, u.kind || (qs.length ? null : "restaurants"));
    if (!list.length) {
      if (!qs.length && !u.kind) return null;
      showResults([]);
      return line("cNotFound");
    }
    showResults(list); mood.joy = Math.max(mood.joy, .75);
    var top = list[0]; remember("tried", { p: itemName(top.e.it), t: Date.now() });
    if (top.other) return line("cFoundOther", { p: itemName(top.e.it) });
    if (top.dish) {  // short dish name and its lowest price for the bubble; the card below keeps the full menu line
      var dn = (EN ? top.dish.name_en || top.dish.name : top.dish.name).split(/[(:]/)[0].trim(), pr = top.dish.price.split("/");
      if (dn.length > 30) dn = dn.slice(0, 28) + "…";
      var c = pr[0].trim() + (/BD/.test(pr[0]) ? "" : " BD");
      return line("cFoundDish", { p: itemName(top.e.it), d: dn, c: (pr.length > 1 ? T("من ", "from ") : "") + "⁦" + c + "⁩" });  // the price stays "1.500 BD" inside Arabic text
    }
    return line(list.length > 1 ? "cFoundMany" : "cFound", { p: itemName(top.e.it) });
  }

  // words that name a kind of place, not a particular one ("restaurant" in "Lebanese Restaurant")
  var GENERIC = ["مطعم", "مطاعم", "كافيه", "كافي", "مقهي", "مخبز", "فرع", "محل", "restaurant", "cafe", "coffee", "bakery", "branch", "shop", "the"].map(norm);
  // the places whose name the message mentions (several branches can tie)
  function placesNamed(u) {
    if (!index) buildIndex();
    var qs = terms(u).filter(function (alts) { return !alts.some(function (w) { return GENERIC.indexOf(w) >= 0; }); }), best = 0, out = [];
    if (!qs.length) return [];
    index.forEach(function (e) {
      var c = qs.filter(function (alts) { return inWords(e.title, alts); }).length;
      if (c > best) { best = c; out = [e]; } else if (c && c === best) out.push(e);
    });
    if (!out.length) { out = search(qs, null).map(function (r) { return r.e; }); out.qs = []; return out; }
    out.qs = qs.filter(function (alts) { return !inWords(out[0].title, alts); });  // what's left, e.g. the dish
    return out;
  }
  function placeAnswer(intent, u) {
    if (intent === "dNew") {
      if (!index) buildIndex();
      var fresh = index.filter(function (e) { return e.it.addedAt; }).sort(function (a, b) { return b.it.addedAt - a.it.addedAt; }).slice(0, 3);
      if (!fresh.length) return null;
      showResults(fresh.map(function (e) { return { e: e }; }));
      return line("dNew", { p: itemName(fresh[0].it) });
    }
    var ps = placesNamed(u), e = ps[0];
    if (!e) {
      if (intent === "dPrice") return findPlaces(u, false);  // "how much is machboos": search every menu
      asked = { k: "which", i: intent, until: performance.now() + 20000 }; return line("dWhich");
    }
    var it = e.it, L = it.links || {}, p = itemName(it);
    bubLink = itemUrl({ e: e });
    if (intent === "dHours") {
      showResults(ps.slice(0, 3).map(function (x) { return { e: x, sub: (EN ? x.it.hours_en || x.it.hours : x.it.hours) || T("الساعات غير مؤكدة بعد", "Hours not confirmed yet") }; }));
      var h = EN ? it.hours_en || it.hours : it.hours;
      return h ? line("dHours", { p: p, h: h }) : line(L.phone ? "dHoursNoneCall" : "dHoursNone", { p: p, t: L.phone || "" });
    }
    if (intent === "dPhone") {
      showResults(ps.slice(0, 3).filter(function (x) { return (x.it.links || {}).phone; }).map(function (x) { return { e: x, href: "tel:+973" + x.it.links.phone.replace(/\D/g, "").replace(/^973/, ""), sub: "\u2066+973 " + x.it.links.phone + "\u2069" }; }));
      return L.phone ? line("dPhone", { p: p, t: "\u2066" + L.phone + "\u2069" }) : line("dPhoneNone", { p: p });
    }
    if (intent === "dLoc") {
      showResults(ps.slice(0, 3).filter(function (x) { return (x.it.links || {}).maps; }).map(function (x) { return { e: x, href: x.it.links.maps, sub: T("افتح على الخريطة", "Open in maps") }; }));
      return L.maps ? line("dLoc", { p: p }) : line("dLocNone", { p: p });
    }
    // dPrice: the dish you named on that place's menu, or a taste of the menu
    var menu = e.menu, dishTerms = ps.qs, m = null, mc = 0;
    if (!menu.length) return line("dNoMenu", { p: p });
    menu.forEach(function (x) { var c = dishTerms.filter(function (alts) { return inWords(x.w, alts); }).length + (x.m.price ? .5 : 0); if (c > mc && (c >= 1 || !dishTerms.length)) { mc = c; m = x.m; } });
    if (!m || !dishTerms.length) {
      var priced = menu.filter(function (x) { return x.m.price; });
      if (!priced.length) return line("dNoMenu", { p: p });
      m = pick(priced).m;
      showResults([{ e: e }]);
      return line("dPriceMenu", { p: p, k: num(menu.length), d: dishName(m), c: lowPrice(m.price) });
    }
    if (!m.price) return line("dNoPrice", { p: p, d: dishName(m) });
    showResults([{ e: e, dish: m }]);
    return line("dPrice", { p: p, d: dishName(m), c: lowPrice(m.price) });
  }
  function dishName(m) { var d = (EN ? m.name_en || m.name : m.name).split(/[(:]/)[0].trim(); return d.length > 30 ? d.slice(0, 28) + "…" : d; }
  function lowPrice(pr) { var a = pr.split("/"), c = a[0].trim() + (/BD/.test(a[0]) ? "" : " BD"); return (a.length > 1 ? T("من ", "from ") : "") + "\u2066" + c + "\u2069"; }
  // sums typed as text: "15 × 4", "كم ١٢ زائد ٧", "what is 9 divided by 3"
  function maths(msg) {
    var t = msg.replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); }).replace(/,/g, "")
      .replace(/زائد|plus|\+/gi, " + ").replace(/ناقص|minus|−/gi, " - ").replace(/ضرب|في|times|×|\*|\bx\b/gi, " * ").replace(/قسمه|قسمة|على|divided by|÷|\//gi, " / ");
    var m = /(-?\d+(?:\.\d+)?)\s*([-+*/])\s*(-?\d+(?:\.\d+)?)/.exec(t);
    if (!m) return null;
    var a = +m[1], b = +m[3], o = m[2], r = o === "+" ? a + b : o === "-" ? a - b : o === "*" ? a * b : b === 0 ? null : a / b;
    if (r === null) return line("c_mathBad");
    r = Math.round(r * 1000) / 1000;
    return line("c_math", { q: "\u2066" + a + " " + (o === "*" ? "×" : o === "/" ? "÷" : o) + " " + b + "\u2069", v: num(r) });
  }
  function computed(intent) {
    var now = new Date(), tz = "Asia/Bahrain", loc = EN ? "en-GB" : "ar-BH";
    if (intent === "c_time") return line("c_time", { v: new Intl.DateTimeFormat(loc, { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(now) });
    if (intent === "c_date") return line("c_date", { v: new Intl.DateTimeFormat(loc, { timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now) });
    if (intent === "c_weekend" || intent === "f_weekend") {
      if (intent === "f_weekend" && LINES.f_weekend) return line("f_weekend");
      var wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(now));
      if (wd === 5 || wd === 6) return line("c_weekendNow");
      var d = 5 - wd;  // Bahrain's weekend: Friday and Saturday
      return line("c_weekendIn", { v: d === 1 ? T("يوم واحد", "1 day") : d === 2 ? T("يومان", "2 days") : T(num(d) + " أيام", d + " days") });
    }
    if (intent === "age") {  // his real age, counted from the day the Dilmo page went up
      var dd = Math.floor((now - Date.UTC(2026, 9, 27, 21)) / 864e5), mm = Math.floor(dd / 30.44);
      // ponytail: days then months only; add years once he turns one
      return line("cAge", { v: dd < 60 ? (dd < 1 ? T("أقل من يوم", "less than a day") : dd === 1 ? T("يوم واحد", "1 day") : dd === 2 ? T("يومان", "2 days") : T(num(dd) + (dd <= 10 ? " أيام" : " يوماً"), dd + " days"))
        : T(num(mm) + (mm <= 10 ? " أشهر" : " شهراً"), mm + " months") });
    }
    if (intent === "t_weather") {  // no live weather here: say so, and what the season is usually like
      var mo = +new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "numeric" }).format(now);
      return line(mo >= 5 && mo <= 9 ? "t_weather_hot" : mo === 12 || mo <= 2 ? "t_weather_cool" : "t_weather_mild");
    }
    return null;
  }
  var asked = null;  // his last question ("suggest" a place, "play", "how" are you), valid for a little while
  function reply(u, n) {
    var pend = asked && performance.now() < asked.until ? asked.k : null, key = null, v = { n: n }, asked0 = asked;
    asked = null;
    // things you tell him about yourself
    if (u.name) { remember("name", u.name); return line("cMemName", { n: u.name }); }
    if (u.intent === "forget") { store.me = me = { likes: [], dislikes: [] }; saveStore(); return line("cMemForget"); }
    if (u.intent === "whoAmI") return me.name ? line("cMemWho", { n: me.name }) : line("cMemNoName", { n: n });
    if (u.intent === "know") {
      var bits = [];
      if (me.name) bits.push(T("أنّ اسمك " + me.name, "your name is " + me.name));
      if (me.likes.length) bits.push(T("أنك تحب " + foodList(me.likes), "you like " + foodList(me.likes)));
      if (me.dislikes.length) bits.push(T("أنك لا تحب " + foodList(me.dislikes), "you don't like " + foodList(me.dislikes)));
      return bits.length ? line("cMemKnow", { k: bits.join(T("، و", ", and ")) }) : line("cMemNothing");
    }
    if (u.food && u.hate) {
      if (me.dislikes.indexOf(u.food) < 0) me.dislikes.push(u.food);
      me.likes = me.likes.filter(function (x) { return x !== u.food; }); saveStore();
      return line("cMemHate", { f: FOOD_NAME[u.food] });
    }
    if (u.food && u.love && u.intent !== "whereEat") {
      if (me.likes.indexOf(u.food) < 0) me.likes.push(u.food);
      me.dislikes = me.dislikes.filter(function (x) { return x !== u.food; }); saveStore();
      var found = findPlaces(u, false);
      return line("cMemLike", { f: FOOD_NAME[u.food] }) + (found ? " " + found : "");
    }
    var sum = maths(u.raw);
    if (sum) return sum;
    if (pend === "which" && !u.intent) { var again = placeAnswer(asked0.i, u); if (again) return again; }
    if (/^d[A-Z]/.test(u.intent || "")) return placeAnswer(u.intent, u);
    var cv = computed(u.intent);
    if (cv) return cv;
    if (/^[tf]_/.test(u.intent || "")) {
      if ((u.food || u.kind) && /^t_/.test(u.intent)) { var near = findPlaces(u, false); if (near) return near; }
      if (LINES[u.intent]) return line(u.intent, v);
    }
    if (u.intent === "sad" || u.intent === "happy") remember("mood", { m: u.intent, t: Date.now() });
    if (u.intent === "yes" || u.intent === "no") {
      if (pend === "tried") { if (u.intent === "yes") key = "cTriedYes"; else { key = "cTriedNo"; asked = { k: "suggest" }; } }
      else if (pend === "suggest") { if (u.intent === "yes") return findPlaces(u, true) || line("cYesSuggest"); key = "cNoSuggest"; asked = { k: "play" }; }
      else if (pend === "play" && u.intent === "yes") u.intent = "play";
      else key = u.intent === "yes" ? "cYes" : "cNo";
    }
    // a place search wins over small talk when the message names something to look for
    if (!key && (u.intent === "whereEat" || (u.intent === "hungry" && (u.food || u.kind)) || (!u.intent && (u.food || u.kind)) || (u.intent === null && u.q))) {
      var ans = findPlaces(u, u.intent === "whereEat");
      if (ans) return ans;
    }
    if (!key && u.food && /^(praise|happy|yes|no|hi)?$/.test(u.intent || "")) u.intent = null;
    if (!key) switch (u.intent) {
      case "hi": key = "replyHi"; break;
      case "bye": key = "cBye"; feel(mood, "sad", .5); break;
      case "thanks": key = "cThanks"; break;
      case "how": key = mood.sleepy > .5 ? "cHowTired" : mood.annoy > .4 ? "cHowGrumpy" : "cHowGood"; if (key !== "cHowGrumpy") asked = { k: "how" }; break;
      case "name": key = "cName"; break;
      case "age": key = "cAge"; break;
      case "home": key = "cHome"; break;
      case "praise": key = "cPraise"; mood.joy = 1; befriend(.01); feel(mood, "shy", .75);
        if (/احبك|حبيتك|love you/.test(u.raw || "")) { feel(mood, "love", 1); mood.heart = Math.min(1, mood.heart + .7); } else { feel(mood, "love", .4); mood.heart = Math.min(1, mood.heart + .3); }
        break;
      case "insult": key = "cInsult"; mood.annoy = Math.min(1, mood.annoy + .75); setTimeout(function () { feel(mood, "sad", .65); }, 2200); break;  // angry first, hurt after
      case "sad": key = "cSad"; break;
      case "happy": key = "cHappy"; mood.joy = Math.min(1, mood.joy + .3); break;
      case "bored": key = "cBored"; break;
      case "hungry": if (me.likes.length) { v.f = FOOD_NAME[pick(me.likes)]; key = "cHungryLike"; } else key = "cHungry"; asked = { k: "suggest" }; break;
      case "whereEat": key = "cWhereEat"; break;
      case "play": key = "cPlay"; startPlayerTag(); break;
      case "joke": key = "cJoke"; break;
    }
    if (!key && u.food) {  // talked about a food: one of his friends may love it
      var fan = FRIENDS.filter(function (f) { return f.fav === u.food; })[0];
      v.f = FOOD_NAME[u.food]; key = fan ? "cFoodFav" : "cFood"; if (fan) v.w = fan.name;
    }
    if (!key && u.call) return null;  // only called someone by name: they answer instead
    if (!key) {  // last try: maybe it's the name of a place or a dish
      var guess = findPlaces(u, false);
      if (guess) return guess;
      key = Math.random() < .6 ? "cHuh" : "cHuh2"; feel(mood, "conf", .85); asked = { k: key === "cHuh" ? "suggest" : "play" };
    }
    if (asked) asked.until = performance.now() + 20000;
    return line(key, v);
  }
  // when you come back, he brings up something he remembers (one thing, once per visit)
  function recall() {
    var day = 864e5, now = Date.now(), n = myName(), key = null, v = { n: n };
    if (me.mood && me.mood.m === "sad" && now - me.mood.t < 3 * day) { key = "cMemMood"; asked = { k: "how", until: performance.now() + 20000 }; }
    else if (me.tried && now - me.tried.t > 6 * 36e5 && now - me.tried.t < 14 * day) { key = "cMemTried"; v.p = me.tried.p; asked = { k: "tried", until: performance.now() + 30000 }; }
    else if (me.likes.length) { key = "cMemLikeAgain"; v.f = FOOD_NAME[pick(me.likes)]; }
    if (key) say(line(key, v), "recall", 1000);
  }
  // a friend answering questions about itself, as itself (not as Dilmo)
  function persona(b, u, n) {
    var f = b.f, a = ABOUT[f.id] || ["", ""], v = { w: f.name, a: a[0], c: a[1], f: FOOD_NAME[f.fav] || "", n: n };
    switch (u.intent) {
      case "name": case "t_robot": return line("pName", v);
      case "how": return line("pHow", v);
      case "age": return line("pAge", v);
      case "home": return line("pHome", v);
      case "t_dilmoLikes": case "t_colors": return line("pLikes", v);
      case "t_friends": return line("pFriends", v);
    }
    return null;
  }
  function startPlayerTag() {
    var o = pick(others().filter(function (b) { return !b.drag && !b.asleep; }));
    if (!o || !player) return;
    o.mode = "tag"; o.other = player; player.mode = "flee"; player.other = o; o.next = performance.now() + 6500;
  }
  // your line appears over your character, and he (or whoever you named) answers
  document.getElementById("pp-chat").addEventListener("submit", function (e) {
    e.preventDefault();
    var inp = document.getElementById("pp-msg"), msg = inp.value.trim().slice(0, 60);
    if (!player || !msg) return;
    inp.value = ""; stir(); bsay(player, msg);
    var go = function () { answer(msg); };
    if (loadWords()) wordsP.then(go); else go();
  });
  function answer(msg) {
    bubLink = null;
    var u = understand(msg), n = myName(), lesson = lessonFor(u);
    nextSong = Math.max(nextSong, performance.now() + 45000);  // you're talking: no surprise songs for a while
    if (!lesson && u.intent === "sing" && !song) { setTimeout(sing, 900); return; }
    var called = u.call && u.call !== "main" ? others().filter(function (b) { return b.f.id === u.call; })[0] : null;
    var speaker = called || (mainAway ? pick(others()) : null);
    var text = lesson ? lesson.a.split("{n}").join(n) : (speaker && persona(speaker, u, n)) || reply(u, n);
    var shown = text || line("cFriendCalled", { n: n });
    if (speaker) setTimeout(function () { if (player) bsay(speaker, shown); }, 1100);
    else { var link = bubLink; setTimeout(function () { say(shown, "pchat", 300); if (link) { bub.dataset.href = link; bub.classList.add("link"); bub.title = T("اضغط لفتح المكان", "Tap to open the place"); } }, 1300); }
    lastEx = { q: msg, a: shown, taught: !!lesson, u: u }; renderTrain();
    var o = pick(others());
    if (!called && o && !mainAway && (u.intent === "hi" || u.intent === "praise") && Math.random() < .5) setTimeout(function () { if (player) bsay(o, line("buddyReply", { n: n })); }, 2900);
  }

  // ---- training (dilmo.html?train): the owner rates his answers and teaches better ones.
  // Lessons live in this browser only and apply at once; Claude reviews the exported file and moves the good ones
  // into dilmo-words.js (taught), where they reach every visitor. No AI: a lesson is "these words → this answer".
  var TRAIN = /[?&]train\b/.test(location.search), TAUGHT = [], lastEx = null, trainEl = null;
  function trainData() { try { return JSON.parse(localStorage.getItem("hk-dilmo-train") || "{}"); } catch { return {}; } }
  function saveTrain(d) { try { localStorage.setItem("hk-dilmo-train", JSON.stringify(d)); } catch { /* private window */ } }
  function lessons() { var d = trainData(); return (d.lessons || []).filter(function (L) { return L.lang === (EN ? "en" : "ar"); }); }
  // a lesson matches when all its chosen words are in the message (typos and prefixes allowed);
  // with no words chosen, three quarters of the question's own words must be there
  function lessonFor(u) {
    var best = null, bestN = 0;
    lessons().map(function (L) { return { k: (L.k && L.k.length ? L.k : null), q: L.q, a: L.a }; }).concat(TAUGHT).forEach(function (L) {
      var keys = L.k || norm(L.q).split(" ").filter(function (w) { return w.length > 1 && STOP.indexOf(w) < 0; });
      if (!keys.length) return;
      var hit = keys.filter(function (k) { return u.words.some(function (w) { return wordHit(w, k); }); }).length;
      if (hit / keys.length >= (L.k ? 1 : .75) && hit > bestN) { best = L; bestN = hit; }
    });
    return best;
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function showFeeling(k) {
    var M = { joy: "joy", anger: "annoy", shy: "shy", conf: "conf", fear: "fear", heart: "heart", sad: "sad", love: "love" };
    mood[M[k]] = 1; if (k === "fear" || k === "love") mood.heart = Math.max(mood.heart, .8);
    buddies.forEach(function (b) { if (k === "joy") b.joy = 1; else { b.em[k] = 1; if (k === "fear" || k === "love") b.em.heart = Math.max(b.em.heart, .8); } });
  }
  function renderTrain() {
    if (!TRAIN) return;
    if (!trainEl) { trainEl = el("section", "train"); trainEl.setAttribute("aria-label", T("تدريب دلمو", "Train Dilmo")); document.querySelector(".tips").before(trainEl); }
    var d = trainData(), mine = lessons();
    trainEl.textContent = "";
    trainEl.appendChild(el("h2", null, T("تدريب دلمو", "Train Dilmo")));
    // preview every expression on everyone at once (the owner checks them here)
    var fx = el("div", "train-faces"); fx.appendChild(el("span", "train-note", T("معاينة التعابير: ", "Preview expressions: ")));
    [["joy", "فرح", "Happy"], ["anger", "غضب", "Angry"], ["shy", "خجل", "Shy"], ["conf", "حيرة", "Confused"], ["fear", "خوف", "Afraid"], ["heart", "نبض متسارع", "Racing heart"], ["sad", "حزن", "Sad"], ["love", "حب", "Love"]].forEach(function (x) {
      var b = el("button", "snd", T(x[1], x[2])); b.type = "button";
      b.addEventListener("click", function () { showFeeling(x[0]); });
      fx.appendChild(b);
    });
    trainEl.appendChild(fx);
    if (!player) trainEl.appendChild(el("p", "train-note", T("ادخل بشخصيتك أولاً، ثم كلّم دلمو وقيّم ردوده هنا.", "Join with your character first, then talk to Dilmo and rate his answers here.")));
    else if (!lastEx) trainEl.appendChild(el("p", "train-note", T("اكتب له أي شيء في المحادثة، وسيظهر رده هنا لتقيّمه.", "Type anything to him in the chat; his answer shows up here for you to rate.")));
    else {
      var box = el("div", "train-last");
      box.appendChild(el("span", "train-q", T("قلت: ", "You: ") + lastEx.q));
      box.appendChild(el("span", "train-a", T("ردّ: ", "He said: ") + lastEx.a + (lastEx.taught ? T(" (من درس علّمته)", " (from a lesson)") : "")));
      trainEl.appendChild(box);
      if (!lastEx.rated) {
        var row = el("div", "train-row"), good = el("button", "game-btn", T("👍 صح", "👍 Good")), bad = el("button", "snd", T("👎 غلط، علّمه", "👎 Wrong, teach him"));
        good.type = bad.type = "button";
        good.addEventListener("click", function () { log(true); lastEx.rated = "good"; renderTrain(); });
        bad.addEventListener("click", function () { log(false); lastEx.rated = "bad"; renderTrain(); setTimeout(function () { var t = trainEl.querySelector("textarea"); if (t) t.focus(); }, 0); });
        row.appendChild(good); row.appendChild(bad); trainEl.appendChild(row);
      } else if (lastEx.rated === "good") trainEl.appendChild(el("p", "train-note", T("سُجّل أن الرد صحيح.", "Noted as a good answer.")));
      else if (lastEx.rated === "bad") trainEl.appendChild(teachForm());
      else trainEl.appendChild(el("p", "train-note", T("حفظتُ الدرس. جرّب أن تسأله مرة أخرى.", "Lesson saved. Try asking him again.")));
    }
    // the lessons so far, and the file Claude reviews
    var foot = el("div", "train-row");
    foot.appendChild(el("span", "train-note", T("الدروس: ", "Lessons: ") + num(mine.length) + T(" · التقييمات: ", " · Ratings: ") + num((d.feedback || []).length)));
    var dl = el("button", "snd", T("تنزيل الدروس", "Download lessons")), clr = el("button", "snd", T("مسح الكل", "Clear all"));
    dl.type = clr.type = "button";
    dl.addEventListener("click", exportTrain);
    clr.addEventListener("click", function () { if (confirm(T("مسح كل الدروس والتقييمات؟", "Delete all lessons and ratings?"))) { saveTrain({}); renderTrain(); } });
    foot.appendChild(dl); foot.appendChild(clr); trainEl.appendChild(foot);
    if (mine.length) {
      var list = el("details", "train-list"); list.appendChild(el("summary", null, T("عرض الدروس", "Show lessons")));
      mine.slice().reverse().forEach(function (L) {
        var li = el("div", "train-item");
        li.appendChild(el("span", null, "«" + L.q + "» → " + L.a + (L.k && L.k.length ? T(" · الكلمات: ", " · words: ") + L.k.join("، ") : "")));
        var del = el("button", "snd", T("حذف", "Delete")); del.type = "button";
        del.addEventListener("click", function () { var dd = trainData(); dd.lessons = (dd.lessons || []).filter(function (x) { return x.t !== L.t; }); saveTrain(dd); renderTrain(); });
        li.appendChild(del); list.appendChild(li);
      });
      trainEl.appendChild(list);
    }
  }
  function teachForm() {
    var f = el("form", "train-form");
    var lab = el("label", null, T("الرد الصحيح", "The right answer")), ta = el("textarea"); ta.rows = 2; ta.maxLength = 160; ta.required = true;
    ta.placeholder = T("اكتب ما كان يجب أن يقوله دلمو ({n} = اسم الزائر)", "What Dilmo should have said ({n} = the visitor's name)");
    lab.appendChild(ta); f.appendChild(lab);
    // the message's own words, to choose which ones must be there for this answer
    var words = terms(lastEx.u).map(function (a) { return a[0]; }).filter(function (w, i, a) { return a.indexOf(w) === i; });
    var picked = words.slice();
    if (words.length) {
      f.appendChild(el("span", "train-note", T("الكلمات المهمة في سؤالك (اضغط لإلغاء أي كلمة). يُطبَّق الدرس على أي رسالة فيها كل هذه الكلمات، فكلما قلّت صار أعمّ:", "The important words in your question (tap to drop one). The lesson applies to any message with all of them, so fewer words means broader:")));
      var chips = el("div", "seg");
      words.forEach(function (w) {
        var b = el("button", null, w); b.type = "button"; b.setAttribute("aria-pressed", "true");
        b.addEventListener("click", function () { var on = picked.indexOf(w) < 0; picked = on ? picked.concat(w) : picked.filter(function (x) { return x !== w; }); b.setAttribute("aria-pressed", String(on)); });
        chips.appendChild(b);
      });
      f.appendChild(chips);
    }
    var save = el("button", "game-btn", T("احفظ الدرس", "Save the lesson")); save.type = "submit"; f.appendChild(save);
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var a = ta.value.trim(); if (!a) return;
      var dd = trainData(); dd.lessons = dd.lessons || [];
      dd.lessons.push({ q: lastEx.q, k: picked, a: a, wrong: lastEx.a, lang: EN ? "en" : "ar", t: Date.now() });
      saveTrain(dd); lastEx.rated = "saved"; renderTrain();
      say(T("حفظتُها! شكراً لأنك علّمتني.", "Got it! Thanks for teaching me."), "taught", 500);
    });
    return f;
  }
  function log(ok) { var d = trainData(); d.feedback = d.feedback || []; d.feedback.push({ q: lastEx.q, a: lastEx.a, ok: ok, lang: EN ? "en" : "ar", t: Date.now() }); saveTrain(d); }
  function exportTrain() {
    var d = trainData(), blob = new Blob([JSON.stringify({ app: "dilmo-training", exported: new Date().toISOString(), lessons: d.lessons || [], feedback: d.feedback || [] }, null, 2)], { type: "application/json" });
    var a = el("a"); a.href = URL.createObjectURL(blob); a.download = "dilmo-lessons-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }
  if (TRAIN) setTimeout(renderTrain, 0);

  // ---- world life: Bahrain time of day, a ball, a bench, bushes, hide-and-seek, stars, a photo ----
  var sky = document.getElementById("sky"), clock = document.getElementById("clock"), phase = "noon", isNight = false;
  var PHASE_NAME = EN ? { morning: "Morning", noon: "Noon", evening: "Evening", night: "Night" } : { morning: "الصباح", noon: "الظهيرة", evening: "المساء", night: "الليل" };
  for (var si = 0; si < 26; si++) { var stEl = document.createElement("span"); stEl.className = "star"; stEl.style.left = (Math.random() * 100).toFixed(1) + "%"; stEl.style.top = (Math.random() * 55).toFixed(1) + "%"; stEl.style.animationDelay = (Math.random() * 3).toFixed(2) + "s"; sky.appendChild(stEl); }
  function bahrainNow() {
    var parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bahrain", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
    var get = function (k) { return +parts.filter(function (p) { return p.type === k; })[0].value; };
    return { h: get("hour") % 24, m: get("minute") };
  }
  function tickClock() {
    var n = bahrainNow(), h = n.h;
    if (W) paintSky();
    phase = h >= 5 && h < 11 ? "morning" : h >= 11 && h < 16 ? "noon" : h >= 16 && h < 19 ? "evening" : "night";
    isNight = phase === "night"; sky.dataset.phase = phase;
    var tz = document.createElement("span"); tz.className = "tz"; tz.textContent = T(" بتوقيت البحرين", " Bahrain time");
    clock.textContent = PHASE_NAME[phase] + " · " + num(n.h % 12 || 12) + ":" + num(("0" + n.m).slice(-2)) + (n.h < 12 ? T(" ص", " AM") : T(" م", " PM"));
    clock.appendChild(tz); clock.appendChild(document.createTextNode(" · ★ " + num(store.stars || 0)));
  }
  // props: a bench you can stand on, two bushes to hide behind, a ball everyone can kick
  var benchEl = document.getElementById("bench"), bench = { x: 0, w: 96, top: 0 };
  var bushes = [0, 1].map(function (i) { return { el: document.getElementById("bush" + i), cx: 0 }; });
  var ballEl = document.getElementById("ball"), ball = { x: 0, y: 0, vx: 0, vy: 0, r: 11, rot: 0 };
  function placeProps() {
    var fl = ground + R;
    bench.x = W * .3 - bench.w / 2; bench.top = fl - 28;
    benchEl.style.transform = "translate(" + bench.x.toFixed(1) + "px," + bench.top.toFixed(1) + "px)";
    bushes.forEach(function (b, i) {
      b.cx = i ? W * .68 : W * .1;
      var at = "translate(" + (b.cx - 35).toFixed(1) + "px," + (fl - 44).toFixed(1) + "px)";  // bottom edge exactly on the floor line
      b.el.style.setProperty("--at", at); b.el.style.transform = at;
    });
    if (!ball.x) { ball.x = W * .42; ball.y = fl - ball.r; }
    // background layers stand on the floor line; the near palm sits beside the right-hand bush
    var below = world.offsetHeight - fl;
    groundEl.style.height = below + "px";
    far1.style.bottom = (below - 2) + "px"; far2.style.bottom = (below - 1) + "px";
    [far1, far2].forEach(function (f) { f.setAttribute("viewBox", "0 0 " + Math.round(100 * W / (f.clientHeight || 80)) + " 100"); });  // same scale on any width: the tile repeats
    palmEl.style.transform = "translate(" + (W * .86 - 60).toFixed(1) + "px," + (fl - 150).toFixed(1) + "px)";
    clouds.style.setProperty("--drift", (W + 420) + "px");
    paintSky();
  }
  // colour script: the sky, the far town, the ground and the light follow the real time in Bahrain,
  // keyed to sunrise and sunset (which move through the year), blended smoothly between keys
  var groundEl = document.getElementById("ground"), far1 = document.getElementById("far1"), far2 = document.getElementById("far2"), palmEl = document.getElementById("palm-near");
  var clouds = document.getElementById("clouds"), sunEl = document.getElementById("sun"), moonEl = document.getElementById("moon");
  var PAL = {  // top, horizon, far town (back, front), grass, ground (back, front), light, clouds, stars, window lights
    night: ["#0a1430", "#22325c", "#1b2749", "#121b34", "#2b4a44", "#2c3343", "#1b2030", "#a3b0e0", "#3a4670", 1, 1],
    dawn: ["#1d2b60", "#b98aa0", "#4c4a70", "#2f3152", "#3f5f55", "#5c5662", "#3d3a46", "#cdbadb", "#8d84a8", .4, .6],
    sunrise: ["#7da3d8", "#ffc49a", "#c6a9aa", "#8c7682", "#6f9a6e", "#dab58d", "#b98f6a", "#ffe4d0", "#ffd9c2", 0, 0],
    morning: ["#74b6ec", "#f5ead8", "#c9cfd2", "#a9aaa4", "#7fb069", "#e9d0a3", "#cfae7e", "#fff9f1", "#ffffff", 0, 0],
    noon: ["#4ea3e6", "#e9f3f7", "#cfd8dc", "#b4b9b6", "#86b56c", "#ebd7ae", "#d3b688", "#ffffff", "#ffffff", 0, 0],
    afternoon: ["#5ba6e0", "#f8e6c4", "#cbc6be", "#a59d90", "#84ad66", "#e7ca9b", "#c9a473", "#fff3e3", "#fff6ea", 0, 0],
    golden: ["#4f6fb2", "#ffad6b", "#a97f84", "#705462", "#6f8d55", "#daa36f", "#a8774f", "#ffd4b4", "#ffc7a3", 0, .3],
    dusk: ["#1f2a5a", "#c8707a", "#4e3b5d", "#2e2541", "#3e5148", "#6b4f58", "#44333e", "#bba5ce", "#7d6a93", .5, 1]
  };
  var skyNow = {};
  function mixHex(a, b, p) { var x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16), c = function (s) { return Math.round(((x >> s) & 255) * (1 - p) + ((y >> s) & 255) * p); }; return "rgb(" + c(16) + "," + c(8) + "," + c(0) + ")"; }
  var VARS = ["--sky-top", "--sky-hor", "--far1", "--far2", "--grass", "--g-back", "--g-front", "--tint", "--cloud"];
  function sunTimes() {  // rough Bahrain sunrise/sunset in hours: ~4:45-6:25 and ~16:45-18:35 across the year
    var d = new Date(), day = (Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5, c = Math.cos(2 * Math.PI * (day - 172) / 365);
    return { sr: 5.55 - .8 * c, ss: 17.65 + .85 * c };
  }
  function paintSky() {
    var n = bahrainNow(), h = n.h + n.m / 60, st = sunTimes(), sr = st.sr, ss = st.ss;
    var keys = [[0, "night"], [sr - 1.2, "night"], [sr - .4, "dawn"], [sr + .4, "sunrise"], [sr + 2.2, "morning"], [12.5, "noon"], [ss - 1.6, "afternoon"], [ss - .15, "golden"], [ss + .55, "dusk"], [ss + 1.4, "night"], [24, "night"]];
    var i = 0; while (i < keys.length - 2 && h >= keys[i + 1][0]) i++;
    var a = keys[i], b = keys[i + 1], p = clamp((h - a[0]) / ((b[0] - a[0]) || 1), 0, 1), A = PAL[a[1]], B = PAL[b[1]];
    VARS.forEach(function (v, k) { stage.style.setProperty(v, "color-mix(in oklab, " + A[k] + " " + ((1 - p) * 100).toFixed(1) + "%, " + B[k] + ")"); });
    VARS.forEach(function (v, k) { skyNow[v] = mixHex(A[k], B[k], p); });  // plain colours for the photo
    stage.style.setProperty("--stars", (A[9] + (B[9] - A[9]) * p).toFixed(2));
    stage.style.setProperty("--lights", (A[10] + (B[10] - A[10]) * p).toFixed(2));
    stage.style.setProperty("--palm", "color-mix(in oklab, var(--grass) 55%, #1f3d2e)");
    // the sky's horizon colour meets the floor line
    stage.style.setProperty("--hor-at", ((ground + R) / world.offsetHeight * 100).toFixed(1) + "%");
    // sun on an arc from sunrise to sunset, moon on the night arc; warmer and lower near the horizon
    var fl = ground + R, top = Math.max(60, fl * .14), span = fl - top;
    var ts = (h - sr) / (ss - sr), up = ts > -.04 && ts < 1.04;
    sunEl.style.display = up ? "" : "none";
    if (up) {
      var el = Math.sin(Math.PI * clamp(ts, 0, 1));
      sunEl.style.transform = "translate(" + (W * (.08 + .84 * ts)).toFixed(1) + "px," + (fl - 10 - span * .85 * el).toFixed(1) + "px)";
      stage.style.setProperty("--sun", "color-mix(in oklch, #ff9a4d " + (Math.max(0, 1 - el * 2.2) * 100).toFixed(0) + "%, #ffe7a8)");
    }
    var nightLen = 24 - ss + sr, tn = ((h - ss + 24) % 24) / nightLen, mup = tn > .07 && tn < .95;
    moonEl.style.display = mup ? "" : "none";
    if (mup) moonEl.style.transform = "translate(" + (W * (.1 + .8 * tn)).toFixed(1) + "px," + (fl - 30 - span * .8 * Math.sin(Math.PI * tn)).toFixed(1) + "px)";
  }
  function onBenchX(x) { return x > bench.x + 4 && x < bench.x + bench.w - 4; }
  function surfaceY(b) { var fy = floorY(b); return onBenchX(b.x) && b.y <= bench.top - b.f.r + 3 ? bench.top - b.f.r : fy; }
  function ballStep(dt) {
    var fl = ground + R - ball.r, py = ball.y;
    ball.vy += .7 * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    if (ball.vy > 0 && onBenchX(ball.x) && py + ball.r <= bench.top + 2 && ball.y + ball.r > bench.top) { ball.y = bench.top - ball.r; ball.vy = -ball.vy * .55; }
    if (ball.y > fl) { var h = ball.vy; ball.y = fl; ball.vy = h > 1.5 ? -h * .62 : 0; if (h > 4) tone(220, 160, .06, "sine", .05); }
    if (ball.y >= fl - .5) ball.vx *= Math.pow(.985, dt);
    if (ball.x < ball.r || ball.x > W - ball.r) { ball.x = clamp(ball.x, ball.r, W - ball.r); ball.vx = -ball.vx * .75; }
    if (ball.y < ball.r) { ball.y = ball.r; ball.vy = -ball.vy * .6; }
    ball.rot += ball.vx * dt / ball.r * 57.3;
  }
  ballEl.addEventListener("click", function () { stir(); ball.vx = (ptr.x < ball.x ? 1 : -1) * (5 + Math.random() * 4); ball.vy = -8; });
  // per-friend friendship and favourite food
  store.bf = store.bf || {};
  function bfOf(b) { return store.bf[b.f.id] || 0; }
  function bfAdd(b, n) { store.bf[b.f.id] = clamp(bfOf(b) + n, 0, 1); saveStore(); updateTag(b); }
  function updateTag(b) {
    var n = Math.ceil(bfOf(b) * 3 - 1e-6);  // first heart as soon as there is any friendship
    b.tag.textContent = b.f.player ? b.f.name + T(" (أنت)", " (you)") : b.f.name + (n ? " " + Array(n + 1).join("♥") : "");
  }
  function feedBuddy(b, el) {
    var t = performance.now(), food = el.textContent, fav = b.f.fav === el.dataset.food;
    b.meals = (b.meals || []).filter(function (x) { return t - x < 25000; });
    el.style.transform = "";
    if (b.meals.length >= 3) { bsay(b, line("full")); return; }
    b.meals.push(t); el.style.opacity = "0"; setTimeout(function () { el.style.opacity = ""; }, 5000);
    sfx("munch"); b.joy = 1; b.vy = -6; b.awakeUntil = t + 20000; b.asleep = false;
    bfAdd(b, fav ? .15 : .05);
    bsay(b, fav ? line("favYes", { f: food }) : Math.random() < .5 ? line("favHint", { f: FOOD_NAME[b.f.fav] }) : line("thanksFood", { f: food }));
  }
  // hide and seek: Mawja hides behind a bush; find her with your character, a click on the bush, or a click on her
  var hs = null, hsNext = 0;
  function startHideSeek(t) {
    var m = buddies.filter(function (b) { return b.f.id === "mawja"; })[0];
    if (!m || m.drag) return;
    hs = { b: m, bush: pick(bushes), until: t + 25000, hidden: false };
    m.mode = "hs"; m.next = Infinity;
    say(line("hsStart"), "hs", 1000);
  }
  function endHideSeek(found) {
    var b = hs.b; hs = null; hsNext = performance.now() + 60000;
    b.crouch = false; b.mode = "wander"; b.next = performance.now() + 1500; b.vy = -7;
    if (found) { bsay(b, line("hsFound")); bfAdd(b, .1); setTimeout(function () { say(line("hsYou"), "hs2", 1000); }, 1300); }
    else bsay(b, line("hsLost"));
  }
  function hsStep(t) {
    if (!hs) return;
    var b = hs.b;
    if (b.mode !== "hs") { hs = null; return; }
    b.tx = hs.bush.cx;
    if (!hs.hidden && Math.abs(b.x - hs.bush.cx) < 14) hs.hidden = true;
    b.crouch = hs.hidden;
    if (hs.hidden && player && Math.hypot(player.x - b.x, player.y - b.y) < player.f.r + b.f.r + 14) endHideSeek(true);
    else if (t > hs.until) endHideSeek(false);
  }
  bushes.forEach(function (bu) {
    bu.el.addEventListener("click", function () {
      stir(); bu.el.classList.remove("rustle"); void bu.el.offsetWidth; bu.el.classList.add("rustle");
      if (hs && hs.hidden && hs.bush === bu) endHideSeek(true);
    });
  });
  // stars to collect: walk your character into one, or click it; they unlock colours
  var gems = [], nextGem = performance.now() + 15000;
  function spawnGem() {
    var g = { x: 40 + Math.random() * (W - 120), y: ground + R - 40 - Math.random() * 120, el: document.createElement("button") };
    g.el.type = "button"; g.el.className = "gem"; g.el.setAttribute("aria-label", T("نجمة، اجمعها", "A star, collect it"));
    g.el.addEventListener("click", function () { stir(); collectGem(g); });
    world.appendChild(g.el); gems.push(g);
  }
  function collectGem(g) {
    if (gems.indexOf(g) < 0) return;
    gems.splice(gems.indexOf(g), 1); g.el.remove(); nextGem = performance.now() + 20000 + Math.random() * 25000;
    store.stars = (store.stars || 0) + 1; saveStore(); tickClock();
    tone(660, 660, .1, "sine", .08); tone(880, 880, .1, "sine", .08, .09); tone(1320, 1320, .18, "sine", .07, .18);
    if (NEED[5] === store.stars || NEED[6] === store.stars || NEED[7] === store.stars) { renderSwatches(); say(line("unlock"), "unlock", 500); }
    else say(line("gotStar", { s: num(store.stars) }), "star", 4000);
  }
  function gemStep(t) {
    if (!gems.length && t > nextGem) spawnGem();
    gems.slice().forEach(function (g) { if (player && Math.hypot(player.x - g.x, player.y - g.y) < player.f.r + 12) collectGem(g); });
  }
  // photo: the scene redrawn on a canvas (characters with their current faces), offered as a PNG
  var photoModal = document.getElementById("photo-modal");
  function paintOrb(x, el, cx, cy, r, cols, sx, sy, tilt) {
    x.save(); x.translate(cx, cy + r); x.rotate(tilt * Math.PI / 180); x.scale(sx, sy); x.translate(0, -r);
    var g = x.createRadialGradient(-r * .24, -r * .36, r * .1, 0, 0, r * 1.3);
    g.addColorStop(0, cols[0]); g.addColorStop(.55, cols[1]); g.addColorStop(1, cols[2]);
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); x.fill();
    var face = el.querySelector(".pf, .bf"), m = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(face.getAttribute("transform") || "") || [0, 0, 0];
    x.translate(+m[1], +m[2]); x.fillStyle = "#fff";
    face.querySelectorAll(".pk").forEach(function (e) { var o = +e.style.opacity || 0; if (!o) return; x.globalAlpha = o; x.fillStyle = "#ff7a9c"; x.beginPath(); x.ellipse(+e.getAttribute("cx"), +e.getAttribute("cy"), +e.getAttribute("rx"), +e.getAttribute("ry"), 0, 0, Math.PI * 2); x.fill(); });
    x.globalAlpha = 1; x.fillStyle = "#fff"; x.strokeStyle = "#fff"; x.lineCap = "round";
    face.querySelectorAll(".pe, .pm").forEach(function (e) { if (e.getAttribute("d")) x.fill(new Path2D(e.getAttribute("d"))); });
    face.querySelectorAll(".pbr").forEach(function (e) { var o = +e.style.opacity || 0; if (!o || !e.getAttribute("d")) return; x.globalAlpha = o; x.lineWidth = parseFloat(e.style.strokeWidth) || 2.6; x.stroke(new Path2D(e.getAttribute("d"))); });
    x.globalAlpha = 1;
    x.restore();
  }
  // a background layer drawn from its own SVG, with the hour's colours written into the copy
  function svgImage(el, fill, fix) {
    var cl = el.cloneNode(true); cl.setAttribute("xmlns", "http://www.w3.org/2000/svg"); cl.setAttribute("fill", fill);
    cl.setAttribute("width", el.clientWidth); cl.setAttribute("height", el.clientHeight); cl.removeAttribute("style");
    if (fix) fix(cl);
    return new Promise(function (res) {
      var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { res(null); };
      im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(cl));
    });
  }
  function snap() {
    var lights = getComputedStyle(stage).getPropertyValue("--lights").trim() || "0";
    return Promise.all([
      svgImage(far1, skyNow["--far1"] || "#999"),
      svgImage(far2, skyNow["--far2"] || "#777", function (cl) {
        cl.querySelectorAll(".win").forEach(function (w) { w.setAttribute("fill", "#ffd27a"); w.setAttribute("opacity", lights); });
        cl.querySelectorAll(".slit").forEach(function (w) { w.setAttribute("fill", "rgba(0,0,0,.25)"); });
      }),
      svgImage(palmEl, getComputedStyle(palmEl.querySelector(".fronds")).fill, function (cl) { cl.querySelector(".trunk").setAttribute("fill", getComputedStyle(palmEl.querySelector(".trunk")).fill); })
    ]).then(function (img) { return paintScene(img); });
  }
  function paintScene(img) {
    var s = 2, H = world.offsetHeight, c = document.createElement("canvas"), x = c.getContext("2d"), cs = getComputedStyle(stage);
    var tok = function (n) { return cs.getPropertyValue(n).trim(); };
    c.width = W * s; c.height = H * s; x.scale(s, s);
    var col = function (v) { return skyNow[v] || "#808080"; }, fl = ground + R;
    var gr = x.createLinearGradient(0, 0, 0, fl); gr.addColorStop(0, col("--sky-top")); gr.addColorStop(1, col("--sky-hor")); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    x.globalAlpha = +tok("--stars") || 0; x.fillStyle = "#fff"; sky.querySelectorAll(".star").forEach(function (e) { x.fillRect(e.offsetLeft, e.offsetTop, 2, 2); }); x.globalAlpha = 1;
    [[sunEl, "#ffe7a8", 20], [moonEl, "#f3efe0", 13]].forEach(function (o) {  // sun or moon where it is now
      if (o[0].style.display === "none") return;
      var m = /translate\(([-\d.]+)px,\s*([-\d.]+)px/.exec(o[0].style.transform); if (!m) return;
      x.fillStyle = o[1]; x.beginPath(); x.arc(+m[1], +m[2], o[2], 0, Math.PI * 2); x.fill();
    });
    var wr = world.getBoundingClientRect(), z = wr.width / world.offsetWidth || 1;
    x.fillStyle = col("--cloud"); x.globalAlpha = .85;
    clouds.querySelectorAll("i").forEach(function (ci) {  // each cloud: the same four soft lobes as its CSS
      var r = ci.getBoundingClientRect(), cx = (r.left - wr.left) / z, cy = (r.top - wr.top) / z, w = r.width / z, h = r.height / z;
      [[.30, .70, 40, 22], [.55, .50, 46, 30], [.78, .72, 36, 20], [.54, .86, 70, 12]].forEach(function (e) { x.beginPath(); x.ellipse(cx + e[0] * w, cy + e[1] * h, e[2] / 170 * w, e[3] / 52 * h, 0, 0, Math.PI * 2); x.fill(); });
    });
    x.globalAlpha = 1;
    [[far1, img[0]], [far2, img[1]]].forEach(function (p) { if (p[1]) x.drawImage(p[1], 0, H - parseFloat(p[0].style.bottom) - p[0].clientHeight, W, p[0].clientHeight); });
    x.fillStyle = col("--g-back"); x.fillRect(0, fl, W, H - fl); x.fillStyle = col("--grass"); x.fillRect(0, fl, W, 4);
    var pm = /translate\(([-\d.]+)px,\s*([-\d.]+)px/.exec(palmEl.style.transform);
    if (img[2] && pm) x.drawImage(img[2], +pm[1], +pm[2], 120, 150);
    x.fillStyle = "#9a6a42"; x.fillRect(bench.x, bench.top, bench.w, 8); x.fillRect(bench.x + 10, bench.top + 8, 5, 20); x.fillRect(bench.x + bench.w - 15, bench.top + 8, 5, 20);
    x.fillStyle = tok("--surface"); x.beginPath(); x.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); x.fill(); x.strokeStyle = tok("--border"); x.stroke();
    buddies.forEach(function (b) { if (!b.f.player) paintOrb(x, b.el, b.x, b.y, b.f.r, [b.f.c1, b.f.c2, b.f.c3], clamp(b.sx, .8, 1.25), clamp(b.sy, .75, 1.22), b.tilt); });
    // resolved stop colours can be oklab()/color(); fall back to the token if this canvas can't parse them
    var mst = orb.querySelectorAll("stop"), okc = function (v, fb) { x.fillStyle = "#010203"; x.fillStyle = v; return x.fillStyle === "#010203" ? fb : v; };
    paintOrb(x, orb, pos.x, pos.y, R, [0, 1, 2].map(function (i) { return okc(getComputedStyle(mst[i]).stopColor, tok(i === 2 ? "--cmp-deep" : "--cmp")); }), clamp(sp.sx.v, .8, 1.25), clamp(sp.sy.v, .75, 1.22), sp.tilt.v);
    if (player) paintOrb(x, player.el, player.x, player.y, player.f.r, [player.f.c1, player.f.c2, player.f.c3], clamp(player.sx, .8, 1.25), clamp(player.sy, .75, 1.22), player.tilt);
    var bc = getComputedStyle(document.querySelector(".play")).getPropertyValue("--bush").trim() || tok("--cmp");
    x.fillStyle = bc; bushes.forEach(function (b) { var fl = ground + R; [[-17, -16, 17], [3, -24, 22], [21, -15, 16]].forEach(function (k) { x.beginPath(); x.arc(b.cx + k[0], fl + k[1] + 4, k[2], 0, Math.PI * 2); x.fill(); }); });
    x.globalCompositeOperation = "multiply"; x.fillStyle = col("--tint"); x.fillRect(0, 0, W, H); x.globalCompositeOperation = "source-over";  // the light of the hour
    x.font = "700 12px Cairo, sans-serif"; x.textAlign = "center"; x.fillStyle = tok("--muted");
    buddies.forEach(function (b) { x.fillText(b.tag.textContent, b.x, b.y - b.f.r - 10); });
    var ex = EN ? 16 : W - 16; x.direction = EN ? "ltr" : "rtl"; x.textAlign = EN ? "left" : "right"; x.shadowColor = "rgba(0,0,0,.45)"; x.shadowBlur = 4; x.fillStyle = "#fff"; x.font = "800 16px Cairo, sans-serif"; x.fillText(T("هكوله · دلمو", "Hakolah · Dilmo"), ex, 30);
    x.font = "600 11px Cairo, sans-serif"; x.fillText(clock.textContent, ex, 48); x.shadowBlur = 0;
    return c;
  }
  document.getElementById("photo-btn").addEventListener("click", function () {
    stir(); tone(1200, 900, .08, "square", .03);
    snap().then(function (c) {
      var url = c.toDataURL("image/png");
      document.getElementById("photo-img").src = url; document.getElementById("photo-save").href = url;
      photoModal.hidden = false; document.getElementById("photo-close").focus();
    });
  });
  document.getElementById("photo-close").addEventListener("click", function () { photoModal.hidden = true; });
  photoModal.addEventListener("click", function (e) { if (e.target === photoModal) photoModal.hidden = true; });
  addEventListener("keydown", function (e) { if (e.key === "Escape") photoModal.hidden = true; });

  function update(t, dt) {
    if (mainAway) {  // only friends (and the visitor) are around
      buddies.forEach(function (b) { buddyStep(b, t, dt); }); collideAll(t); ballStep(dt); gemStep(t); hsStep(t); return;
    }
    var idle = t - lastInput;
    if (drag && !cheek && !drag.moved && !drag.shy && !drag.slipped && t - drag.t > 650) { drag.shy = true; mood.shy = 1; say(line("shy"), "shy", 3000); }
    if (idle > (isNight ? 20000 : 40000) && !drag) mood.sleepy = Math.min(1, mood.sleepy + .0025 * dt);
    var asleep = mood.sleepy > .85;
    if (asleep && (bub.hidden || bub.textContent !== "Zzz…")) say("Zzz…");
    if (asleep && t > nextSnore) { nextSnore = t + 3200; sfx("snore"); }
    if (song) {
      if (t - song.t0 > song.len * 1000 + 200) { song = null; nextSong = t + 30000; say(line("singEnd"), "singEnd", 1000); }
      else {
        mood.sleepy = 0; mood.calm = Math.max(mood.calm, .8);
        var sn = songNote(t);
        if (sn && sn.k !== song.cur) { song.cur = sn.k; noteFx(); sp.sy.vel += .03; }
      }
    }
    if (!song && !drag && !asleep && idle > 3500 && t > nextIdle) { idleAct(idle); nextIdle = t + 2200 + Math.random() * 3200; }
    if (!greeted) {
      greeted = true;
      say(store.visits > 1 ? line("greetN", { n: num(store.visits) }) : line("greet1"), "hi", 1000);
      setTimeout(function () { say(line("ph_" + phase), "phase", 1000); }, 4200);
    }
    // anticipation: food on the way
    if (foodDrag) {
      var fc = foodCenter(), fdx = fc.x - pos.x, fdy = fc.y - pos.y, fd = Math.hypot(fdx, fdy) || 1;
      mood.hungry = clamp(1 - (fd - R) / 220, 0, 1); gaze = { x: fdx / fd, y: fdy / fd, until: t + 100 };
      if (mood.hungry > .5) say(line("want"), "want", 5000);
    } else mood.hungry *= Math.pow(.9, dt);
    // chase the pointer along the floor in little hops, pounce when close
    var inStage = ptr.has && !ptr.out && ptr.x > 0 && ptr.x < W && ptr.y > 0 && ptr.y < ground + R;
    var pdx = ptr.x - pos.x, onFloor = pos.y >= ground - 1;
    if (!song && !circ.last && !drag && !anyBuddyDrag() && !foodDrag && !asleep && !stick && inStage && t - ptr.moveT < 1200 && Math.abs(pdx) > 120) chaseT += 16.67 * dt;
    else if (!inStage || Math.abs(pdx) < 80) chaseT = 0;
    if (chaseT > 900 && onFloor && !drag) {
      if (Math.abs(pdx) < 130) { pos.vy = -7; pos.vx = Math.sign(pdx) * 3; chaseT = 0; mood.joy = Math.min(1, mood.joy + .3); say(line("catch"), "catch", 6000); }
      else { pos.vx = Math.sign(pdx) * 5; pos.vy = -3.5; }
    }

    mood.joy += (.15 - mood.joy) * .004 * dt;
    mood.dizzy *= Math.pow(.985, dt); mood.annoy *= Math.pow(.996, dt); mood.startle *= Math.pow(.93, dt);
    mood.tickle *= Math.pow(.95, dt); mood.curious *= Math.pow(.98, dt); mood.calm *= Math.pow(.99, dt);
    fadeFeel(mood, dt);
    if (!drag || !drag.shy) mood.shy *= Math.pow(.995, dt);

    if (drag && drag.moved && pos.y < ground - 120) { mood.fear = Math.min(1, mood.fear + .006 * dt); mood.heart = Math.min(1, mood.heart + .005 * dt); }
    if (stick && t > stick.until) stick = null;
    if (!drag || !drag.moved) {
      pos.vy += (stick ? .02 : .75) * dt; pos.x += pos.vx * dt; pos.y += pos.vy * dt; pos.vx *= Math.pow(.99, dt);
      if (pos.y > ground) {
        var hit = pos.vy; pos.y = ground; pos.vy = hit > 2.5 ? -hit * .45 : 0; pos.vx *= .82;
        if (hit > 2.5) { sp.sy.vel -= Math.min(hit, 18) * .012; sp.sx.vel += Math.min(hit, 18) * .009; dent(0, R, Math.min(hit, 20) * .5); if (hit > 5) sfx("boing", hit); }
        if (hit > 22) { mood.annoy = Math.min(1, mood.annoy + .25); feel(mood, "conf", .5); say(line("ouch"), "ouch", 2500); }
      }
      if (pos.x < R || pos.x > W - R) {
        var wv = Math.abs(pos.vx), ws = pos.x < R ? -1 : 1;
        if (wv > 3) { sp.sx.vel -= wv * .012; dent(ws * R, 0, Math.min(wv, 30) * .45); }
        pos.x = clamp(pos.x, R, W - R);
        if (wv > 12 && pos.y < ground - 30) { stick = { until: t + 1100 }; pos.vx = 0; pos.vy = 0; sfx("splat"); say(line("wall"), "wall", 5000); }
        else pos.vx = -pos.vx * .6;
      }
      if (pos.y < R) { pos.y = R; pos.vy = -pos.vy * .5; }
    }

    buddies.forEach(function (b) { buddyStep(b, t, dt); });
    collideAll(t);
    ballStep(dt); gemStep(t); hsStep(t);

    var lx = 0, ly = 0;
    if (asleep) ly = .4;
    else if (t - typing < 1500) ly = .9;
    else if (t < gaze.until) { lx = gaze.x; ly = gaze.y; }
    else if (player && t - (ptr.moveT || 0) > 1500) {  // keeps an eye on your character when the pointer is still
      var pdx2 = player.x - pos.x, pdy2 = player.y - pos.y, pd2 = Math.hypot(pdx2, pdy2) || 1;
      lx = pdx2 / pd2; ly = pdy2 / pd2 * .6;
    }
    else if (ptr.has && !ptr.out) {
      var dx = ptr.x - pos.x, dy = ptr.y - pos.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 220);
      lx = dx / d * k; ly = dy / d * k;
    }
    if (mood.shy > .3) { ly = .8; lx *= .3; }
    sp.lx.t = lx; sp.ly.t = ly;

    var j = mood.joy, sl = mood.sleepy, an = mood.annoy, st = mood.startle, sh = mood.shy, tk = mood.tickle, cu = mood.curious, jp = Math.max(j, 0);
    sp.ery.t = 9.1 * (1 + .16 * j + .35 * st + .1 * cu - .5 * sl - .28 * an - .15 * sh - .35 * mood.calm - .3 * mood.pinch - (t < eatUntil ? .2 : 0) + .12 * mood.listen);
    sp.erx.t = 6.4 * (1 + .18 * st - .18 * sl - .12 * an);
    sp.ey.t = -2.2 * j + 2.5 * sl + 2 * sh + 1.5 * mood.calm;
    sp.mry.t = 5.7 * (1 + .7 * jp + .9 * st - .55 * sl - .45 * an - .45 * sh + .5 * tk * Math.abs(Math.sin(t / 60)) + .9 * mood.hungry - .3 * mood.listen);
    sp.mrx.t = 4.3 * (1 + .35 * jp + .45 * st - .3 * sl - .25 * an - .2 * sh + .3 * mood.pinch + .4 * mood.hungry);
    sp.mx.t = an * 6 * side;
    var air = Math.min(.18, Math.abs(pos.vy) * .01);
    sp.sy.t = 1 + air - .16 * sh + (asleep ? Math.sin(t / 700) * .025 : 0) + (t < eatUntil ? Math.sin(t / 85) * .03 : 0);
    sp.sx.t = 1 - air * .6 + .1 * sh;
    sp.tilt.t = clamp(pos.vx * 1.4, -25, 25) + lx * 7 + mood.listen * 8 + (t - singAt < 1200 ? Math.sin(t / 260) * 4 : 0) + (song ? Math.sin(t / 650) * 6 : 0) - an * 12 * side + (reduce ? 0 : Math.sin(t / 1300) * 2.5) + mood.dizzy * Math.sin(t / 110) * 14;
    for (var n in sp) { var s = sp[n]; s.vel = s.vel * Math.pow(s.d, dt) + (s.t - s.v) * s.k * dt; s.v += s.vel * dt; }
    softStep(t, dt);

    if (!asleep && t > nextBlink) { blinkAt = t; nextBlink = t + (Math.random() < .2 ? 320 : 2200 + Math.random() * 4200); }
  }

  function draw(t) {
    var b = t - blinkAt < 240 ? Math.sin(Math.PI * (t - blinkAt) / 240) : 0;
    var dz = mood.dizzy, ox = Math.cos(t / 90) * 2.5 * dz, oy = Math.sin(t / 90) * 2.5 * dz;
    var jx = reduce ? 0 : (Math.random() - .5) * 3 * mood.tickle;
    var rx = sp.erx.v * (1 - .06 * b), ry = Math.max(sp.ery.v * (1 - .34 * b), rx * (b ? .95 : 1.08));
    var mf = t - mouthAt < 400 ? Math.sin(Math.PI * (t - mouthAt) / 400) : 0;
    var mrx = Math.max(sp.mrx.v, 1.5), mry = Math.max(sp.mry.v, mrx * 1.08) * (1 - .5 * mf);
    mrx *= 1 - .3 * mf;
    if (t < eatUntil) { var ch = Math.abs(Math.sin(t / 85)); mry *= .45 + .7 * ch; mrx *= .8 + .25 * ch; }
    else if (speech && t < talkUntil) {
      var sp2 = speech.syl[Math.floor((t - speech.t0) / SYL)];
      if (sp2) {
        var o2 = Math.pow(Math.sin(Math.PI * ((t - speech.t0) % SYL) / SYL), .6), F = MOUTH[sp2.v];
        mry *= .7 + F[0] * o2; mrx *= 1 + F[1] * o2;
      }
    }
    var sg = t - singAt < 380 ? Math.sin(Math.PI * (t - singAt) / 380) : 0;
    mry *= 1 + .7 * sg; mrx *= 1 + .2 * sg;
    var cs2 = song && songNote(t);
    if (cs2) {  // mouth follows the sung vowel: oo small and round, aa open, ee a little wider
      // held open through the note, closing only at its edges
      var op = Math.sqrt(Math.min(1, Math.sin(Math.PI * clamp(cs2.p, 0, 1)) * 1.6)), v = cs2.n.v;
      mry *= 1 + (v === "aa" ? 1.6 : v === "oo" ? 1 : .6) * op; mrx *= 1 + (v === "oo" ? -.3 : v === "aa" ? .3 : .4) * op;
    }
    mry = Math.max(mry, mrx * 1.02);
    var ey = -4 + sp.ey.v, dd = pathD();
    bodyPath.setAttribute("d", dd); grainPath.setAttribute("d", dd);
    var cpx = cheek ? cheek.px * .2 : 0, cpy = cheek ? cheek.py * .2 : 0;
    orb.style.transform = "translate(" + (pos.x - HALF + jx).toFixed(1) + "px," + (pos.y - HALF).toFixed(1) + "px)";
    body.setAttribute("transform", "rotate(" + sp.spin.v.toFixed(1) + ") translate(0 " + R + ") rotate(" + sp.tilt.v.toFixed(2) +
      ") scale(" + clamp(sp.sx.v * (1 + .035 * hbPulse), .8, 1.25).toFixed(3) + " " + clamp(sp.sy.v * (1 + .035 * hbPulse), .75, 1.22).toFixed(3) + ") translate(0 " + -R + ")");
    face.setAttribute("transform", "translate(" + (sp.lx.v * 7 + ox + cpx).toFixed(2) + " " + (sp.ly.v * 5 + oy + cpy).toFixed(2) + ")");
    var rys = [0, 1].map(function (i) {
      var w = t - wink[i] < 380 ? Math.sin(Math.PI * (t - wink[i]) / 380) : 0;
      var near = cheek && (i ? cheek.gx > 0 : cheek.gx < 0) ? 1 - .25 * mood.pinch : 1;
      return ry * (1 - .5 * w) * near;
    });
    var fdt = clamp((t - lastDraw) / 16.67, 0, 4); lastDraw = t;
    var asleepNow = mood.sleepy > .85;
    hbPulse = renderFace(FK, 1, { joy: mood.joy, anger: mood.annoy, fear: mood.fear, sad: mood.sad, shy: mood.shy, love: mood.love, conf: Math.max(mood.conf, mood.dizzy * .6), heart: mood.heart, sleepy: asleepNow ? 1.7 : mood.sleepy },
      { ey: ey, rx: rx, ry: rys, mx: sp.mx.v, mcy: 18 + sp.ey.v * .5, mrx: mrx, mry: mry, dd: dd, busy: t < eatUntil || !!song || (speech && t < talkUntil) }, t, fdt,
      function (h) { sfx("beat", h); });
    var sc = clamp(1 - (ground - pos.y) / 300, .35, 1);
    shadowEl.style.transform = "translate(" + (pos.x - 40).toFixed(1) + "px," + (ground + R - 6) + "px) scale(" + sc.toFixed(2) + ")";
    shadowEl.style.opacity = sc.toFixed(2);
    if (!bub.hidden) {
      if (mood.sleepy <= .85 && t > +bub.dataset.until) bub.hidden = true;
      else {
        // keep the whole bubble inside the stage: clamp sideways, flip below him when there is no room above
        var bw = bub.offsetWidth, bh = bub.offsetHeight, bx = clamp(pos.x * K - bw / 2, 8, Math.max(8, W * K - bw - 8)), by = (pos.y - R) * K - 14 - bh;
        if (by < 8) by = Math.min((pos.y + R) * K + 14, (ground + R) * K - bh - 4);
        bub._x = bx; bub._y = Math.max(8, by); bub._w = bw; bub._h = bh;  // placed by layoutBubbles()
      }
    }
    buddies.forEach(function (b) { drawBuddy(b, t); });
    layoutBubbles();
    ballEl.style.transform = "translate(" + (ball.x - 11).toFixed(1) + "px," + (ball.y - 11).toFixed(1) + "px) rotate(" + ball.rot.toFixed(1) + "deg)";
    gems.forEach(function (g) { g.el.style.transform = "translate(" + (g.x - 17).toFixed(1) + "px," + (g.y - 17 + Math.sin(t / 400) * 4).toFixed(1) + "px)"; });
  }

  function frame(t) {
    if (!running) { raf = 0; return; }
    raf = requestAnimationFrame(frame);
    var dt = Math.min(2, (t - last) / 16.67); last = t;
    if (t > hitStopUntil) update(t, dt);
    draw(t);
  }
  new IntersectionObserver(function (en) {
    running = en[0].isIntersecting;
    if (running && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }).observe(stage);
  // the stage height depends on the header height, which is only known after load: re-measure whenever it changes size
  new ResizeObserver(function () { measure(); placeProps(); }).observe(stage);
  var sideways = matchMedia("(orientation: landscape) and (max-height: 500px)");
  function fitSideways() { if (sideways.matches) stage.scrollIntoView({ block: "start" }); }
  sideways.addEventListener("change", fitSideways); fitSideways();
  FK = faceKit(face, body); applyQuiet();
  measure(); placeProps(); renderSwatches(); spawnFriends(); tickClock(); setInterval(tickClock, 20000); draw(performance.now());
})();
