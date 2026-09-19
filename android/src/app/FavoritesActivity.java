package bh.mohframevision.hakolah;

import android.app.Activity;
import android.content.Context;
import android.os.Bundle;
import android.view.View;
import android.widget.ListView;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

// نفس renderFavoritesPage بالموقع بالضبط: يجمع العناصر المفضَّلة من كل
// الأقسام بقائمة واحدة. يقرأ MainActivity.cachedSections مباشرة (نفس فكرة
// PickerActivity) بدل إعادة جلب البيانات، ويحقن "_section" بكل عنصر عشان
// ItemAdapter يعرف قسمه الحقيقي رغم اختلاط الأقسام بقائمة واحدة.
public class FavoritesActivity extends Activity implements View.OnClickListener {
    @Override
    protected void attachBaseContext(Context newBase) {
        super.attachBaseContext(Prefs.wrapThemeContext(newBase));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_favorites);
        findViewById(R.id.favoritesCloseButton).setOnClickListener(this);
        BottomNav.attach(this, findViewById(R.id.bottomNav), BottomNav.FAVORITES);
    }

    @Override
    protected void onResume() {
        super.onResume();
        // يُعاد البناء كل رجوع للشاشة — لو المستخدم أزال مفضلة من قسم آخر
        // ثم رجع هنا، لازم تختفي من القائمة فوراً
        render();
    }

    @Override
    public void onBackPressed() {
        super.onBackPressed();
        overridePendingTransition(0, 0);
    }

    @Override
    public void onClick(View v) {
        if (v.getId() == R.id.favoritesCloseButton) {
            finish();
            overridePendingTransition(0, 0);
        }
    }

    private void render() {
        ListView list = findViewById(R.id.favoritesList);
        View empty = findViewById(R.id.favoritesEmpty);

        JSONObject sections = MainActivity.cachedSections;
        JSONArray order = MainActivity.cachedSectionOrder;
        JSONArray merged = new JSONArray();

        if (sections != null && order != null) {
            for (int i = 0; i < order.length(); i++) {
                String slug = order.optString(i);
                JSONObject section = sections.optJSONObject(slug);
                if (section == null) continue;
                JSONArray items = section.optJSONArray("items");
                if (items == null) continue;
                Set<String> favs = Prefs.favorites(this);
                for (int j = 0; j < items.length(); j++) {
                    JSONObject item = items.optJSONObject(j);
                    if (item == null) continue;
                    String id = item.optString("id", "");
                    if (!favs.contains(slug + "|" + id)) continue;
                    try {
                        JSONObject clone = new JSONObject(item.toString());
                        clone.put("_section", slug);
                        merged.put(clone);
                    } catch (Exception ignored) {
                    }
                }
            }
        }

        if (merged.length() == 0) {
            list.setVisibility(View.GONE);
            empty.setVisibility(View.VISIBLE);
        } else {
            empty.setVisibility(View.GONE);
            list.setAdapter(new ItemAdapter(this, "", merged));
            list.setVisibility(View.VISIBLE);
        }
    }
}
