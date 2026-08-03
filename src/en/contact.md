---
layout: base.njk
lang: "en"
permalink: "en/contact.html"
title: "Contact Us | Hakolah"
description: "Contact us to request adding a restaurant, store, or tool, or for any question about Hakolah."
navActive: "contact"
langSwitchUrl: "/contact.html"
---
<article class="prose">

# Contact Us

Have a restaurant, store, or tool you'd like added to the site? Or have a question? Fill out the form below or email us directly.

</article>

<div id="formMessage" class="form-message hidden"></div>

<form id="contactForm" class="contact-form" action="https://api.web3forms.com/submit" method="POST">
  <input type="hidden" name="access_key" value="a2dc8bb2-0fb8-47a9-8b58-ad3245d3f5a3">
  <input type="hidden" name="subject" value="New message from Hakolah">
  <input type="hidden" name="from_name" value="Hakolah contact form">
  <input type="checkbox" name="botcheck" class="hidden">

  <div class="form-group">
    <label for="name">Name *</label>
    <input type="text" id="name" name="name" required placeholder="Your name" minlength="2" maxlength="100" />
  </div>

  <div class="form-group">
    <label for="email">Email *</label>
    <input type="email" id="email" name="email" required placeholder="example@email.com" />
  </div>

  <div class="form-group">
    <label for="request_type">Request type</label>
    <select id="request_type" name="request_type">
<option value="Add to Links & Tools">Add to Links & Tools</option>
<option value="Add to Guides">Add to Guides</option>
<option value="Add to Restaurants">Add to Restaurants</option>
<option value="Add to Stores">Add to Stores</option>
<option value="Add to Cafes">Add to Cafes</option>
<option value="Add to Places">Add to Places</option>
<option value="Add to Bakeries">Add to Bakeries</option>
<option value="Report incorrect info">🚩 Report incorrect info</option>
<option value="General inquiry">General inquiry</option></select>
  </div>

  <div class="form-group">
    <label for="message">Message *</label>
    <textarea id="message" name="message" required placeholder="Write your message here… (place name, website/maps/Instagram link if available)" minlength="5" maxlength="5000"></textarea>
  </div>

  <button type="submit" id="submitBtn" class="btn">
    <span id="btnText">Send</span>
    <span id="btnLoading" class="hidden">Sending…</span>
  </button>
</form>

<p class="contact-direct">Or email us directly: <a href="mailto:mohframevision@outlook.com">mohframevision@outlook.com</a></p>
