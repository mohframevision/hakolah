(function () {
  var stage = document.getElementById("play"), orb = document.getElementById("orb");
  var shadowEl = document.getElementById("orb-shadow"), bub = document.getElementById("orb-say");
  var body = orb.querySelector(".pb"), face = orb.querySelector(".pf");
  var eyes = orb.querySelectorAll(".pe"), mouth = orb.querySelector(".pm"), world = document.getElementById("world");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var R = 48, HALF = 70;
  function clamp(v, a, b) { return Math.min(Math.max(v, a), b); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function spring(v, k, d) { return { v: v, t: v, vel: 0, k: k, d: d }; }

  var EN = document.documentElement.lang === "en";
  function T(ar, en) { return EN ? en : ar; }
  function num(n) { var s = String(n); return EN ? s : s.replace(/d/g, function (d) { return "٠١٢٣٤٥٦٧٨٩"[d]; }); }
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
    free: ["joy", ["حسناً حسناً، أنا قادم معك!", "انفلتُّ! سآتي معك.", "لقد غلبتني، سأتبعك.", "حسناً، خذني معك!", "أنا معك أينما ذهبت!", "لا داعي للشدّ، سآتي!"]],
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
    replyFood: ["joy", ["هل تريد أن أقترح لك مطعماً؟", "أنا أحب الكرك!", "الطعام موضوعي المفضّل!", "في الموقع ستجد مطاعم كثيرة."]],
    replyLove: ["calm", ["وأنا أحب صحبتك يا {n}.", "أنت صديق رائع.", "صداقتك تسعدني."]],
    replyQ: ["neutral", ["سؤال جميل!", "دعني أفكر…", "لا أعرف، ما رأيك أنت؟", "ربما!"]],
    replyAny: ["neutral", ["فهمتك يا {n}.", "كلامك جميل.", "حقاً؟", "أكمل، أنا أسمعك."]],
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
    free: ["joy", ["Okay okay, I'm coming with you!", "I slipped free! I'll come along.", "You win, I'll follow you.", "Fine, take me with you!", "No need to pull, I'm coming!"]],
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
    replyFood: ["joy", ["Want me to suggest a restaurant?", "I love karak!", "Food is my favourite topic!", "You'll find plenty of restaurants on the site."]],
    replyLove: ["calm", ["I love your company too, {n}.", "You're a great friend.", "Your friendship makes me happy."]],
    replyQ: ["neutral", ["Good question!", "Let me think…", "I don't know, what do you think?", "Maybe!"]],
    replyAny: ["neutral", ["I hear you, {n}.", "Nicely said.", "Really?", "Go on, I'm listening."]],
    buddyReply: ["joy", ["I agree with him!", "Me too, {n}!", "Well said, {n}."]],
    sing: ["calm", ["A calm song for you.", "Let me sing a little.", "Relax and listen.", "A tune to settle down.", "I sing when I'm relaxed.", "A little song before a nap.", "This is my favourite tune."]],
    singEnd: ["calm", ["That's the end of the song.", "I hope it relaxed you.", "Thanks for listening.", "A short one.", "I'll sing for you again later."]]
  };
  var MOODS = EN ? MOODS_EN : MOODS_AR, LINES = EN ? LINES_EN : LINES_AR;
  var recent = [];
  function line(ev, vars) {
    var e = LINES[ev], m = MOODS[e[0]], s, tries = 0;
    do { s = pick(m.pre) + pick(e[1]) + pick(m.post); } while (recent.indexOf(s) >= 0 && ++tries < 25);
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
  var mood = { joy: .2, startle: 0, dizzy: 0, annoy: 0, sleepy: 0, shy: 0, tickle: 0, curious: 0 };
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
    stage.appendChild(s); s.addEventListener("animationend", function () { s.remove(); });
  }
  // singing: a soft digital voice (triangle + vibrato through vowel formants) gliding through slow lullaby phrases in C major
  var song = null, nextSong = 0;
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
  function quietSay(text, t) { bub.textContent = text; bub.hidden = false; bub.dataset.until = t + 700; bub._since = performance.now(); }
  function foodCenter() {
    var r = foodDrag.el.getBoundingClientRect();
    return toStage({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
  }
  function adiff(a, b) { var d = a - b; return Math.atan2(Math.sin(d), Math.cos(d)); }
  function local(px, py) {
    var dx = px - pos.x, dy = py - pos.y, r = -(sp.spin.v + sp.tilt.v) * Math.PI / 180;
    return { x: dx * Math.cos(r) - dy * Math.sin(r), y: dx * Math.sin(r) + dy * Math.cos(r) };
  }
  function dent(lx, ly, amt) {
    var a = Math.atan2(ly, lx);
    pts.forEach(function (p) { var w = Math.exp(-Math.pow(adiff(p.a, a), 2) / .3); p.vx -= Math.cos(p.a) * amt * w; p.vy -= Math.sin(p.a) * amt * w; });
  }
  function softStep(t, dt) {
    var reachA = 0, reachAmt = 0;
    var tp = foodDrag ? foodCenter() : (!drag && ptr.has && !ptr.out && mood.sleepy < .6 && t - ptr.moveT > 300 ? ptr : null);
    if (tp) {
      var d = Math.hypot(tp.x - pos.x, tp.y - pos.y), lim = foodDrag ? 140 : 80;
      if (d > R + 4 && d < R + lim) { var l = local(tp.x, tp.y); reachA = Math.atan2(l.y, l.x); reachAmt = (1 - (d - R) / lim) * (foodDrag ? 16 : 12); }
    }
    pts.forEach(function (p) {
      var tx = 0, ty = 0, w;
      if (cheek) { w = .3 + .7 * Math.exp(-Math.pow(adiff(p.a, cheek.a), 2) / .9); tx = cheek.px * w; ty = cheek.py * w; }
      else if (reachAmt) { w = Math.exp(-Math.pow(adiff(p.a, reachA), 2) / .2); tx = Math.cos(p.a) * reachAmt * w; ty = Math.sin(p.a) * reachAmt * w; }
      p.vx = p.vx * Math.pow(.8, dt) + (tx - p.x) * .22 * dt; p.x += p.vx * dt;
      p.vy = p.vy * Math.pow(.8, dt) + (ty - p.y) * .22 * dt; p.y += p.vy * dt;
    });
    // relax each rim point toward its neighbours so no corner ever forms
    var ox = pts.map(function (p) { return p.x; }), oy = pts.map(function (p) { return p.y; });
    pts.forEach(function (p, i) {
      var a = (i - 1 + N) % N, b = (i + 1) % N;
      p.x = .5 * ox[i] + .25 * (ox[a] + ox[b]); p.y = .5 * oy[i] + .25 * (oy[a] + oy[b]);
    });
  }
  function pathD() {
    var P = pts.map(function (p) { return [Math.cos(p.a) * R + p.x, Math.sin(p.a) * R + p.y]; });
    var s = "M" + P[0][0].toFixed(2) + " " + P[0][1].toFixed(2);
    for (var i = 0; i < N; i++) {
      var p0 = P[(i - 1 + N) % N], p1 = P[i], p2 = P[(i + 1) % N], p3 = P[(i + 2) % N];
      s += "C" + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(2) + " " + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(2) + " " +
        (p2[0] - (p3[0] - p1[0]) / 6).toFixed(2) + " " + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(2) + " " + p2[0].toFixed(2) + " " + p2[1].toFixed(2);
    }
    return s + "Z";
  }

  function measure() {
    W = stage.clientWidth; ground = stage.clientHeight - R - 14;
    if (!pos.x) { pos.x = W / 2; pos.y = ground; }
    pos.x = clamp(pos.x, R, W - R); pos.y = Math.min(pos.y, ground);
  }
  // wide screens zoom the whole page (--page-zoom): client px ÷ zoom = the stage CSS px everything is drawn in
  function toStage(e) { var r = stage.getBoundingClientRect(), z = r.width / stage.offsetWidth || 1; return { x: (e.clientX - r.left) / z - stage.clientLeft, y: (e.clientY - r.top) / z - stage.clientTop }; }
  function say(text, key, gap) {
    var t = performance.now();
    if (key) { if (lastSay[key] && t - lastSay[key] < (gap || 4000)) return; lastSay[key] = t; }
    if (mainAway) { var fr = others(); if (fr.length) bsay(pick(fr), text); return; }  // he left: a friend speaks instead
    bub.textContent = text; bub.hidden = false; bub.dataset.until = t + 1900; bub._since = t;
    if (text !== "Zzz…") {
      var sy = syllables(text), q = /[؟?]\s*$/.test(text);
      speech = { t0: t, syl: sy }; talkUntil = t + sy.length * SYL + 150; babble(sy, q);
    }
  }
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
    if (idle > 9000) say(line("bored"), "bored", 25000);
    if (r < .35) gaze = { x: Math.random() * 2 - 1, y: Math.random() * 1.2 - .7, until: t + 900 + Math.random() * 1400 };
    else if (r < .55 && !reduce) pos.vy = -4 - Math.random() * 4;
    else if (r < .7 && !reduce) { pos.vx = (Math.random() < .5 ? -1 : 1) * (2 + Math.random() * 3); pos.vy = -3; }
    else if (r < .85 && others().length) {  // glances at one of his friends
      var o = pick(others()), dx = o.x - pos.x, dy = o.y - pos.y, d = Math.hypot(dx, dy) || 1;
      gaze = { x: dx / d, y: dy / d, until: t + 1600 };
    } else if (idle > 8000 && t > nextSong) sing(); else say(line("hum"), "hum", 9000);
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
    if (!drag && d < 170 && speed > 45) { mood.startle = Math.min(1, mood.startle + .7); say(line("startle"), "startle", 6000); }
    if (drag && cheek) {
      var l = local(p.x, p.y), cx = l.x - cheek.gx, cy = l.y - cheek.gy, len = Math.hypot(cx, cy) || 1;
      if (len > 70) { cheek = null; mood.pinch = 0; drag.moved = true; drag.ox = p.x - pos.x; drag.oy = p.y - pos.y; say(line("free"), "free", 4000); }
      else {
        var k = 34 * Math.tanh(len / 45) / len; cheek.px = cx * k; cheek.py = cy * k; mood.pinch = Math.min(1, len / 60); sfx("squeak", mood.pinch);
        if (len > 14) say(line(cheek.side ? "cheek" : "stretch"), "pinch", 3500);
      }
    } else if (drag) {
      if (!drag.moved && Math.hypot(p.x - drag.sx, p.y - drag.sy) > 6) { drag.moved = true; mood.shy = 0; say(line("lift"), "lift", 5000); }
      if (drag.moved) {
        var nx = clamp(p.x - drag.ox, R, W - R), ny = clamp(p.y - drag.oy, R, ground);
        drag.vx = nx - pos.x; drag.vy = ny - pos.y; pos.x = nx; pos.y = ny;
        var sg = Math.abs(drag.vx) > 8 ? Math.sign(drag.vx) : 0;
        if (sg && sg !== drag.lastSign) { drag.lastSign = sg; drag.rev.push(now); }
        drag.rev = drag.rev.filter(function (x) { return now - x < 1000; });
        if (drag.rev.length >= 4) { mood.dizzy = Math.min(1, mood.dizzy + .05); say(line("shake"), "shake", 3000); }
        // rocking him slowly side to side, like a cradle
        var rs = Math.abs(drag.vx) > 1.2 && Math.abs(drag.vx) < 7 ? Math.sign(drag.vx) : 0;
        if (rs && rs !== drag.cSign) { drag.cSign = rs; drag.crad.push(now); }
        drag.crad = drag.crad.filter(function (x) { return now - x < 4000; });
        if (drag.crad.length >= 5 && !drag.rev.length && !song) { drag.crad = []; sing(); }
      }
    } else if (d < R) {
      var lp = local(p.x, p.y);
      if (lp.y < -8 && speed > .5 && speed < 9) { mood.calm = Math.min(1, mood.calm + .02); befriend(.003); if (mood.calm > .9 && !song && performance.now() > nextSong) sing(); else if (mood.calm > .6 && !song) say(line("pet"), "pet", 6000); }
      var s = Math.sign(dx);
      if (s && s !== rubSign) { rubSign = s; rubTimes.push(now); }
      rubTimes = rubTimes.filter(function (t) { return now - t < 900; });
      if (rubTimes.length >= 5) { mood.tickle = 1; mood.joy = Math.min(1, mood.joy + .04); befriend(.002); say(line("tickle"), "tickle", 3000); }
    }
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
      if (s > 20) { mood.dizzy = Math.min(1, mood.dizzy + s / 60); sfx("whoosh"); say(line("throw"), "throw", 2500); }
    } else if (d.shy) { mood.shy = 0; pos.vy = -7; sp.sy.vel += .15; say(line("unshy"), "unshy", 4000); }
    else if (performance.now() - d.t < 300) poke(d.lx, d.ly);
  }
  orb.addEventListener("pointerup", release);
  orb.addEventListener("pointercancel", release);
  orb.addEventListener("dblclick", function () { sp.spin.t += 360; mood.joy = 1; pos.vy = -12; say(line("spin"), "spin", 2000); });

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
    if (running) { mood.joy = Math.max(-.5, mood.joy - .15); say(line("left"), "left", 8000); }
  });

  // ---- friends: smaller orbs with their own colour, voice and temperament ----
  var FRIENDS = [
    { id: "shams", name: T("شمس", "Shams"), c1: "#f6cf6a", c2: "#e0a82e", c3: "#a8740f", r: 30, pitch: 620, energy: 1.25, shy: false, harm: 2, fav: "karak" },
    { id: "mawja", name: T("موجة", "Mawja"), c1: "#8cc4ec", c2: "#4a90c8", c3: "#24547d", r: 26, pitch: 360, energy: .7, shy: true, harm: -3, fav: "samosa" },
    { id: "jamra", name: T("جمرة", "Jamra"), c1: "#f2a58f", c2: "#e07a5f", c3: "#9c4630", r: 28, pitch: 500, energy: 1, shy: false, harm: 4, fav: "burger" }
  ];
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
      '<g class="bb"><circle r="' + r + '" fill="url(#' + gid + ')" filter="url(#pg-sf)"/><circle class="grain" r="' + (r - 1) + '" filter="url(#pg-gn)"/>' +
      '<g class="bf">' + eye(-1) + eye(1) + '<ellipse class="pm" cy="' + r * .37 + '" rx="' + r * .09 + '" ry="' + r * .12 + '"/></g></g>';
    var sh = document.createElement("div"); sh.className = "orb-shadow"; sh.style.width = r * 1.6 + "px";
    var bb = document.createElement("p"); bb.className = "orb-say"; bb.hidden = true;
    if (f.player) { stage.appendChild(sh); stage.appendChild(el); stage.appendChild(bb); }
    else { world.insertBefore(sh, orb); world.insertBefore(el, orb); world.appendChild(bb); }
    var tag = document.createElement("div"); tag.className = "name-tag";
    if (f.player) { stage.appendChild(tag); el.setAttribute("aria-label", T("شخصيتك ", "Your character ") + f.name); el.style.zIndex = 4; } else world.appendChild(tag);  // the visitor walks in front of the bushes
    var b = { f: f, el: el, sh: sh, bub: bb, body: el.querySelector(".bb"), face: el.querySelector(".bf"), eyes: el.querySelectorAll(".pe"), mouth: el.querySelector(".pm"),
      x: x, y: ground + R - r - (fromEdge ? 140 : 0), vx: fromEdge ? -5 : 0, vy: 0, sx: 1, sy: 1, svx: 0, svy: 0, tilt: 0, lx: 0, ly: 0, joy: .2,
      next: performance.now() + 1500 + Math.random() * 2500, blink: -1e4, nextBlink: 0, sayUntil: 0, speech: null, mode: "wander", tx: null, other: null, drag: null, size: S, lastBump: 0, tag: tag, home: x };
    updateTag(b);
    el.addEventListener("pointerdown", function (e) {
      var p = toStage(e); stir(); e.preventDefault(); e.stopPropagation(); el.setPointerCapture(e.pointerId);
      b.drag = { ox: p.x - b.x, oy: p.y - b.y, sx: p.x, sy: p.y, moved: false, vx: 0, vy: 0 };
    });
    el.addEventListener("pointermove", function (e) {
      var d = b.drag; if (!d) return;
      var p = toStage(e);
      if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) > 6) { d.moved = true; bsay(b, line("buddyLift")); }
      if (d.moved) { var nx = clamp(p.x - d.ox, r, W - r), ny = clamp(p.y - d.oy, r, floorY(b)); d.vx = nx - b.x; d.vy = ny - b.y; b.x = nx; b.y = ny; }
    });
    function up() {
      var d = b.drag; if (!d) return; b.drag = null;
      if (d.moved) { b.vx = clamp(d.vx, -40, 40); b.vy = clamp(d.vy, -40, 40); if (Math.hypot(b.vx, b.vy) > 18) bsay(b, line("buddyThrow")); return; }
      if (hs && hs.b === b) { endHideSeek(true); return; }
      b.awakeUntil = performance.now() + 20000;
      if (b.asleep) { b.asleep = false; b.vy = -6; bsay(b, line("buddyWoke")); return; }
      b.vy = -7 * f.energy; b.joy = 1; b.svy -= .2; sfx("pop");
      bsay(b, line(f.shy ? "buddyShyPoke" : "buddyPoke"));
      if (f.shy) { b.mode = "hide"; b.tx = clamp(pos.x + (b.x < pos.x ? 1 : -1) * (R + r), r, W - r); b.next = performance.now() + 2500; }
    }
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    buddies.push(b); return b;
  }
  function bsay(b, text) {
    var t = performance.now(), sy = syllables(text);
    b.bub.textContent = text; b.bub.hidden = false; b.sayUntil = t + 2000; b.bub._since = t; b.speech = { t0: t, syl: sy };
    sy.forEach(function (s, i) { var f = b.f.pitch * (s.v === "ee" ? 1.15 : s.v === "oo" ? .88 : 1); tone(f, f * .94, .08, "sine", .05, i * SYL / 1000); });
  }
  function spawnFriends() {
    var cast = store.cast || {}, xs = [W * .2, W * .82, W * .65];
    if (store.friend >= .5) thirdArrived = true;
    FRIENDS.forEach(function (f, i) { if ((i < 2 || thirdArrived) && cast[f.id] !== false) makeBuddy(f, xs[i], false); });
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
    b.mode = "tag"; b.other = o; o.mode = "flee"; o.other = b; b.next = o.next = t + 6500;
    bsay(b, line("tagStart"));
  }
  function think(b, t) {
    var r = b.f.r;
    b.next = t + (2500 + Math.random() * 3500) / b.f.energy; b.mode = "wander"; b.other = null;
    if (song) { b.mode = "sing"; b.tx = clamp(pos.x + (b.x < pos.x ? -1 : 1) * (R + r + 8), r, W - r); b.next = t + 800; return; }
    if (isNight && t > (b.awakeUntil || 0)) { b.mode = "sleep"; b.tx = b.home; b.next = t + 6000; return; }  // bedtime in Bahrain
    if (player && bfOf(b) >= .5 && Math.random() < .5) { b.mode = "follow"; b.next = t + 5000; return; }  // close friends tag along
    if (mood.annoy > .5 || mood.joy < -.2) { b.mode = "comfort"; b.tx = clamp(pos.x + (b.x < pos.x ? -1 : 1) * (R + r + 4), r, W - r); b.next = t + 2500; return; }
    if (b.f.shy && ptr.has && !ptr.out && Math.hypot(ptr.x - b.x, ptr.y - b.y) < 140) {  // hides behind him, on the side away from the pointer
      b.mode = "hide"; b.tx = clamp(pos.x + (ptr.x < pos.x ? 1 : -1) * (R + r), r, W - r); return;
    }
    if (player && Math.random() < .18) {  // goes over to talk to the visitor's character
      b.mode = "visit"; b.tx = clamp(player.x + (b.x < player.x ? -1 : 1) * (player.f.r + r + 20), r, W - r);
      setTimeout(function () { if (player) bsay(b, line("toPlayer", { n: player.f.name })); }, 900);
      return;
    }
    var k = Math.random();
    if (k < .3) b.tx = clamp(b.x + (Math.random() - .5) * 300, r, W - r);
    else if (k < .5 && !mainAway) chat(b, t);
    else if (k < .62 && buddies.length > 1) startTag(b, t);
    else if (k < .75 && !reduce) b.vy = -6 * b.f.energy;
    else if (k < .88) { b.mode = "ball"; b.next = t + 3500; }
    else b.tx = null;
  }
  function buddyStep(b, t, dt) {
    var r = b.f.r, fy = surfaceY(b);
    b.joy += (.15 - b.joy) * .004 * dt;
    b.asleep = b.mode === "sleep" && Math.abs(b.x - b.home) < 20 && b.y >= fy - 1;
    if (b.asleep && t > (b.zzzAt || 0)) { b.zzzAt = t + 7000; b.bub.textContent = "Zzz…"; b.bub.hidden = false; b.bub._since = t; b.sayUntil = t + 2500; b.speech = null; }
    if (!b.drag || !b.drag.moved) {
      if (b.f.player) playerControl(b, fy, dt, t); else if (!b.drag && t > b.next) think(b, t);
      if (b.f.player) b.tx = null;  // the visitor steers their own character, even during tag
      else if (b.mode === "tag" && b.other) b.tx = b.other.x;
      else if (b.mode === "flee" && b.other) b.tx = clamp(b.x + (b.x < b.other.x ? -1 : 1) * 120, r, W - r);
      else if (b.mode === "follow" && player) b.tx = clamp(player.x + (b.x < player.x ? -1 : 1) * (player.f.r + r + 16), r, W - r);
      else if (b.mode === "ball") b.tx = ball.x;
      if (b.mode === "comfort" && Math.hypot(pos.x - b.x, pos.y - b.y) < R + r + 24) {
        b.mode = "wander"; bsay(b, line("comfort")); mood.annoy *= .4; mood.joy = Math.max(mood.joy, .3); befriend(.01);
        setTimeout(function () { say(line("thanks"), "thanks", 4000); }, 1500);
      }
      if (b.tx != null && b.y >= fy - 1) {  // walks in little hops
        var dx = b.tx - b.x;
        if (Math.abs(dx) > 14) { b.vx = Math.sign(dx) * (2.5 + 2.5 * b.f.energy); b.vy = -3 - 1.5 * b.f.energy; } else if (b.mode !== "tag" && b.mode !== "flee") b.tx = null;
      }
      var me2 = b.f.player;
      b.vy += (me2 ? playerGravity(b) : .75) * dt; if (me2 && !b.pound) b.vy = Math.min(b.vy, 18);  // terminal velocity
      b.x += b.vx * dt; b.y += b.vy * dt; if (!me2) b.vx *= Math.pow(.99, dt);
      if (b.y > fy) {  // the visitor's character lands dead, no bounce; friends stay bouncy
        var hit = b.vy; b.y = fy; b.vy = hit > 2.5 && !me2 ? -hit * .45 : 0; if (!me2) b.vx *= .8;
        if (hit > 2.5) { b.svy -= Math.min(hit, 18) * .012; b.svx += Math.min(hit, 18) * .009; }
        if (me2 && hit > 9) dust(b.x, fy + r);
      }
      if (b.x < r || b.x > W - r) { b.x = clamp(b.x, r, W - r); b.vx = me2 ? 0 : -b.vx * .6; }
      if (b.y < r) { b.y = r; b.vy = -b.vy * .5; }
    }
    var air = Math.min(.18, Math.abs(b.vy) * .01);
    b.svx = b.svx * Math.pow(.7, dt) + (1 - air * .6 + (b.crouch ? .14 : 0) - b.sx) * .18 * dt; b.sx += b.svx * dt;
    b.svy = b.svy * Math.pow(.7, dt) + (1 + air - (b.crouch ? .22 : 0) - b.sy) * .18 * dt; b.sy += b.svy * dt;
    b.tilt += (clamp(b.vx * 1.4, -25, 25) + (song ? Math.sin(t / 650 + r) * 7 : 0) - b.tilt) * .15 * dt;
    var tg = ptr.has && !ptr.out && Math.hypot(ptr.x - b.x, ptr.y - b.y) < 200 ? ptr : (b.other || (mainAway ? (b === player ? b : player || b) : pos));
    var ldx = tg.x - b.x, ldy = tg.y - b.y, ld = Math.hypot(ldx, ldy) || 1, k = Math.min(1, ld / 200);
    b.lx += (ldx / ld * k - b.lx) * .15 * dt; b.ly += (ldy / ld * k - b.ly) * .15 * dt;
    if (t > b.nextBlink) { b.blink = t; b.nextBlink = t + 2000 + Math.random() * 4500; }
  }
  function bumped(A, B, s, t) {
    if (t - lastBump < 500) return;
    lastBump = t; sfx("boing", s);
    [A, B].forEach(function (X, i) {
      if (X.ball) return;
      var Y = i ? A : B;
      if (X.main) { var l = local(Y.o.x, Y.o.y); dent(l.x, l.y, Math.min(s, 20) * .5); say(line("bumpMain"), "bump", 4000); }
      else if (!X.b.f.player && t - X.b.lastBump > 2500) { X.b.lastBump = t; X.b.svy -= .12; bsay(X.b, line("bump")); }
    });
  }
  function tagContact(A, B, t) {
    if (!A.b || !B.b) return;
    var x = A.b.mode === "tag" && A.b.other === B.b ? A.b : B.b.mode === "tag" && B.b.other === A.b ? B.b : null;
    if (!x || t - (x.tagAt || 0) < 900) return;
    var y = x.other; x.mode = "flee"; y.mode = "tag"; x.tagAt = y.tagAt = t; bsay(x, line("tagGot"));
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
  function drawBuddy(b, t) {
    var r = b.f.r, S = b.size, i;
    b.el.style.transform = "translate(" + (b.x - S / 2).toFixed(1) + "px," + (b.y - S / 2).toFixed(1) + "px)";
    b.body.setAttribute("transform", "translate(0 " + r + ") rotate(" + b.tilt.toFixed(2) + ") scale(" + clamp(b.sx, .8, 1.25).toFixed(3) + " " + clamp(b.sy, .75, 1.22).toFixed(3) + ") translate(0 " + -r + ")");
    b.face.setAttribute("transform", "translate(" + (b.lx * r * .15).toFixed(2) + " " + (b.ly * r * .1).toFixed(2) + ")");
    var bl = t - b.blink < 240 ? Math.sin(Math.PI * (t - b.blink) / 240) : 0;
    var erx = r * .13, ery = Math.max(r * .19 * (1 - .34 * bl) * (1 + .12 * b.joy) * (song ? .8 : 1), erx * (bl ? .95 : 1.08));
    if (b.asleep) { erx = r * .09; ery = erx * 1.06; }  // eyes shrink to small dots while asleep
    for (i = 0; i < 2; i++) { b.eyes[i].setAttribute("rx", erx.toFixed(2)); b.eyes[i].setAttribute("ry", ery.toFixed(2)); }
    var mrx = r * .09, mry = r * .12, sp3 = b.speech && b.speech.syl[Math.floor((t - b.speech.t0) / SYL)], sn = song && songNote(t);
    if (sp3) { var o3 = Math.pow(Math.sin(Math.PI * ((t - b.speech.t0) % SYL) / SYL), .6), F = MOUTH[sp3.v]; mry *= .7 + F[0] * o3; mrx *= 1 + F[1] * o3; }
    else if (sn) { var o4 = Math.sqrt(Math.min(1, Math.sin(Math.PI * clamp(sn.p, 0, 1)) * 1.6)); mry *= 1 + 1.2 * o4; }
    b.mouth.setAttribute("rx", mrx.toFixed(2)); b.mouth.setAttribute("ry", Math.max(mry, mrx * 1.02).toFixed(2));
    if (b.tag) b.tag.style.transform = "translate(" + (b.x - b.tag.offsetWidth / 2).toFixed(1) + "px," + (b.y - r - 22).toFixed(1) + "px)";
    var fy = surfaceY(b), sc = clamp(1 - (fy - b.y) / 300, .35, 1);
    b.sh.style.transform = "translate(" + (b.x - r * .8).toFixed(1) + "px," + (fy + r - 6).toFixed(1) + "px) scale(" + sc.toFixed(2) + ")"; b.sh.style.opacity = sc.toFixed(2);
    if (!b.bub.hidden) {
      if (t > b.sayUntil) b.bub.hidden = true;
      else {
        var bw = b.bub.offsetWidth, bh = b.bub.offsetHeight, bx = clamp(b.x - bw / 2, 8, Math.max(8, W - bw - 8)), by = b.y - r - 12 - bh;
        if (by < 8) by = b.y + r + 12;
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
    if (typeof c === "string" && c[0] === "#") return { c1: hexMix(c, 255, .45), c2: c, c3: hexMix(c, 0, .45) };
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
    setTimeout(function () { say(line(returning ? "playerBack" : "playerJoin", { n: cfg.name }), "pjoin", 1000); }, 900);
    setTimeout(function () { var o = pick(buddies.filter(function (x) { return x !== player; })); if (o && player) bsay(o, line("buddyHiPlayer", { n: cfg.name })); }, 2700);
  }
  function leaveGame() {
    if (!player) return;
    var n = player.f.name;
    [player.el, player.sh, player.bub, player.tag].forEach(function (x) { x.remove(); });
    buddies.splice(buddies.indexOf(player), 1); buddies.forEach(function (b) { if (b.other === player) { b.other = null; b.mode = "wander"; } });
    player = null; store.player = null; saveStore();
    panel.hidden = false; pui.hidden = true;
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
      stage.appendChild(d); d.addEventListener("animationend", function () { this.remove(); });
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
    if (hs && hs.b === b) hs = null;
  }
  function addFriend(id) {
    if (others().some(function (x) { return x.f.id === id; })) return;
    var b = makeBuddy(FRIENDS.filter(function (f) { return f.id === id; })[0], W - 40, true);
    setTimeout(function () { bsay(b, line("arrive2")); }, 700);
  }
  function castItems() {
    return ["main"].concat(FRIENDS.filter(function (f, i) { return i < 2 || thirdArrived; }).map(function (f) { return f.id; }));
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
  // chatting: your line appears over your character, he (and sometimes a friend) answers by topic
  document.getElementById("pp-chat").addEventListener("submit", function (e) {
    e.preventDefault();
    var inp = document.getElementById("pp-msg"), msg = inp.value.trim().slice(0, 60);
    if (!player || !msg) return;
    inp.value = ""; stir(); bsay(player, msg);
    if (/(غني|غنّي|sing)/i.test(msg) && !song) { setTimeout(sing, 900); return; }
    var n = player.f.name;
    var kind = /مرحب|هلا|أهلا|اهلا|\bhi\b|hello|hey/i.test(msg) ? "replyHi" : /جوع|جائع|أكل|اكل|مطعم|كرك|برجر|hungry|food|eat|restaurant|karak|burger/i.test(msg) ? "replyFood" : /أحب|احب|صديق|love|friend/i.test(msg) ? "replyLove" : /[؟?]\s*$/.test(msg) ? "replyQ" : "replyAny";
    setTimeout(function () { say(line(kind, { n: n }), "pchat", 300); }, 1300);
    var o = pick(others());
    if (o && !mainAway && Math.random() < .5) setTimeout(function () { if (player) bsay(o, line("buddyReply", { n: n })); }, 2900);
  });

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
    phase = h >= 5 && h < 11 ? "morning" : h >= 11 && h < 16 ? "noon" : h >= 16 && h < 19 ? "evening" : "night";
    isNight = phase === "night"; sky.dataset.phase = phase;
    clock.textContent = PHASE_NAME[phase] + " · " + num(n.h % 12 || 12) + ":" + num(("0" + n.m).slice(-2)) + (n.h < 12 ? T(" ص", " AM") : T(" م", " PM")) + T(" بتوقيت البحرين", " Bahrain time") + " · ★ " + num(store.stars || 0);
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
    bsay(b, fav ? line("favYes", { f: food }) : Math.random() < .5 ? line("favHint", { f: document.getElementById("food-" + b.f.fav).textContent }) : line("thanksFood", { f: food }));
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
    face.querySelectorAll("ellipse").forEach(function (e) { x.beginPath(); x.ellipse(+e.getAttribute("cx") || 0, +e.getAttribute("cy") || 0, +e.getAttribute("rx"), +e.getAttribute("ry"), 0, 0, Math.PI * 2); x.fill(); });
    x.restore();
  }
  function snap() {
    var s = 2, H = stage.clientHeight, c = document.createElement("canvas"), x = c.getContext("2d"), cs = getComputedStyle(stage);
    var tok = function (n) { return cs.getPropertyValue(n).trim(); };
    c.width = W * s; c.height = H * s; x.scale(s, s);
    x.fillStyle = getComputedStyle(stage).backgroundColor; x.fillRect(0, 0, W, H);
    var tint = { morning: "rgba(255,214,150,.22)", noon: "rgba(140,200,255,.14)", evening: "rgba(255,150,90,.24)", night: "rgba(20,30,70,.45)" }[phase];
    var gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, tint); gr.addColorStop(1, isNight ? "rgba(20,30,70,.15)" : "rgba(0,0,0,0)"); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    if (isNight) { x.fillStyle = "#fff"; sky.querySelectorAll(".star").forEach(function (e) { x.fillRect(e.offsetLeft, e.offsetTop, 2, 2); }); }
    var pst = getComputedStyle(stage);
    x.fillStyle = pst.getPropertyValue("--soil").trim() || tok("--border"); x.fillRect(0, H - 14, W, 14);
    x.fillStyle = pst.getPropertyValue("--grass").trim() || tok("--cmp"); x.fillRect(0, H - 14, W, 4);
    x.fillStyle = tok("--muted"); x.fillRect(bench.x, bench.top, bench.w, 8); x.fillRect(bench.x + 10, bench.top + 8, 5, 20); x.fillRect(bench.x + bench.w - 15, bench.top + 8, 5, 20);
    x.fillStyle = tok("--surface"); x.beginPath(); x.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); x.fill(); x.strokeStyle = tok("--border"); x.stroke();
    buddies.forEach(function (b) { if (!b.f.player) paintOrb(x, b.el, b.x, b.y, b.f.r, [b.f.c1, b.f.c2, b.f.c3], clamp(b.sx, .8, 1.25), clamp(b.sy, .75, 1.22), b.tilt); });
    // resolved stop colours can be oklab()/color(); fall back to the token if this canvas can't parse them
    var mst = orb.querySelectorAll("stop"), okc = function (v, fb) { x.fillStyle = "#010203"; x.fillStyle = v; return x.fillStyle === "#010203" ? fb : v; };
    paintOrb(x, orb, pos.x, pos.y, R, [0, 1, 2].map(function (i) { return okc(getComputedStyle(mst[i]).stopColor, tok(i === 2 ? "--cmp-deep" : "--cmp")); }), clamp(sp.sx.v, .8, 1.25), clamp(sp.sy.v, .75, 1.22), sp.tilt.v);
    if (player) paintOrb(x, player.el, player.x, player.y, player.f.r, [player.f.c1, player.f.c2, player.f.c3], clamp(player.sx, .8, 1.25), clamp(player.sy, .75, 1.22), player.tilt);
    var bc = getComputedStyle(document.querySelector(".play")).getPropertyValue("--bush").trim() || tok("--cmp");
    x.fillStyle = bc; bushes.forEach(function (b) { var fl = ground + R; [[-17, -16, 17], [3, -24, 22], [21, -15, 16]].forEach(function (k) { x.beginPath(); x.arc(b.cx + k[0], fl + k[1] + 4, k[2], 0, Math.PI * 2); x.fill(); }); });
    x.font = "700 12px Cairo, sans-serif"; x.textAlign = "center"; x.fillStyle = tok("--muted");
    buddies.forEach(function (b) { x.fillText(b.tag.textContent, b.x, b.y - b.f.r - 10); });
    var ex = EN ? 16 : W - 16; x.direction = EN ? "ltr" : "rtl"; x.textAlign = EN ? "left" : "right"; x.fillStyle = tok("--fg"); x.font = "800 16px Cairo, sans-serif"; x.fillText(T("هكوله · دلمو", "Hakolah · Dilmo"), ex, 30);
    x.font = "600 11px Cairo, sans-serif"; x.fillStyle = tok("--muted"); x.fillText(clock.textContent, ex, 48);
    return c;
  }
  document.getElementById("photo-btn").addEventListener("click", function () {
    stir(); tone(1200, 900, .08, "square", .03);
    var url = snap().toDataURL("image/png");
    document.getElementById("photo-img").src = url; document.getElementById("photo-save").href = url;
    photoModal.hidden = false; document.getElementById("photo-close").focus();
  });
  document.getElementById("photo-close").addEventListener("click", function () { photoModal.hidden = true; });
  photoModal.addEventListener("click", function (e) { if (e.target === photoModal) photoModal.hidden = true; });
  addEventListener("keydown", function (e) { if (e.key === "Escape") photoModal.hidden = true; });

  function update(t, dt) {
    if (mainAway) {  // only friends (and the visitor) are around
      buddies.forEach(function (b) { buddyStep(b, t, dt); }); collideAll(t); ballStep(dt); gemStep(t); hsStep(t); return;
    }
    var idle = t - lastInput;
    if (drag && !cheek && !drag.moved && !drag.shy && t - drag.t > 650) { drag.shy = true; mood.shy = 1; say(line("shy"), "shy", 3000); }
    if (idle > (isNight ? 7000 : 15000) && !drag) mood.sleepy = Math.min(1, mood.sleepy + .0025 * dt);
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
    mood.dizzy *= Math.pow(.985, dt); mood.annoy *= Math.pow(.992, dt); mood.startle *= Math.pow(.93, dt);
    mood.tickle *= Math.pow(.95, dt); mood.curious *= Math.pow(.98, dt); mood.calm *= Math.pow(.99, dt);
    if (!drag || !drag.shy) mood.shy *= Math.pow(.9, dt);

    if (stick && t > stick.until) stick = null;
    if (!drag || !drag.moved) {
      pos.vy += (stick ? .02 : .75) * dt; pos.x += pos.vx * dt; pos.y += pos.vy * dt; pos.vx *= Math.pow(.99, dt);
      if (pos.y > ground) {
        var hit = pos.vy; pos.y = ground; pos.vy = hit > 2.5 ? -hit * .45 : 0; pos.vx *= .82;
        if (hit > 2.5) { sp.sy.vel -= Math.min(hit, 18) * .012; sp.sx.vel += Math.min(hit, 18) * .009; dent(0, R, Math.min(hit, 20) * .5); if (hit > 5) sfx("boing", hit); }
        if (hit > 22) { mood.annoy = Math.min(1, mood.annoy + .25); say(line("ouch"), "ouch", 2500); }
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
      ") scale(" + clamp(sp.sx.v, .8, 1.25).toFixed(3) + " " + clamp(sp.sy.v, .75, 1.22).toFixed(3) + ") translate(0 " + -R + ")");
    face.setAttribute("transform", "translate(" + (sp.lx.v * 7 + ox + cpx).toFixed(2) + " " + (sp.ly.v * 5 + oy + cpy).toFixed(2) + ")");
    for (var i = 0; i < 2; i++) {
      var w = t - wink[i] < 380 ? Math.sin(Math.PI * (t - wink[i]) / 380) : 0;
      var near = cheek && (i ? cheek.gx > 0 : cheek.gx < 0) ? 1 - .25 * mood.pinch : 1;
      eyes[i].setAttribute("cy", ey.toFixed(2)); eyes[i].setAttribute("rx", (rx * (1 + .05 * w)).toFixed(2));
      eyes[i].setAttribute("ry", (ry * (1 - .5 * w) * near).toFixed(2));
    }
    mouth.setAttribute("cx", sp.mx.v.toFixed(2)); mouth.setAttribute("cy", (18 + sp.ey.v * .5).toFixed(2));
    mouth.setAttribute("rx", mrx.toFixed(2)); mouth.setAttribute("ry", mry.toFixed(2));
    var sc = clamp(1 - (ground - pos.y) / 300, .35, 1);
    shadowEl.style.transform = "translate(" + (pos.x - 40).toFixed(1) + "px," + (ground + R - 6) + "px) scale(" + sc.toFixed(2) + ")";
    shadowEl.style.opacity = sc.toFixed(2);
    if (!bub.hidden) {
      if (mood.sleepy <= .85 && t > +bub.dataset.until) bub.hidden = true;
      else {
        // keep the whole bubble inside the stage: clamp sideways, flip below him when there is no room above
        var bw = bub.offsetWidth, bh = bub.offsetHeight, bx = clamp(pos.x - bw / 2, 8, Math.max(8, W - bw - 8)), by = pos.y - R - 14 - bh;
        if (by < 8) by = Math.min(pos.y + R + 14, ground + R - bh - 4);
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
  addEventListener("resize", function () { measure(); placeProps(); });
  measure(); placeProps(); renderSwatches(); spawnFriends(); tickClock(); setInterval(tickClock, 20000); draw(performance.now());
})();
