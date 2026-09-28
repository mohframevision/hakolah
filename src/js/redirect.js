// تحويل رابط قديم مع الإبقاء على الاستعلام (?seed=…) — meta refresh وحده يضيّعه
location.replace(document.currentScript.dataset.to + location.search + location.hash);
