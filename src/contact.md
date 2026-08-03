---
layout: base.njk
permalink: "contact.html"
title: "تواصل معنا | هكوله"
description: "تواصل معنا لطلب إضافة مطعم أو متجر أو أداة، أو لأي استفسار عن موقع هكوله."
navActive: "contact"
langSwitchUrl: "/en/contact.html"
---
<article class="prose">

# تواصل معنا

عندك مطعم أو متجر أو أداة تبي تضيفها للموقع؟ أو عندك استفسار؟ عبّي النموذج تحت أو راسلنا مباشرة.

</article>

<div id="formMessage" class="form-message hidden"></div>

<form id="contactForm" class="contact-form" action="https://api.web3forms.com/submit" method="POST">
  <input type="hidden" name="access_key" value="a2dc8bb2-0fb8-47a9-8b58-ad3245d3f5a3">
  <input type="hidden" name="subject" value="رسالة جديدة من موقع هكوله">
  <input type="hidden" name="from_name" value="نموذج تواصل هكوله">
  <input type="checkbox" name="botcheck" class="hidden">

  <div class="form-group">
    <label for="name">الاسم *</label>
    <input type="text" id="name" name="name" required placeholder="اسمك" minlength="2" maxlength="100" />
  </div>

  <div class="form-group">
    <label for="email">البريد الإلكتروني *</label>
    <input type="email" id="email" name="email" required placeholder="example@email.com" />
  </div>

  <div class="form-group">
    <label for="request_type">نوع الطلب</label>
    <select id="request_type" name="request_type">{%- for entry in sections %}
<option value="إضافة إلى {{ entry.title }}">إضافة إلى {{ entry.title }}</option>{%- endfor %}
<option value="إبلاغ عن معلومة خاطئة">🚩 إبلاغ عن معلومة خاطئة</option>
<option value="استفسار عام">استفسار عام</option></select>
  </div>

  <div class="form-group">
    <label for="message">الرسالة *</label>
    <textarea id="message" name="message" required placeholder="اكتب رسالتك هنا… (اسم المكان، رابط الموقع/الخرائط/إنستقرام إن وجد)" minlength="5" maxlength="5000"></textarea>
  </div>

  <button type="submit" id="submitBtn" class="btn">
    <span id="btnText">إرسال</span>
    <span id="btnLoading" class="hidden">جاري الإرسال…</span>
  </button>
</form>

<p class="contact-direct">أو راسلنا مباشرة: <a href="mailto:mohframevision@outlook.com">mohframevision@outlook.com</a></p>
