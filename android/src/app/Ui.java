package bh.mohframevision.hakolah;

import android.view.View;
import android.widget.HorizontalScrollView;

// أدوات واجهة صغيرة مشتركة بين الشاشات
final class Ui {
    private Ui() {}

    // HorizontalScrollView داخل واجهة RTL يفتح على الطرف الغلط (نهاية القائمة
    // لا بدايتها) — أول عنصر (الأيمن) ما يبان. بعد أول تخطيط نمرّره لأقصى
    // اليمين، وهو "بداية" القائمة بالعربي
    static void scrollToStart(HorizontalScrollView scroll) {
        scroll.post(new ScrollRight(scroll));
    }

    private static final class ScrollRight implements Runnable {
        private final HorizontalScrollView scroll;

        ScrollRight(HorizontalScrollView scroll) {
            this.scroll = scroll;
        }

        @Override
        public void run() {
            if (scroll.getLayoutDirection() == View.LAYOUT_DIRECTION_RTL) scroll.fullScroll(View.FOCUS_RIGHT);
        }
    }
}
