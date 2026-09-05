# Fahimta AI — OpenAI backend

Wannan ƙaramin server ne wanda zai haɗa Fahimta AI da OpenAI. Ba a canza design, screens, payment, ko sauran fasalolin app ba.

## Abin da aka shirya

- `POST /api/chat` yana karɓar `{ "message": "..." }` daga app.
- Server yana aika saƙon zuwa OpenAI Responses API sannan ya dawo da `{ "reply": "..." }`.
- API key yana cikin environment na server kawai, ba cikin APK ba.
- `GET /health` hanya ce ta duba ko server yana aiki.

## Matakai kafin app ya zama live

1. A ɗora wannan folder zuwa server/hosting da ke iya gudanar da Node.js.
2. A sa `OPENAI_API_KEY` a **Environment Variables/Secrets** na hosting. Kada a tura key ɗin cikin Git, ZIP na app, ko `MainActivity.kt`.
3. A sa `OPENAI_MODEL` idan ana so (default: `gpt-4.1-mini`).
4. A yi deploy; za a samu HTTPS URL misali `https://your-domain.example`.
5. A canza wannan layi guda a `MainActivity.kt`:

   ```kotlin
   private const val BACKEND_URL = "https://your-domain.example/api/chat"
   ```

6. A tabbatar `AndroidManifest.xml` yana da:

   ```xml
   <uses-permission android:name="android.permission.INTERNET" />
   ```

## Muhimmin tsaro

Saboda APK na iya shiga hannun kowa, API key ba shi da aminci idan an saka shi a cikinsa. Wannan backend ne kawai ya kamata ya mallaki key. Kafin a fitar da app ga jama'a, a ƙara user authentication da rate limiting a server domin kada wani ya yi amfani da credit ɗinka ba tare da izini ba.
