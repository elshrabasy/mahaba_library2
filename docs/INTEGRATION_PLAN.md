# Mahabat Engine Integration Plan

هذا المستودع مستقل عن `elshrabasy/library_mahaba` ولا يغيّر أي ملف فيه.

## الهدف

إعادة استخدام تجربة Mahaba Library الحالية كما هي قدر الإمكان:
- Gallery UI
- 3D Studio
- Artwork placement
- Foil / Spot UV
- Nesting engine
- Export/project workflow

مع استبدال **مصدر الهندسة فقط** للقوالب المحوّلة إلى Mahabat Engine.

## Data flow

```text
Gallery template selection
        ↓
Mahabat Engine adapter
        ↓
Parametric geometry + material + fold data
        ↓
Native Model Schema
        ↓
Existing Mahaba Studio
   ├─ 3D
   ├─ Artwork
   ├─ Foil / UV
   └─ Nesting
```

## المرحلة الأولى

1. نسخ baseline من Mahaba Library إلى هذا المستودع.
2. الاحتفاظ بواجهة Studio وNesting بدون إعادة كتابة.
3. إضافة `engine/mahabat-adapter.js` كطبقة مستقلة.
4. تشغيل قالب واحد Converted end-to-end.
5. بعد نجاحه، ربط قائمة converted templates تدريجيًا.

## قاعدة مهمة

لا يوجد fallback صامت إلى هندسة مختلفة. إذا لم يكن القالب محوّلًا أو فشل Mahabat Engine، تظهر رسالة واضحة للمستخدم.
