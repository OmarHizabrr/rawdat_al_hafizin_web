# rawdat_al_hafizin_web

منصة **روضة الحافظين** — برنامج تحفيظ السنة النبوية (واجهة ويب متجاوبة مع الهاتف والمتصفح).

## التطوير

```bash
npm install
npm run dev
```

## البناء

```bash
npm run build
```

## النشر

- [Vercel](https://vercel.com/): اربط المستودع واختر إطار Vite، أو استورد المشروع من GitHub.
- إعدادات Firebase في `src/firebase.js`.

### قواعد Firestore لواجبات الطلاب

بعد إضافة ميزة **أقسام الواجبات**، أضف المقطع من الملف `firestore.homework.snippet` إلى قواعد Firestore في [Firebase Console](https://console.firebase.google.com/) (Firestore → Rules)، ثم انشر القواعد. لا تنشر المقطع وحده دون بقية قواعد المشروع.
