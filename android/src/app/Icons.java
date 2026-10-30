package bh.mohframevision.hakolah;

import java.util.HashMap;
import java.util.Map;
import org.json.JSONObject;

// أيقونات خطية موحّدة (Material Symbols Outlined) بدل الإيموجي بالتطبيق كله:
// الإيموجي ثلاثي الأبعاد ومختلف الأساليب، والأيقونات بلغة وحدة ولون واحد.
// بيانات الموقع تبقى بإيموجيها؛ الاختيار هنا بالترتيب: نوع المكان (illus) ←
// مجموعة الأداة (group) ← الإيموجي القديم نفسه ← أيقونة القسم.
// عنصر جديد بنوع غير معروف يأخذ أيقونة قسمه تلقائياً، بلا تعديل كود.
final class Icons {
    private Icons() {}

    private static final Map<String, Integer> SECTION = new HashMap<>();
    private static final Map<String, Integer> ILLUS = new HashMap<>();
    private static final Map<String, Integer> GROUP = new HashMap<>();
    private static final Map<String, Integer> EMOJI = new HashMap<>();

    static {
        SECTION.put("restaurants", R.drawable.ic_s_restaurant);
        SECTION.put("cafes", R.drawable.ic_s_local_cafe);
        SECTION.put("bakeries", R.drawable.ic_s_bakery_dining);
        SECTION.put("stores", R.drawable.ic_s_shopping_bag);
        SECTION.put("car-shops", R.drawable.ic_s_directions_car);
        SECTION.put("places", R.drawable.ic_s_landscape);
        SECTION.put("links-tools", R.drawable.ic_s_link);
        SECTION.put("guides", R.drawable.ic_s_article);
        SECTION.put("ai-experiments", R.drawable.ic_s_science);

        ILLUS.put("shawarma", R.drawable.ic_s_kebab_dining);
        ILLUS.put("burger", R.drawable.ic_s_lunch_dining);
        ILLUS.put("fastfood", R.drawable.ic_s_fastfood);
        ILLUS.put("foodtruck", R.drawable.ic_s_fastfood);
        ILLUS.put("machboos", R.drawable.ic_s_rice_bowl);
        ILLUS.put("kabsa", R.drawable.ic_s_rice_bowl);
        ILLUS.put("iraqi", R.drawable.ic_s_outdoor_grill);
        ILLUS.put("iranian", R.drawable.ic_s_outdoor_grill);
        ILLUS.put("lebanese", R.drawable.ic_s_outdoor_grill);
        ILLUS.put("turkish", R.drawable.ic_s_outdoor_grill);
        ILLUS.put("grill", R.drawable.ic_s_outdoor_grill);
        ILLUS.put("seafood", R.drawable.ic_s_set_meal);
        ILLUS.put("asian", R.drawable.ic_s_ramen_dining);
        ILLUS.put("pastries", R.drawable.ic_s_bakery_dining);
        ILLUS.put("bakery", R.drawable.ic_s_bakery_dining);
        ILLUS.put("kunafa", R.drawable.ic_s_cake);
        ILLUS.put("specialty", R.drawable.ic_s_coffee_maker);
        ILLUS.put("cafe", R.drawable.ic_s_local_cafe);
        ILLUS.put("karak", R.drawable.ic_s_emoji_food_beverage);
        ILLUS.put("plants", R.drawable.ic_s_potted_plant);
        ILLUS.put("wholesale", R.drawable.ic_s_inventory_2);
        ILLUS.put("electronics", R.drawable.ic_s_devices);
        ILLUS.put("jewelry", R.drawable.ic_s_diamond);
        ILLUS.put("household", R.drawable.ic_s_chair);
        ILLUS.put("optics", R.drawable.ic_s_eyeglasses);
        ILLUS.put("supplements", R.drawable.ic_s_medication);
        ILLUS.put("kids", R.drawable.ic_s_toys);
        ILLUS.put("shipping", R.drawable.ic_s_local_shipping);
        ILLUS.put("books", R.drawable.ic_menu_book);
        ILLUS.put("carwash", R.drawable.ic_s_local_car_wash);
        ILLUS.put("carglass", R.drawable.ic_s_directions_car);
        ILLUS.put("upholstery", R.drawable.ic_s_airline_seat_recline_normal);
        ILLUS.put("caracc", R.drawable.ic_s_car_repair);

        GROUP.put("الملفات والكمبيوتر", R.drawable.ic_s_folder);
        GROUP.put("الذكاء الاصطناعي والترجمة", R.drawable.ic_s_translate);
        GROUP.put("التصميم والرسم", R.drawable.ic_s_palette);
        GROUP.put("التعلّم والحياة اليومية", R.drawable.ic_s_school);
        GROUP.put("الصوت والموسيقى", R.drawable.ic_music_note);
        GROUP.put("المونتاج والفيديو", R.drawable.ic_s_movie);
        GROUP.put("الأمان والخصوصية", R.drawable.ic_s_shield);
        GROUP.put("البرمجة والألعاب وثلاثي الأبعاد", R.drawable.ic_s_code);
        GROUP.put("مجتمعات وقنوات للتعلّم", R.drawable.ic_s_groups);
        GROUP.put("الصور ولقطات الشاشة", R.drawable.ic_s_image);
        GROUP.put("المستندات وملفات PDF", R.drawable.ic_s_description);
        GROUP.put("الملاحظات والتنظيم", R.drawable.ic_s_sticky_note_2);
        GROUP.put("مكتبات مجانية", R.drawable.ic_s_local_library);

        // الإيموجي الحالي بالمقالات والأماكن والتجارب → أيقونة بنفس المعنى
        emoji("🗂️", R.drawable.ic_s_folder);
        emoji("🎵", R.drawable.ic_music_note);
        emoji("🧠", R.drawable.ic_s_psychology);
        emoji("🧭", R.drawable.ic_s_explore);
        emoji("🎥", R.drawable.ic_s_videocam);
        emoji("💡", R.drawable.ic_s_lightbulb);
        emoji("💻", R.drawable.ic_s_computer);
        emoji("🎬", R.drawable.ic_s_movie);
        emoji("🧪", R.drawable.ic_s_science);
        emoji("🛡️", R.drawable.ic_s_shield);
        emoji("🔊", R.drawable.ic_volume_up);
        emoji("🎨", R.drawable.ic_s_palette);
        emoji("🎙️", R.drawable.ic_s_mic);
        emoji("🏛️", R.drawable.ic_s_account_balance);
        emoji("🌅", R.drawable.ic_s_wb_twilight);
        emoji("🛍️", R.drawable.ic_s_shopping_bag);
        emoji("🌳", R.drawable.ic_s_park);
        emoji("⌨️", R.drawable.ic_s_keyboard);
        emoji("🧮", R.drawable.ic_s_calculate);
        emoji("🔄", R.drawable.ic_s_sync);
    }

    // الإيموجي يجي أحياناً بمحدد الشكل (U+FE0F) وأحياناً بدونه — نوحّده
    private static void emoji(String e, int res) {
        EMOJI.put(e.replace("️", ""), res);
    }

    static int section(String slug) {
        Integer r = slug == null ? null : SECTION.get(slug);
        return r != null ? r : R.drawable.ic_location_on;
    }

    static int item(JSONObject item, String slug) {
        Integer r = ILLUS.get(item.optString("illus", ""));
        if (r == null) r = GROUP.get(item.optString("group", ""));
        if (r == null) r = EMOJI.get(item.optString("icon", "").replace("️", ""));
        return r != null ? r : section(slug);
    }
}
