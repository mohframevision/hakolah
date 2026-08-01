---
title: إحصائيات الزيارات | هكوله
layout: base.njk
permalink: stats.html
description: زيارات موقع هكوله اللحظية والشهرية.
noindex: true
---

<section class="page-header">
  <h1>📊 إحصائيات الزيارات</h1>
  <p>زيارات لحظية وشهرية عبر Google Analytics.</p>
</section>

{% if analytics.statsEmbedUrl %}
<div class="stats-embed">
  <iframe src="{{ analytics.statsEmbedUrl }}" title="إحصائيات زيارات هكوله" allowfullscreen></iframe>
</div>
{% else %}
<div class="empty-state">
  <span class="icon">📊</span>
  <p>لوحة الإحصائيات ما اتربطت بعد — أضف رابط تضمين تقرير Looker Studio بملف <code>src/_data/analytics.js</code>.</p>
</div>
{% endif %}
