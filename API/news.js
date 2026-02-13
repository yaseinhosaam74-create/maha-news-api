const axios = require('axios');
const { JSDOM } = require('jsdom');

module.exports = async (req, res) => {
    // إعدادات السماح بالوصول (CORS) ليعمل مع موقعك دون مشاكل
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    try {
        const query = encodeURIComponent("مها فتوني");
        const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=ar&gl=EG&ceid=EG:ar`;
        
        const rssResponse = await axios.get(rssUrl);
        const rssDom = new JSDOM(rssResponse.data, { contentType: "text/xml" });
        const items = Array.from(rssDom.window.document.querySelectorAll("item")).slice(0, 8);

        const newsData = await Promise.all(items.map(async (item) => {
            const link = item.querySelector("link").textContent;
            const titleFull = item.querySelector("title").textContent;
            const title = titleFull.split(' - ')[0];
            const source = titleFull.split(' - ').pop();
            const pubDate = new Date(item.querySelector("pubDate").textContent).toLocaleDateString('ar-EG');

            try {
                // محاولة دخول رابط الخبر الأصلي لاستخراج الصورة والمقال الكامل
                const articleRes = await axios.get(link, { 
                    timeout: 4000,
                    headers: { 'User-Agent': 'Mozilla/5.0' } 
                });
                const articleDom = new JSDOM(articleRes.data);
                const doc = articleDom.window.document;

                // 1. استخراج صورة الغلاف (بأولوية الصور الاجتماعية عالية الجودة)
                const image = doc.querySelector('meta[property="og:image"]')?.content || 
                              doc.querySelector('meta[name="twitter:image"]')?.content || 
                              doc.querySelector('link[rel="image_src"]')?.href ||
                              'logo.png';

                // 2. استخراج المقال كاملاً (تنظيف النصوص)
                const articleBody = Array.from(doc.querySelectorAll('p'))
                    .map(p => p.textContent.trim())
                    .filter(text => text.length > 60) // استبعاد الروابط والقوائم الجانبية
                    .slice(0, 10) // جلب قدر كافٍ من المقال
                    .join('<br><br>');

                return { title, source, link, pubDate, image, content: articleBody };
            } catch (e) {
                // في حال فشل دخول الموقع المعين، نستخدم بيانات جوجل الافتراضية
                return { 
                    title, source, link, pubDate, 
                    image: 'logo.png', 
                    content: "يرجى الضغط على زر المصدر لقراءة التفاصيل الكاملة من الموقع الأصلي." 
                };
            }
        }));

        res.status(200).json(newsData);
    } catch (error) {
        res.status(500).json({ error: "تعذر جلب الأخبار من السيرفر" });
    }
};
